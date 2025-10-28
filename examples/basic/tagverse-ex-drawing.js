// Example: Mouse Drawing Canvas
// Allows drawing with mouse on a canvas element

async function render(context) {
    const container = context.element.createEl('div');
    container.style.cssText = 'text-align: center;';

    const canvas = container.createEl('canvas');
    canvas.width = 300;
    canvas.height = 200;
    canvas.style.cssText = 'border: 2px solid #ccc; cursor: crosshair; background: white;';

    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    // Drawing function
    const draw = (e) => {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    // Event listeners
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    });

    canvas.addEventListener('mousemove', draw);

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    canvas.addEventListener('mouseout', () => {
        isDrawing = false;
    });

    return container;
}
