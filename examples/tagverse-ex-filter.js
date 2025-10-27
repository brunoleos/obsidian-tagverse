// Example: Interactive Tag Filter
// Displays all notes with this tag in a filterable list
// Allows searching through related notes dynamically
async function render(context) {
    const container = context.element.createDiv({ cls: 'tag-filter' });

    // Get all notes with this tag
    const files = context.app.vault.getMarkdownFiles();
    const taggedNotes = [];

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            // Get other tags from this note
            const otherTags = cache.tags
                .map(t => t.tag.replace('#', ''))
                .filter(t => t !== context.tag);

            taggedNotes.push({
                file,
                tags: otherTags,
                frontmatter: cache.frontmatter
            });
        }
    }

    // Create filter UI
    const header = container.createDiv();
    header.innerHTML = `
        <div style="margin-bottom: 12px;">
            <strong>#${context.tag}</strong> notes (${taggedNotes.length})
        </div>
    `;

    // Add filter input
    const filterInput = container.createEl('input', {
        type: 'text',
        placeholder: 'Filter by title...'
    });
    filterInput.style.cssText = `
        width: 100%;
        padding: 8px;
        margin-bottom: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
    `;

    // Create notes list
    const notesList = container.createEl('div', { cls: 'notes-list' });
    notesList.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        padding: 8px;
        background: var(--background-secondary);
        border-radius: 6px;
    `;

    // Render function for notes
    const renderNotes = (filter = '') => {
        notesList.empty();

        const filtered = taggedNotes.filter(note =>
            note.file.basename.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            notesList.createDiv({
                text: 'No notes found',
                cls: 'no-notes'
            }).style.cssText = 'padding: 16px; text-align: center; color: var(--text-muted);';
            return;
        }

        filtered.forEach(note => {
            const noteEl = notesList.createDiv({ cls: 'note-item' });
            noteEl.style.cssText = `
                padding: 8px;
                margin-bottom: 4px;
                background: var(--background-primary);
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            `;

            const title = noteEl.createEl('div', {
                text: note.file.basename
            });
            title.style.fontWeight = '500';

            if (note.tags.length > 0) {
                const tagsEl = noteEl.createEl('div');
                tagsEl.style.cssText = 'font-size: 0.85em; color: var(--text-muted); margin-top: 4px;';
                tagsEl.textContent = note.tags.map(t => '#' + t).join(' ');
            }

            noteEl.addEventListener('mouseenter', () => {
                noteEl.style.background = 'var(--background-modifier-hover)';
            });

            noteEl.addEventListener('mouseleave', () => {
                noteEl.style.background = 'var(--background-primary)';
            });

            noteEl.addEventListener('click', () => {
                context.app.workspace.openLinkText(note.file.path, '', false);
            });
        });
    };

    // Initial render
    renderNotes();

    // Add filter listener
    filterInput.addEventListener('input', (e) => {
        renderNotes(e.target.value);
    });

    return container;
}
