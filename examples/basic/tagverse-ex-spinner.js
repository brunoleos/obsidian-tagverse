// Example: Rainbow Spinner
// Displays a colorful animated spinning ring

async function render(context) {
    const container = context.element.createEl('div');
    container.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        height: 60px;
    `;

    const spinner = container.createEl('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 4px solid transparent;
        border-top: 4px solid #ff6b35;
        border-right: 4px solid #f7931e;
        border-radius: 50%;
        animation: spin-rainbow 1.5s linear infinite;
    `;

    // Add CSS animation keyframes
    const style = container.createEl('style');
    style.textContent = `
        @keyframes spin-rainbow {
            0% { transform: rotate(0deg); border-top-color: #ff6b35; }
            25% { border-top-color: #f7931e; }
            50% { border-top-color: #39a0ca; }
            75% { border-top-color: #99d5ff; }
            100% { transform: rotate(360deg); border-top-color: #ff6b35; }
        }
    `;

    return container;
}
