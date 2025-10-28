// Example: Spinning 3D Cube
// Displays a colorful 3D cube that spins in three dimensions

async function render(context) {
    const container = context.element.createEl('div');
    container.style.cssText = `
        perspective: 1000px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 120px;
    `;

    const scene = container.createEl('div');
    scene.style.cssText = `
        position: relative;
        transform-style: preserve-3d;
        animation: spin3d 4s infinite linear;
    `;

    // Cube faces
    const faces = [
        { name: 'front', color: '#ff6b35' },
        { name: 'back', color: '#f7931e' },
        { name: 'right', color: '#39a0ca' },
        { name: 'left', color: '#99d5ff' },
        { name: 'top', color: '#e6f7ff' },
        { name: 'bottom', color: '#cceeff' }
    ];

    faces.forEach((face, index) => {
        const faceEl = scene.createEl('div');
        faceEl.textContent = face.name.toUpperCase();
        faceEl.style.cssText = `
            position: absolute;
            width: 60px;
            height: 60px;
            border: 2px solid #333;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 10px;
            font-weight: bold;
            background: ${face.color};
            opacity: 0.9;
        `;

        // Position each face
        switch(face.name) {
            case 'front': faceEl.style.transform = 'translateZ(30px)'; break;
            case 'back': faceEl.style.transform = 'translateZ(-30px) rotateY(180deg)'; break;
            case 'right': faceEl.style.transform = 'rotateY(90deg) translateZ(30px)'; break;
            case 'left': faceEl.style.transform = 'rotateY(-90deg) translateZ(30px)'; break;
            case 'top': faceEl.style.transform = 'rotateX(90deg) translateZ(30px)'; break;
            case 'bottom': faceEl.style.transform = 'rotateX(-90deg) translateZ(30px)'; break;
        }
    });

    // Add CSS animation keyframes
    const style = container.createEl('style');
    style.textContent = `
        @keyframes spin3d {
            from { transform: rotateX(0) rotateY(0); }
            to { transform: rotateX(360deg) rotateY(360deg); }
        }
    `;

    return container;
}
