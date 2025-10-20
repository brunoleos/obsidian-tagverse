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
    // Example 1: Simple text replacement
    // return `✨ ${context.tag} ✨`;
    
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
        const search = context.app.internalPlugins.getPluginById('global-search');
        if (search) {
            search.instance.openGlobalSearch(`tag:#${context.tag}`);
        }
    });
    
    return button;
    
    // Example 3: Create a badge with count
    /*
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
    */
    
    // Example 4: List related notes
    /*
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
    */
    
    // Example 5: Progress bar based on tag usage
    /*
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
    */
}

// Note: The render function must be defined.
// You can use async/await for asynchronous operations.
// Return an HTMLElement, a string (HTML), or null.