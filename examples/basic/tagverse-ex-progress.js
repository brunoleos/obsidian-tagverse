// Example: Progress Bar with Arguments
// Demonstrates using tag arguments to customize rendering
// Usage: #progress{value: 75, max: 100, color: "blue"}

function render(context) {
    // Extract arguments with defaults
    const value = context.args.value || 0;
    const max = context.args.max || 100;
    const color = context.args.color || "green";
    const label = context.args.label || "";
    
    // Calculate percentage
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    // Create progress bar container
    const container = context.element.createDiv({ cls: 'tagverse-progress' });
    
    // Apply styling
    container.style.cssText = `
        display: inline-block;
        min-width: 200px;
        padding: 8px 12px;
        background: var(--background-secondary);
        border-radius: 8px;
        font-family: var(--font-ui);
    `;
    
    // Add label if provided
    if (label) {
        const labelEl = container.createEl('div', {
            text: label,
            cls: 'progress-label'
        });
        labelEl.style.cssText = `
            margin-bottom: 4px;
            font-size: 0.9em;
            color: var(--text-muted);
        `;
    }
    
    // Create progress bar background
    const progressBg = container.createDiv({ cls: 'progress-bg' });
    progressBg.style.cssText = `
        width: 100%;
        height: 20px;
        background: var(--background-modifier-border);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
    `;
    
    // Create progress bar fill
    const progressFill = progressBg.createDiv({ cls: 'progress-fill' });
    progressFill.style.cssText = `
        width: ${percentage}%;
        height: 100%;
        background: ${color};
        border-radius: 10px;
        transition: width 0.3s ease;
    `;
    
    // Add percentage text
    const percentText = container.createEl('div', {
        text: `${value} / ${max} (${percentage.toFixed(0)}%)`,
        cls: 'progress-text'
    });
    percentText.style.cssText = `
        margin-top: 4px;
        text-align: center;
        font-size: 0.85em;
        color: var(--text-normal);
    `;
    
    return container;
}
