async function render(context) {
    const container = context.element.createEl('div');
    container.style.cssText = 'position: relative; overflow: hidden; width: 100%; height: 400px; background: linear-gradient(135deg, #0c0c0c, #1a1a2e, #16213e); border-radius: 8px; display: flex; justify-content: center; align-items: center;';

    const canvas = container.createEl('canvas');
    canvas.width = container.clientWidth || 800;
    canvas.height = 300;
    canvas.style.cssText = 'width: 100%; height: 100%; max-width: 100%; cursor: pointer;';

    const ctx = canvas.getContext('2d');

    // Particle class
    class Particle {
        constructor(x, y, vx, vy, size, colorHue, saturation, lightness) {
            this.x = x || Math.random() * canvas.width;
            this.y = y || Math.random() * canvas.height;
            this.size = size || Math.random() * 20 + 8; // Random size: 8-28 (increased)
            // Velocity: twice as fast (8x instead of 4x), and smaller particles are faster
            const sizeFactor = 1.5 - (this.size / 25); // Larger particles move slower (0.3x for size 28, 1.2x for size 8)
            const baseSpeed = (Math.random() - 0.5) * 8; // Twice as fast base speed
            this.vx = vx || baseSpeed * sizeFactor;
            this.vy = vy || baseSpeed * sizeFactor;
            this.colorHue = colorHue || Math.random() * 360;
            this.saturation = saturation !== undefined ? saturation : Math.random() * 50 + 50; // Random saturation: 50-100%
            this.lightness = lightness !== undefined ? lightness : Math.random() * 40 + 30; // Random lightness: 30-70%
            this.color = `hsl(${this.colorHue}, ${this.saturation}%, ${this.lightness}%)`;
        }

        update(mouse, isMouseHovering, particles) {
            // Mouse attraction only when hovering
            if (isMouseHovering) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distToMouse = Math.sqrt(dx * dx + dy * dy);

                if (distToMouse < 150 && distToMouse > 0) {
                    const force = 0.02;
                    this.vx += (dx / distToMouse) * force;
                    this.vy += (dy / distToMouse) * force;
                }
            }

            // Check for particle collisions - merge when they touch
            for (let i = particles.length - 1; i >= 0; i--) {
                const other = particles[i];
                if (other !== this) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < this.size + other.size) {
                        // Determine which particle is "bigger" (larger size)
                        const thisIsBigger = this.size >= other.size;
                        const bigger = thisIsBigger ? this : other;
                        const smaller = thisIsBigger ? other : this;

                        // Size = size of the bigger particle
                        const combinedSize = bigger.size;

                        // Velocity = weighted average based on particle sizes (bigger particles influence more)
                        const combinedVx = (this.vx * this.size + other.vx * other.size) / (this.size + other.size);
                        const combinedVy = (this.vy * this.size + other.vy * other.size) / (this.size + other.size);

                        // Hue uses weighted average with saturation as weight, considering shortest path in color wheel
                        const thisWeight = this.saturation;
                        const otherWeight = other.saturation;

                        // Calculate hue difference considering color wheel wrap-around
                        let hueDiff = other.colorHue - this.colorHue;
                        hueDiff = ((hueDiff + 180) % 360) - 180; // Normalize to [-180, 180] range
                        const targetHue = this.colorHue + (hueDiff * (otherWeight / (thisWeight + otherWeight)));

                        const combinedHue = ((targetHue % 360) + 360) % 360; // Ensure result is [0, 360)

                        // Saturation = average of both saturation values
                        const combinedSaturation = (this.saturation + other.saturation) / 2;

                        // Lightness = average of both lightness values
                        const combinedLightness = (this.lightness + other.lightness) / 2;

                        // Create new merged particle at collision center
                        const centerX = (this.x + other.x) / 2;
                        const centerY = (this.y + other.y) / 2;

                        particles.splice(i, 1); // Remove other particle
                        // Replace this particle with merged one
                        Object.assign(this, new Particle(centerX, centerY, combinedVx, combinedVy, combinedSize, combinedHue, combinedSaturation, combinedLightness));
                        break; // Only merge with one particle per frame
                    }
                }
            }

            // Apply velocity
            this.x += this.vx;
            this.y += this.vy;

            // Minimal friction
            this.vx *= 0.999;
            this.vy *= 0.999;

            // Bounce off walls
            if (this.x - this.size < 0 || this.x + this.size > canvas.width) {
                this.vx = -this.vx;
                this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
            }
            if (this.y - this.size < 0 || this.y + this.size > canvas.height) {
                this.vy = -this.vy;
                this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));
            }
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Mouse tracking
    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    let isMouseHovering = false;

    canvas.addEventListener('mouseenter', () => {
        isMouseHovering = true;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        isMouseHovering = false;
    });

    // Create particles
    const particles = [];
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
        ctx.fillStyle = 'rgba(10, 10, 26, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update(mouse, isMouseHovering, particles);
            particle.draw(ctx);
        });

        // Maintain particle count
        while (particles.length < 10) {
            particles.push(new Particle());
        }

        requestAnimationFrame(animate);
    };

    animate();

    // Instructions
    const instructions = container.createEl('div');
    instructions.textContent = 'Hover mouse to attract particles - they merge on collision!';
    instructions.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 10px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        pointer-events: none;
    `;

    return container;
}
