# Dynamic Tag Renderer - Advanced Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Script Development Guide](#script-development-guide)
3. [Advanced Examples](#advanced-examples)
4. [API Reference](#api-reference)
5. [Performance Optimization](#performance-optimization)
6. [Troubleshooting](#troubleshooting)

## Architecture Overview

### How It Works

The plugin uses Obsidian's MarkdownPostProcessor API to intercept and transform tag elements during rendering:

1. **Detection**: When a note is rendered, the plugin finds all `<a class="tag">` elements
2. **Matching**: Each tag is compared against configured tag-script mappings
3. **Execution**: Matching tags trigger their associated render scripts
4. **Replacement**: The original tag element is replaced with the rendered content

### Script Lifecycle

```
Load Script → Cache → Execute render() → Return Content → Replace Tag
     ↓           ↓          ↓                  ↓             ↓
  From Vault  Memory    With Context      Element/HTML   In Document
```

## Script Development Guide

### Basic Structure

Every render script must define a `render` function:

```javascript
function render(context) {
    // Your rendering logic here
    return elementOrHTML;
}
```

### Async Support

Scripts can be asynchronous for data fetching:

```javascript
async function render(context) {
    const data = await fetchSomeData();
    return createElementWithData(data);
}
```

### Context Object

The context provides everything you need:

```javascript
{
    app: App,              // Obsidian App instance
    tag: string,           // Tag name without #
    element: HTMLElement,  // Pre-created container
    sourcePath: string,    // Current note path
    frontmatter: object    // Note's frontmatter
}
```

### Return Types

You can return:

1. **HTMLElement**: Direct DOM manipulation
   ```javascript
   const div = document.createElement('div');
   div.textContent = 'Hello';
   return div;
   ```

2. **String (HTML)**: HTML string
   ```javascript
   return '<span class="custom">Hello</span>';
   ```

3. **Null/Undefined**: No rendering
   ```javascript
   if (someCondition) return null;
   ```

## Advanced Examples

### Example 1: Tag Statistics Dashboard

```javascript
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
```

### Example 2: Interactive Tag Filter

```javascript
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
```

### Example 3: Tag Timeline Visualization

```javascript
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
```

### Example 4: Tag-based Task Counter

```javascript
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
```

## API Reference

### Obsidian App API Access

Through `context.app`, you have access to:

```javascript
// Vault operations
context.app.vault.getMarkdownFiles()
context.app.vault.read(file)
context.app.vault.getAbstractFileByPath(path)

// Metadata cache
context.app.metadataCache.getFileCache(file)
context.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath)

// Workspace
context.app.workspace.openLinkText(linktext, sourcePath)
context.app.workspace.getActiveFile()
context.app.workspace.getActiveViewOfType(MarkdownView)

// Plugins
context.app.plugins.getPlugin(pluginId)
context.app.internalPlugins.getPluginById(pluginId)

// UI
new context.app.Notice(message)
```

### Helper Functions

You can define helper functions in your scripts:

```javascript
// Helper: Get all files with a specific tag
function getFilesWithTag(app, tagName) {
    const files = app.vault.getMarkdownFiles();
    return files.filter(file => {
        const cache = app.metadataCache.getFileCache(file);
        return cache?.tags?.some(t => t.tag === '#' + tagName);
    });
}

// Use in render function
async function render(context) {
    const files = getFilesWithTag(context.app, context.tag);
    // ... render logic
}
```

## Performance Optimization

### 1. Script Caching

Scripts are automatically cached. To clear cache:
- Use the command palette: "Clear script cache"
- Restart Obsidian
- Modify plugin settings

### 2. Efficient Data Access

```javascript
// ❌ Bad: Reading every file
async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    for (const file of files) {
        const content = await context.app.vault.read(file); // Expensive!
    }
}

// ✅ Good: Use metadata cache
function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file); // Fast!
    }
}
```

### 3. Limit Rendered Elements

```javascript
// Limit to first 50 items
const items = allItems.slice(0, 50);
```

### 4. Debounce Interactive Elements

```javascript
let timeout;
filterInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateResults(e.target.value);
    }, 300);
});
```

## Troubleshooting

### Script Not Executing

1. Check the script path in settings
2. Ensure the script file exists in your vault
3. Check the console for error messages (Ctrl+Shift+I)
4. Verify the `render` function is defined

### Tag Not Being Rendered

1. Ensure the tag mapping is enabled
2. Check that you're in preview/reading mode (not source mode)
3. Verify the tag name matches exactly (case-sensitive)
4. Try refreshing: Command Palette → "Refresh dynamic tags"

### Performance Issues

1. Clear script cache
2. Optimize your render functions (see Performance section)
3. Limit the number of elements rendered
4. Use metadata cache instead of reading files

### Common Errors

**Error: "No render() function found"**
- Solution: Ensure your script defines a `render` function

**Error: "Script file not found"**
- Solution: Check the script path in settings

**Element not appearing**
- Solution: Make sure to return an element or HTML string

**Styles not applying**
- Solution: Use inline styles or add styles to a CSS snippet

## Best Practices

1. **Always return something**: Return null if you don't want to render
2. **Handle errors gracefully**: Use try-catch blocks
3. **Test with small datasets first**: Before processing all files
4. **Use semantic HTML**: For better accessibility
5. **Keep scripts focused**: One responsibility per script
6. **Document your scripts**: Add comments explaining logic
7. **Cache expensive operations**: Don't recalculate on every render