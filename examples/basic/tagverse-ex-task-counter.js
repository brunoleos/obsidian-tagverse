// Example: Task Completion Progress
// Calculates and displays task completion statistics for notes tagged with the given tag,
// showing a progress bar and remaining tasks

async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let totalTasks = 0;
    let completedTasks = 0;

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            // Count tasks in this file
            const content = await context.app.vault.read(file);
            const tasks = content.match(/- \[.\]/g) || [];
            const completed = content.match(/- \[x\]/gi) || [];

            totalTasks += tasks.length;
            completedTasks += completed.length;
        }
    }

    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const remaining = totalTasks - completedTasks;

    return `
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: var(--background-secondary);
            border-radius: 12px;
            border: 2px solid ${percentage === 100 ? 'var(--color-green)' : 'var(--interactive-accent)'};
        ">
            <span style="font-weight: 600;">#${context.tag}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="
                    width: 120px;
                    height: 10px;
                    background: var(--background-modifier-border);
                    border-radius: 5px;
                    overflow: hidden;
                ">
                    <div style="
                        width: ${percentage}%;
                        height: 100%;
                        background: ${percentage === 100 ? 'var(--color-green)' : 'var(--interactive-accent)'};
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <span style="font-size: 0.9em; font-weight: 500;">
                    ${completedTasks}/${totalTasks}
                </span>
                ${remaining > 0 ? `
                    <span style="
                        font-size: 0.8em;
                        color: var(--text-muted);
                        background: var(--background-primary);
                        padding: 2px 6px;
                        border-radius: 4px;
                    ">
                        ${remaining} left
                    </span>
                ` : '<span style="color: var(--color-green);">✓ Complete</span>'}
            </div>
        </div>
    `;
}
