# Quick Start Guide - Tagverse

Get started with Tagverse in 5 minutes!

## What is Tagverse?

Transform your Obsidian tags into interactive, dynamic content using custom JavaScript. Instead of seeing `#project`, you could see a button, a progress bar, a list of related notes, or anything you can imagine!

## Installation

### From Obsidian Community Plugins (Coming Soon)
1. Open Obsidian Settings
2. Go to **Community Plugins** → **Browse**
3. Search for "Tagverse"
4. Click **Install**, then **Enable**

### Manual Installation
1. Download latest release from [GitHub](https://github.com/brunoleos/obsidian-tagverse/releases)
2. Extract files to `.obsidian/plugins/tagverse/`
3. Reload Obsidian
4. Enable in Settings → Community Plugins

## Your First Dynamic Tag

### Step 1: Create a Render Script

Create a file in your vault: `scripts/my-first-renderer.js`

```javascript
function render(context) {
    // Create a simple button
    const button = context.element.createEl('button', {
        text: `🎉 You clicked #${context.tag}!`,
        cls: 'my-custom-tag'
    });
    
    button.style.cssText = `
        padding: 6px 12px;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
    `;
    
    button.addEventListener('click', () => {
        new context.app.Notice(`Hello from #${context.tag}! 👋`);
    });
    
    return button;
}
```

### Step 2: Configure the Plugin

1. Open **Settings** → **Tagverse**
2. Click **Add mapping**
3. Fill in:
   - **Tag name**: `test` (without #)
   - **Script path**: `scripts/my-first-renderer.js`
4. Leave **enabled** checked

### Step 3: Test It!

1. Create a new note
2. Add the tag: `#test`
3. Switch to **Reading view** (Ctrl/Cmd + E)
4. See your tag transformed into a button!
5. Click it to see a notification

🎉 **Congratulations!** You've created your first dynamic tag!

## Common Use Cases

### 1. Tag Counter

Show how many notes use a tag:

```javascript
async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let count = 0;
    
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            count++;
        }
    }
    
    return `<span style="
        padding: 4px 10px;
        background: #3b82f6;
        color: white;
        border-radius: 12px;
        font-size: 0.85em;
        font-weight: 600;
    ">
        #${context.tag} • ${count} notes
    </span>`;
}
```

**Tag to use**: `#project`, `#meeting`, or any tag you want

### 2. Quick Search Link

Open search for a tag with one click:

```javascript
function render(context) {
    const link = context.element.createEl('a', {
        text: `🔍 Search #${context.tag}`,
        cls: 'tag-search'
    });
    
    link.style.cssText = `
        padding: 4px 10px;
        background: #10b981;
        color: white;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.9em;
        cursor: pointer;
    `;
    
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const search = context.app.internalPlugins.getPluginById('global-search');
        search.instance.openGlobalSearch(`tag:#${context.tag}`);
    });
    
    return link;
}
```

**Tag to use**: `#important`, `#todo`, `#idea`

### 3. Task Progress Bar

Show task completion for a tag:

```javascript
async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let total = 0;
    let completed = 0;
    
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            const content = await context.app.vault.read(file);
            const tasks = content.match(/- \[.\]/g) || [];
            const done = content.match(/- \[x\]/gi) || [];
            total += tasks.length;
            completed += done.length;
        }
    }
    
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return `
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: #f3f4f6;
            border-radius: 8px;
        ">
            <span style="font-weight: 600;">#${context.tag}</span>
            <div style="
                width: 100px;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
            ">
                <div style="
                    width: ${percent}%;
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                "></div>
            </div>
            <span style="font-size: 0.9em;">${completed}/${total}</span>
        </div>
    `;
}
```

**Tag to use**: `#goals`, `#sprint`, `#checklist`

### 4. Related Notes List

Show notes that share the tag:

```javascript
async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    const related = [];
    
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            related.push(file);
        }
    }
    
    const container = context.element.createDiv();
    container.innerHTML = `
        <details style="
            display: inline-block;
            background: #fef3c7;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
        ">
            <summary style="font-weight: 600; cursor: pointer;">
                📎 #${context.tag} (${related.length} notes)
            </summary>
            <ul style="
                margin: 8px 0 0 0;
                padding-left: 20px;
            ">
                ${related.slice(0, 5).map(f => 
                    `<li><a href="${f.path}" class="internal-link">${f.basename}</a></li>`
                ).join('')}
                ${related.length > 5 ? `<li style="color: #6b7280;">...and ${related.length - 5} more</li>` : ''}
            </ul>
        </details>
    `;
    
    // Handle internal link clicks
    container.querySelectorAll('a.internal-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            context.app.workspace.openLinkText(link.getAttribute('href'), '', false);
        });
    });
    
    return container;
}
```

**Tag to use**: `#topic`, `#reference`, `#resource`

## Tips & Tricks

### Multiple Tags, One Script

You can map multiple tags to the same script! Just add multiple mappings in settings:
- `#project` → `scripts/task-progress.js`
- `#work` → `scripts/task-progress.js`
- `#personal` → `scripts/task-progress.js`

### Conditional Rendering

Return `null` to skip rendering:

```javascript
function render(context) {
    // Only render in specific notes
    if (!context.sourcePath.includes('Projects')) {
        return null;
    }
    
    // Your rendering logic...
}
```

### Use Note Frontmatter

Access frontmatter in your scripts:

```javascript
function render(context) {
    const status = context.frontmatter?.status || 'unknown';
    return `<span>#${context.tag} • Status: ${status}</span>`;
}
```

### Debugging

Check the console for errors:
1. Press `Ctrl/Cmd + Shift + I` to open Developer Tools
2. Go to the **Console** tab
3. Look for error messages

### Refresh Rendered Tags

If tags don't update:
1. Open Command Palette (`Ctrl/Cmd + P`)
2. Run: "Refresh tagverses in current note"
3. Or: "Clear script cache"

## What You Can Access

Your render scripts have access to:

```javascript
context.app          // Full Obsidian App API
context.tag          // Tag name (without #)
context.element      // Container element
context.sourcePath   // Current note path
context.frontmatter  // Note metadata
```

### Useful App Methods

```javascript
// Get all markdown files
context.app.vault.getMarkdownFiles()

// Read a file
await context.app.vault.read(file)

// Get file metadata
context.app.metadataCache.getFileCache(file)

// Open a note
context.app.workspace.openLinkText(path, '', false)

// Show notification
new context.app.Notice('Hello!')

// Open search
context.app.internalPlugins.getPluginById('global-search')
    .instance.openGlobalSearch('query')
```

## Troubleshooting

### Tag Not Rendering
- ✅ Are you in **Reading/Preview mode**? (not Source mode)
- ✅ Is the mapping **enabled** in settings?
- ✅ Does the tag name match exactly? (case-sensitive, no #)
- ✅ Does the script file exist at the specified path?

### Script Error
- ✅ Check console for error details (`Ctrl/Cmd + Shift + I`)
- ✅ Is `render()` function defined?
- ✅ Are there any syntax errors in your JavaScript?

### Tags Showing Old Content
- Run "Clear script cache" command
- Restart Obsidian

## Next Steps

1. **Explore Examples**: Check the `examples/` folder for more ideas
2. **Read Full Docs**: See [DOCUMENTATION.md](DOCUMENTATION.md) for advanced features
3. **Join Community**: Share your scripts and get help on the forum
4. **Create Cool Scripts**: Experiment and have fun!

## Project Structure

The plugin uses a modular TypeScript architecture:

```
src/
├── types/interfaces.ts      # TypeScript interfaces and types
├── core/
│   ├── plugin.ts           # Main plugin class (TagversePlugin)
│   └── widget.ts           # Widget class (TagverseWidget)
├── settings/
│   └── settings-tab.ts     # Settings UI (TagverseSettingTab)
├── utils/
│   └── logger.ts           # Logger utility
├── constants/
│   └── index.ts            # Constants and configuration
└── index.ts                # Main exports
```

## Need Help?

- 📖 [Full Documentation](DOCUMENTATION.md)
- 🐛 [Report Issues](https://github.com/brunoleos/obsidian-tagverse/issues)
- 💬 [Obsidian Discord](https://discord.gg/obsidianmd)
- 💡 [Feature Requests](https://github.com/brunoleos/obsidian-tagverse/issues/new)

---

**Happy tagging!** 🏷️✨
