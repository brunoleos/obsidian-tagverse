// Example: Progress Bar
// Renders a progress bar showing the percentage of notes in the vault that use this tag

async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let taggedCount = 0;

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            taggedCount++;
        }
    }

    const total = files.length;
    const percentage = Math.round((taggedCount / total) * 100);

    const container = context.element.createDiv();

    const wrapper = container.createDiv();
    wrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: var(--background-secondary);
        border-radius: 8px;
        font-size: 0.85em;
    `;

    const tagSpan = wrapper.createEl('span');
    tagSpan.style.fontWeight = '600';
    tagSpan.textContent = `#${context.tag}`;

    const progressBarContainer = wrapper.createDiv();
    progressBarContainer.style.cssText = `
        width: 100px;
        height: 8px;
        background: var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
    `;

    const progressBar = progressBarContainer.createDiv();
    progressBar.style.cssText = `
        width: ${percentage}%;
        height: 100%;
        background: linear-gradient(90deg, var(--interactive-accent), var(--interactive-accent-hover));
        transition: width 0.3s ease;
    `;

    const countSpan = wrapper.createEl('span');
    countSpan.style.color = 'var(--text-muted)';
    countSpan.textContent = `${taggedCount}/${total}`;

    return container;
}
