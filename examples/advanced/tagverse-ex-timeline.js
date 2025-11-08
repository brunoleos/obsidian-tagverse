// Example: Tag Timeline
// Creates a timeline visualization grouping notes by month, sorted by creation date

async function render(context) {
    const container = context.element.createDiv({ cls: 'tag-timeline' });

    // Collect notes with timestamps
    const files = context.app.vault.getMarkdownFiles();
    const events = [];

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            events.push({
                date: new Date(file.stat.ctime),
                title: file.basename,
                path: file.path
            });
        }
    }

    // Sort by date
    events.sort((a, b) => a.date - b.date);

    // Group by month
    const byMonth = events.reduce((acc, event) => {
        const key = `${event.date.getFullYear()}-${event.date.getMonth()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {});

    // Render timeline
    const wrapper = container.createDiv();
    wrapper.style.cssText = `
        padding: 16px;
        background: var(--background-secondary);
        border-radius: 12px;
        max-height: 400px;
        overflow-y: auto;
    `;

    const heading = wrapper.createEl('h4');
    heading.style.cssText = 'margin: 0 0 16px 0;';
    heading.textContent = `📅 #${context.tag} Timeline`;

    const timelineDiv = wrapper.createDiv({ cls: 'timeline' });

    // Render each month group
    Object.entries(byMonth).forEach(([month, monthEvents]) => {
        const date = monthEvents[0].date;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthGroup = timelineDiv.createDiv();
        monthGroup.style.marginBottom = '20px';

        const monthHeader = monthGroup.createDiv();
        monthHeader.style.cssText = `
            font-weight: 600;
            color: var(--interactive-accent);
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid var(--interactive-accent);
        `;
        monthHeader.textContent = `${monthName} (${monthEvents.length})`;

        const eventsContainer = monthGroup.createDiv();
        eventsContainer.style.paddingLeft = '16px';

        // Render each event
        monthEvents.forEach(event => {
            const eventDiv = eventsContainer.createDiv();
            eventDiv.style.cssText = `
                padding: 6px 0;
                border-left: 2px solid var(--background-modifier-border);
                padding-left: 12px;
                margin-bottom: 4px;
            `;

            const link = eventDiv.createEl('a', {
                cls: 'internal-link',
                text: event.title
            });
            link.href = event.path;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                context.app.workspace.openLinkText(event.path, '', false);
            });

            const dateSpan = eventDiv.createEl('span');
            dateSpan.style.cssText = `
                font-size: 0.8em;
                color: var(--text-muted);
                margin-left: 8px;
            `;
            dateSpan.textContent = event.date.toLocaleDateString();
        });
    });

    return container;
}
