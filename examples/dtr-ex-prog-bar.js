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
    
    // Example 5: Progress bar based on tag usage
    
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

// Note: The render function must be defined.
// You can use async/await for asynchronous operations.
// Return an HTMLElement, a string (HTML), or null.