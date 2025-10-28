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
    container.innerHTML = `
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: var(--background-secondary);
            border-radius: 8px;
            font-size: 0.85em;
        ">
            <span style="font-weight: 600;">#${context.tag}</span>
            <div style="
                width: 100px;
                height: 8px;
                background: var(--background-modifier-border);
                border-radius: 4px;
                overflow: hidden;
            ">
                <div style="
                    width: ${percentage}%;
                    height: 100%;
                    background: linear-gradient(90deg, var(--interactive-accent), var(--interactive-accent-hover));
                    transition: width 0.3s ease;
                "></div>
            </div>
            <span style="color: var(--text-muted);">${taggedCount}/${total}</span>
        </div>
    `;

    return container;
}
