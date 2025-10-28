// Example: Basic Interactive Button
// Creates and returns a clickable button element that shows a notice when clicked

async function render(context) {
    // Create a simple button
    const button = context.element.createEl('button', {
        text: `🎉 You clicked #${context.tag}!`,
        cls: 'my-custom-tag'
    });
    
    button.style.cssText = `
        padding: 6px 12px;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
    `;
    
    button.addEventListener('click', () => {
        new context.Notice(`Hello from #${context.tag}! 👋`);
    });
    
    return button;
}
