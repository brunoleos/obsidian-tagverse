// Example: Tag Statistics Dashboard
// Displays statistics about notes that use this tag
// Shows total notes, word count, average words per note, and newest note
async function render(context) {
    const container = context.element.createDiv({ cls: 'tag-dashboard' });

    // Get all files with this tag
    const files = context.app.vault.getMarkdownFiles();
    const taggedFiles = [];

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        const hasTags = cache?.tags?.some(t => t.tag === '#' + context.tag);

        if (hasTags) {
            const content = await context.app.vault.read(file);
            taggedFiles.push({
                file,
                wordCount: content.split(/\s+/).length,
                created: file.stat.ctime,
                modified: file.stat.mtime
            });
        }
    }

    // Calculate statistics
    const totalWords = taggedFiles.reduce((sum, f) => sum + f.wordCount, 0);
    const avgWords = Math.round(totalWords / taggedFiles.length) || 0;
    const newest = taggedFiles.sort((a, b) => b.created - a.created)[0];
    const recentlyModified = taggedFiles.sort((a, b) => b.modified - a.modified)[0];

    // Render dashboard
    container.innerHTML = `
        <div style="
            padding: 16px;
            background: var(--background-secondary);
            border-radius: 12px;
            border: 2px solid var(--interactive-accent);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
            <h4 style="margin: 0 0 12px 0; color: var(--interactive-accent);">
                📊 #${context.tag} Statistics
            </h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <div style="padding: 8px; background: var(--background-primary); border-radius: 6px;">
                    <div style="font-size: 0.8em; color: var(--text-muted);">Total Notes</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${taggedFiles.length}</div>
                </div>
                <div style="padding: 8px; background: var(--background-primary); border-radius: 6px;">
                    <div style="font-size: 0.8em; color: var(--text-muted);">Total Words</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${totalWords.toLocaleString()}</div>
                </div>
                <div style="padding: 8px; background: var(--background-primary); border-radius: 6px;">
                    <div style="font-size: 0.8em; color: var(--text-muted);">Avg Words/Note</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${avgWords}</div>
                </div>
                <div style="padding: 8px; background: var(--background-primary); border-radius: 6px;">
                    <div style="font-size: 0.8em; color: var(--text-muted);">Newest</div>
                    <div style="font-size: 0.9em; font-weight: bold;">
                        ${newest ? newest.file.basename : 'N/A'}
                    </div>
                </div>
            </div>
        </div>
    `;

    return container;
}
