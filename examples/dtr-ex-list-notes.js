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
    
    // Example 4: List related notes
    
    const files = context.app.vault.getMarkdownFiles();
    const relatedNotes = [];
    
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            relatedNotes.push(file);
        }
    }
    
    const container = context.element.createDiv({ cls: 'related-notes-dropdown' });
    container.style.cssText = `
        display: inline-block;
        position: relative;
    `;
    
    const summary = container.createEl('span', {
        text: `📎 ${context.tag} (${relatedNotes.length})`,
        cls: 'tag-summary'
    });
    
    summary.style.cssText = `
        padding: 4px 10px;
        background: var(--background-secondary);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
    `;
    
    const dropdown = container.createEl('div', { cls: 'notes-dropdown' });
    dropdown.style.cssText = `
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        padding: 8px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        min-width: 200px;
        max-width: 300px;
        z-index: 1000;
    `;
    
    const list = dropdown.createEl('ul');
    list.style.cssText = `
        list-style: none;
        padding: 0;
        margin: 0;
    `;
    
    relatedNotes.slice(0, 10).forEach(note => {
        const li = list.createEl('li');
        li.style.cssText = `padding: 4px 0;`;
        
        const link = li.createEl('a', {
            text: note.basename,
            cls: 'internal-link'
        });
        
        link.style.cssText = `
            color: var(--text-normal);
            text-decoration: none;
            display: block;
            padding: 4px 8px;
            border-radius: 4px;
        `;
        
        link.addEventListener('mouseenter', () => {
            link.style.background = 'var(--background-modifier-hover)';
        });
        
        link.addEventListener('mouseleave', () => {
            link.style.background = 'transparent';
        });
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            context.app.workspace.openLinkText(note.path, '', false);
        });
    });
    
    if (relatedNotes.length > 10) {
        const more = dropdown.createEl('div', {
            text: `... and ${relatedNotes.length - 10} more`,
            cls: 'more-notes'
        });
        more.style.cssText = `
            padding: 8px;
            text-align: center;
            color: var(--text-muted);
            font-size: 0.85em;
        `;
    }
    
    summary.addEventListener('click', () => {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    return container;
}