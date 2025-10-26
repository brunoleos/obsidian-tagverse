// Example render script for Dynamic Tag Renderer
// This file shows how to create a custom tag renderer

/**
 * The render function is called for each tag that matches your configuration
 * @param {Object} context - The rendering context
 * @param {App} context.app - Obsidian App instance
 * @param {string} context.tag - The tag name (without #)
 * @param {HTMLElement} context.element - Container element
 * @param {string} context.sourcePath - Path of the current note
 * @param {Object} context.frontmatter - Note frontmatter
 * @returns {HTMLElement|string|null} The rendered content
 */
async function render(context) {
    
    // Example 3: Create a badge with count
    
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