// Example: Regex Word Search
// Takes a regex pattern input and displays all occurrences of matching words in tagged notes

async function render(context) {
    const container = context.element.createEl('div', {
        cls: 'regex-search-container'
    });

    // Input field for regex pattern
    const inputContainer = container.createEl('div');
    inputContainer.style.cssText = 'margin-bottom: 12px;';

    const regexInput = inputContainer.createEl('input', {
        type: 'text',
        placeholder: 'Enter regex pattern (e.g., \\b\\w+\\b for words)',
        cls: 'regex-input'
    });
    regexInput.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-family: var(--font-interface);
        margin-bottom: 8px;
    `;

    const searchBtn = inputContainer.createEl('button', {
        text: '🔍 search',
        cls: 'search-btn'
    });
    searchBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
    `;

    // Results container
    const resultsContainer = container.createEl('div', {
        cls: 'search-results'
    });
    resultsContainer.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        padding: 8px;
        background: var(--background-secondary);
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
    `;

    // Search function
    const performSearch = async () => {
        const pattern = regexInput.value.trim();
        if (!pattern) {
            new context.Notice('Please enter a regex pattern');
            return;
        }

        let regex;
        try {
            regex = new RegExp(pattern, 'gi');
        } catch (e) {
            new context.Notice('Invalid regex pattern: ' + e.message);
            return;
        }

        resultsContainer.empty();

        const files = context.app.vault.getMarkdownFiles();
        const taggedFiles = [];

        // Filter files by tag
        for (const file of files) {
            const cache = context.app.metadataCache.getFileCache(file);
            if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
                taggedFiles.push(file);
            }
        }

        let totalMatches = 0;

        for (const file of taggedFiles) {
            try {
                const content = await context.app.vault.read(file);
                const matches = content.match(regex);

                if (matches && matches.length > 0) {
                    const fileResult = resultsContainer.createEl('div', {
                        cls: 'file-result'
                    });

                    const fileHeader = fileResult.createEl('div', {
                        cls: 'file-header'
                    });
                    fileHeader.style.cssText = `
                        font-weight: 600;
                        color: var(--text-accent);
                        margin-bottom: 4px;
                        margin-top: 8px;
                        padding-bottom: 2px;
                        border-bottom: 1px solid var(--background-modifier-border);
                    `;
                    fileHeader.textContent = `${file.basename} (${matches.length} matches)`;

                    // Show first few matches
                    const matchList = fileResult.createEl('div', {
                        cls: 'match-list'
                    });
                    matches.slice(0, 5).forEach(match => {
                        const matchItem = matchList.createEl('div', {
                            cls: 'match-item'
                        });
                        matchItem.style.cssText = `
                            padding: 2px 4px;
                            margin: 2px 0;
                            background: var(--background-primary);
                            border-radius: 3px;
                            font-size: 0.9em;
                            font-family: monospace;
                            color: var(--text-muted);
                        `;
                        matchItem.textContent = `"${match.length > 50 ? match.substring(0, 47) + '...' : match}"`;
                    });

                    if (matches.length > 5) {
                        const more = fileResult.createEl('div', {
                            text: `... and ${matches.length - 5} more matches`,
                            cls: 'more-matches'
                        });
                        more.style.cssText = 'font-size: 0.8em; color: var(--text-muted); padding: 4px 0;';
                    }

                    totalMatches += matches.length;
                }
            } catch (error) {
                console.error(`Error reading file ${file.path}:`, error);
            }
        }

        if (totalMatches === 0) {
            const noResults = resultsContainer.createEl('div', {
                text: 'No matches found',
                cls: 'no-results'
            });
            noResults.style.cssText = `
                text-align: center;
                padding: 16px;
                color: var(--text-muted);
                font-style: italic;
            `;
        } else {
            const summary = resultsContainer.createEl('div', {
                text: `Found ${totalMatches} matches across ${taggedFiles.length} tagged files`,
                cls: 'search-summary'
            });
            summary.style.cssText = `
                text-align: center;
                padding: 8px;
                color: var(--text-accent);
                font-weight: 600;
                margin-top: 12px;
            `;
        }
    };

    // Event listeners
    searchBtn.addEventListener('click', performSearch);
    regexInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    return container;
}
