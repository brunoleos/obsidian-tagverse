// Example: Tag Statistics Dashboard
// Displays statistics about notes using this tag, including total notes, word count, average
// words per note, and newest note

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
    const wrapper = container.createDiv();
    wrapper.style.cssText = `
        padding: 16px;
        background: var(--background-secondary);
        border-radius: 12px;
        border: 2px solid var(--interactive-accent);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;

    const heading = wrapper.createEl('h4');
    heading.style.cssText = 'margin: 0 0 12px 0; color: var(--interactive-accent);';
    heading.textContent = `📊 #${context.tag} Statistics`;

    const grid = wrapper.createDiv();
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;';

    // Helper function to create stat cards
    const createStatCard = (label, value) => {
        const card = grid.createDiv();
        card.style.cssText = 'padding: 8px; background: var(--background-primary); border-radius: 6px;';

        const labelDiv = card.createDiv();
        labelDiv.style.cssText = 'font-size: 0.8em; color: var(--text-muted);';
        labelDiv.textContent = label;

        const valueDiv = card.createDiv();
        valueDiv.style.cssText = 'font-size: 1.5em; font-weight: bold;';
        valueDiv.textContent = value;
    };

    createStatCard('Total Notes', taggedFiles.length);
    createStatCard('Total Words', totalWords.toLocaleString());
    createStatCard('Avg Words/Note', avgWords);

    // Newest card with different font size
    const newestCard = grid.createDiv();
    newestCard.style.cssText = 'padding: 8px; background: var(--background-primary); border-radius: 6px;';

    const newestLabel = newestCard.createDiv();
    newestLabel.style.cssText = 'font-size: 0.8em; color: var(--text-muted);';
    newestLabel.textContent = 'Newest';

    const newestValue = newestCard.createDiv();
    newestValue.style.cssText = 'font-size: 0.9em; font-weight: bold;';
    newestValue.textContent = newest ? newest.file.basename : 'N/A';

    return container;
}
