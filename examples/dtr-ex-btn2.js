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
    
    // Example 2: Create an interactive button
    
    const button = context.element.createEl('button', {
        text: `🏷️ ${context.tag}`,
        cls: 'dynamic-tag-button'
    });
    
    button.style.cssText = `
        padding: 4px 12px;
        border-radius: 8px;
        border: 2px solid var(--interactive-accent);
        background: var(--background-modifier-hover);
        color: var(--text-normal);
        cursor: pointer;
        font-size: 0.9em;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.background = 'var(--interactive-accent)';
        button.style.color = 'var(--text-on-accent)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.background = 'var(--background-modifier-hover)';
        button.style.color = 'var(--text-normal)';
    });
    
    button.addEventListener('click', async () => {
        // Count notes with this tag
        const files = context.app.vault.getMarkdownFiles();
        let count = 0;
        
        for (const file of files) {
            const cache = context.app.metadataCache.getFileCache(file);
            if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
                count++;
            }
        }
        
        new context.app.Notice(
            `Tag #${context.tag} appears in ${count} note${count !== 1 ? 's' : ''}`
        );
        
        // Open search for this tag
        const searchPlugin = context.app?.internalPlugins?.getPluginById?.('global-search');
        if (searchPlugin?.instance?.openGlobalSearch) {
            searchPlugin.instance.openGlobalSearch(`tag:#${context.tag}`);
        } else {
            new context.app.Notice('Global search plugin not available');
        }
    });
    
    return button;
}