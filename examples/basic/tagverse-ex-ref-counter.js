// Example: Badge with Count
// Creates a badge element displaying the tag name and the count of notes that contain it

async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let count = 0;

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            count++;
        }
    }

    const badge = context.element.createEl('span', {
        cls: 'tag-badge'
    });

    badge.innerHTML = `
        <span style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: linear-gradient(135deg, var(--interactive-accent), var(--interactive-accent-hover));
            color: var(--text-on-accent);
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
            🏷️ ${context.tag}
            <span style="
                background: rgba(255,255,255,0.3);
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 0.9em;
            ">${count}</span>
        </span>
    `;

    return badge;
}
