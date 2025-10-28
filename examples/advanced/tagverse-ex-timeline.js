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
    container.innerHTML = `
        <div style="
            padding: 16px;
            background: var(--background-secondary);
            border-radius: 12px;
            max-height: 400px;
            overflow-y: auto;
        ">
            <h4 style="margin: 0 0 16px 0;">📅 #${context.tag} Timeline</h4>
            <div class="timeline">
                ${Object.entries(byMonth).map(([month, monthEvents]) => {
                    const date = monthEvents[0].date;
                    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                    return `
                        <div style="margin-bottom: 20px;">
                            <div style="
                                font-weight: 600;
                                color: var(--interactive-accent);
                                margin-bottom: 8px;
                                padding-bottom: 4px;
                                border-bottom: 2px solid var(--interactive-accent);
                            ">
                                ${monthName} (${monthEvents.length})
                            </div>
                            <div style="padding-left: 16px;">
                                ${monthEvents.map(event => `
                                    <div style="
                                        padding: 6px 0;
                                        border-left: 2px solid var(--background-modifier-border);
                                        padding-left: 12px;
                                        margin-bottom: 4px;
                                    ">
                                        <a href="${event.path}" class="internal-link">
                                            ${event.title}
                                        </a>
                                        <span style="
                                            font-size: 0.8em;
                                            color: var(--text-muted);
                                            margin-left: 8px;
                                        ">
                                            ${event.date.toLocaleDateString()}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // Add click listeners for internal links
    container.querySelectorAll('a.internal-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            context.app.workspace.openLinkText(link.getAttribute('href'), '', false);
        });
    });

    return container;
}
