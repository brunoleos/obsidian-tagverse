// Example: Backlink Network Preview
// Shows a preview of recent backlinks pointing to notes with this tag, including context
// snippets from linking notes

async function render(context) {
    const backlinks = await getRecentBacklinks(context);

    const container = context.element.createEl('div');
    container.innerHTML = `
        <div style="
            padding: 10px;
            background: var(--background-secondary);
            border-radius: 8px;
            border: 1px solid var(--background-modifier-border);
            max-width: 300px;
        ">
            <div style="font-weight: 600; margin-bottom: 8px; color: var(--interactive-accent);">
                🔗 Backlinks (${backlinks.length})
            </div>
            <div style="max-height: 200px; overflow-y: auto;">
                ${backlinks.slice(0, 5).map(link => `
                    <div style="
                        padding: 6px;
                        margin-bottom: 4px;
                        background: var(--background-primary);
                        border-radius: 4px;
                        border-left: 3px solid var(--interactive-accent);
                        cursor: pointer;
                    "
                    data-source-path="${link.sourcePath}">
                        <div style="font-size: 0.9em; font-weight: 500; color: var(--text-normal);">
                            ${link.sourceName}
                        </div>
                        <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 2px;">
                            ${link.contextSnippet}
                        </div>
                    </div>
                `).join('')}
                ${backlinks.length > 5 ? `
                    <div style="text-align: center; padding: 4px; color: var(--text-muted); font-size: 0.8em;">
                        ... and ${backlinks.length - 5} more
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Add click event listeners for backlink navigation
    const backlinkItems = container.querySelectorAll('[data-source-path]');
    backlinkItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const sourcePath = item.getAttribute('data-source-path');
            if (sourcePath) {
                context.app.workspace.openLinkText(sourcePath, '', false);
            }
        });
    });

    return container;
}

async function getRecentBacklinks(context) {
    const taggedNotes = new Set();
    const backlinks = [];

    // First, find all notes with this tag
    const files = context.app.vault.getMarkdownFiles();
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            taggedNotes.add(file.path);
        }
    }

    // Now find backlinks to these notes
    const allFiles = context.app.vault.getMarkdownFiles();
    for (const file of allFiles) {
        const cache = context.app.metadataCache.getFileCache(file);
        const links = cache?.links || [];

        for (const link of links) {
            // Resolve the link to get the actual target file path
            const resolvedLinkPath = resolveLinkToPath(link.link, context.app);
            if (resolvedLinkPath && taggedNotes.has(resolvedLinkPath)) {
                // This file links to a tagged note
                const content = await context.app.vault.read(file);
                const contentLines = content.split('\n');

                // Find the line with the link to extract context
                let contextSnippet = '';
                for (let i = 0; i < contentLines.length; i++) {
                    if (contentLines[i].includes(link.link)) {
                        // Extract 2 lines of context around the link
                        const start = Math.max(0, i - 1);
                        const end = Math.min(contentLines.length, i + 2);
                        contextSnippet = contentLines.slice(start, end).join(' ').trim();
                        contextSnippet = contextSnippet.replace(/\[.*?\]\(.*?\)/g, ''); // Remove links
                        contextSnippet = contextSnippet.substring(0, 100) + (contextSnippet.length > 100 ? '...' : '');
                        break;
                    }
                }

                backlinks.push({
                    sourcePath: file.path,
                    sourceName: file.basename,
                    targetPath: resolvedLinkPath,
                    contextSnippet: contextSnippet || 'Link reference'
                });
            }
        }
    }

    // Sort by recency (assuming we don't have actual link timestamps)
    backlinks.sort((a, b) => b.sourcePath.localeCompare(a.sourcePath));

    return backlinks;
}

// Helper function to resolve a wikilink text to a file path
function resolveLinkToPath(linkText, app) {
    // Remove display text from links like "Note|Display Text"
    const actualLink = linkText.split('|')[0].trim();

    // If the link already ends with .md, treat it as a direct path
    if (actualLink.endsWith('.md')) {
        return actualLink;
    }

    // Try to find the file by iterating through all markdown files
    const allFiles = app.vault.getMarkdownFiles();
    for (const file of allFiles) {
        // Check if the link matches the file basename (without .md)
        if (file.basename === actualLink) {
            return file.path;
        }
        // Also check if it matches the full path without .md
        if (file.path.replace(/\.md$/, '') === actualLink) {
            return file.path;
        }
        // Handle relative paths by checking if the path ends with the link
        if (file.path.replace(/\.md$/, '').endsWith('/' + actualLink) ||
            file.path.replace(/\.md$/, '').endsWith('\\' + actualLink)) {
            return file.path;
        }
    }

    // If no exact match found, try using Obsidian's link resolution
    const resolvedLinks = app.metadataCache.resolvedLinks;
    for (const [filePath, links] of Object.entries(resolvedLinks)) {
        for (const [linkTarget, count] of Object.entries(links)) {
            if (linkTarget === actualLink || linkTarget.replace(/\.md$/, '') === actualLink) {
                return filePath;
            }
        }
    }

    return null;
}
