# 🌌 Tagverse

**Transform simple #tags into interactive universes of possibility**

Tagverse revolutionizes how you think about tags in Obsidian. Each humble #tag becomes a portal to a personal universe - buttons that perform actions, charts that visualize data, forms that interact with your vault, media players, progress bars, and infinite other experiences.

> *"Tags aren't just labels anymore. They're gateways to entire worlds of functionality."*

[![GitHub stars](https://img.shields.io/github/stars/brunoleos/obsidian-tagverse?style=social)](https://github.com/brunoleos/obsidian-tagverse)
[![GitHub license](https://img.shields.io/github/license/brunoleos/obsidian-tagverse)](https://github.com/brunoleos/obsidian-tagverse/blob/main/LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbrunoleos%2Fobsidian-tagverse%2Fmain%2Fmanifest.json&query=%24.downloads&label=downloads)](https://obsidian.md/plugins?id=tagverse)

## ✨ What Makes Tagverse Revolutionary

Imagine turning `#todo-button` into an actual clickable button that adds tasks to your system, or `#note-stats` into a beautiful chart showing your writing analytics, or `#project-tracker` into an interactive progress dashboard.

**No more static tags. Your tags become interactive elements, data visualizations, control panels, and digital experiences.**

## 🚀 Core Capabilities

- 🏷️ **Universal Tag Transformation**: Turn ANY tag into ANY JavaScript-powered content
- ⚡ **Real-time Rendering**: Works in both Reading and Live Preview modes
- 🔧 **Full Obsidian API Access**: Complete power to interact with your vault
- 📊 **Rich Data Integration**: Access frontmatter, linked notes, and metadata
- 🎨 **CSS-Ready Display**: Perfect visual consistency across modes
- 💾 **Smart Caching**: Lightning-fast performance with intelligent script caching
- 🔄 **Auto-Refresh**: Always shows current data when opening files

## Installation

### From Obsidian Community Plugins (Coming Soon)
1. Open Settings → Community Plugins
2. Browse and search for "Tagverse"
3. Install and enable the plugin

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to `{VaultFolder}/.obsidian/plugins/tagverse/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Your First Dynamic Tag

Get started with Tagverse in just a few minutes!

#### Step 1: Create a Render Script

Create a file in your vault: `scripts/my-first-renderer.js`

```javascript
function render(context) {
    // Create a simple button
    const button = context.element.createEl('button', {
        text: `Click me! (Tag: ${context.tag})`,
        cls: 'my-custom-button'
    });

    button.addEventListener('click', () => {
        new context.Notice(`Hello from #${context.tag}! 👋`);
    });

    return button;
}
```

#### Step 2: Configure the Plugin

1. Open **Settings** → **Tagverse**
2. Click **Add mapping**
3. Fill in:
   - **Tag name**: `test` (without #)
   - **Script path**: `scripts/my-first-renderer.js`
4. Leave **enabled** checked

#### Step 3: Test It!

1. Create a new note
2. Add the tag: `#test`
3. Switch to **Reading view** (Ctrl/Cmd + E)
4. See your tag transformed into a button!
5. Click it to see a notification

🎉 **Congratulations!** You've created your first dynamic tag!

### Script Context

Your render function receives a `context` object with:

- `context.app`: The Obsidian App instance (full Obsidian API access)
- `context.tag`: The tag name (without #)
- `context.args`: Arguments passed to the tag (see Tag Arguments below)
- `context.element`: The container element for your rendered content
- `context.sourcePath`: The path of the current note
- `context.frontmatter`: The note's frontmatter data
- `context.Notice`: The Obsidian Notice constructor

### Tag Arguments

**NEW**: Tags now support JavaScript/JSON-style arguments for dynamic customization!

**Syntax:** `#tagname{key: value, key2: value2}`

Arguments are passed as a JavaScript object in `context.args`, supporting all JSON data types including strings, numbers, booleans, arrays, and nested objects.

**Examples:**
```markdown
#progress{value: 75, max: 100, color: "blue"}
#button{action: "create-note", label: "New Note", tags: ["project", "todo"]}
#chart{type: "pie", data: "sales", legend: true, colors: ["#ff0000", "#00ff00"]}
```

**In your render script:**
```javascript
function render(context) {
    // Access arguments with defaults
    const value = context.args.value || 0;
    const color = context.args.color || "green";
    const items = context.args.items || [];
    
    // Use the arguments to customize rendering
    return `<div style="color: ${color}">${value}</div>`;
}
```

**Backward Compatibility:** Tags without arguments work seamlessly - `context.args` will be an empty object `{}`.

#### Useful App Methods

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
new context.Notice('Hello!')

// Open search
context.app.internalPlugins.getPluginById('global-search')
    .instance.openGlobalSearch('query')
```

### Example Scripts

#### Tag Counter

Show how many notes use a tag:

```javascript
function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let count = 0;

    files.forEach(file => {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            count++;
        }
    });

    return `<span class="tag-count">📊 Used in ${count} notes</span>`;
}
```

**Tag to use**: `#project`, `#meeting`, or any tag you want

#### Quick Search Link

Open search for a tag with one click:

```javascript
function render(context) {
    const searchLink = context.element.createEl('a', {
        text: `🔍 Search #${context.tag}`,
        cls: 'tag-search-link'
    });

    searchLink.addEventListener('click', (e) => {
        e.preventDefault();
        context.app.internalPlugins.getPluginById('global-search')
            .instance.openGlobalSearch(`tag:#${context.tag}`);
    });

    return searchLink;
}
```

**Tag to use**: `#important`, `#todo`, `#idea`

#### Related Notes List

Show notes that share the tag:

```javascript
async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    const relatedNotes = [];

    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) {
            relatedNotes.push(file);
        }
    }

    const container = context.element.createDiv({ cls: 'related-notes' });
    container.createEl('strong', { text: `Related notes (${relatedNotes.length}):` });

    const list = container.createEl('ul');
    relatedNotes.slice(0, 5).forEach(note => {
        const li = list.createEl('li');
        const link = li.createEl('a', {
            text: note.basename,
            cls: 'internal-link'
        });
        link.addEventListener('click', (e) => {
            e.preventDefault();
            context.app.workspace.openLinkText(note.path, '', false);
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

## 🔥 Showcases of Tagverse Power

These examples barely scratch the surface of what your tag universes can become:

### 📊 Data Dashboards
```
Turn #project-status into a progress bar showing completion percentage
Turn #note-stats into a word count chart
Turn #calendar into an embedded mini-calendar
```

### 🎮 Interactive Controls
```
Turn #todo-button into a "Add Task" button that creates new notes
Turn #voice-memo into a recording button
Turn #quick-search into a custom search interface
```

### 📈 Live Analytics
```
Turn #writing-stats into a graph of your daily word count
Turn #activity-heatmap into a GitHub-style contribution calendar
Turn #backlinks-count into a dynamic counter
```

### 🎨 Rich Media Experiences
```
Turn #music-player into an embedded Spotify player
Turn #image-gallery into a rotating photo display
Turn #weather-widget into a local weather forecast
```

### 🤖 Smart Automation
```
Turn #daily-quote into a random inspirational quote generator
Turn #reminder into a customizable notification system
Turn #habit-tracker into an interactive progress tracker
```

## Commands

- **Refresh tagverses in current note**: Manually refresh all rendered tags
- **Clear script cache**: Clear the script cache (useful when developing scripts)

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

Ready to unleash the full power of Tagverse? Here's what's next:

1. **Explore Examples**: Dive into the `examples/` folder for inspiration and copy-paste scripts
2. **Read Full Docs**: Visit [DOCUMENTATION.md](DOCUMENTATION.md) for advanced features and API details
3. **Join Community**: Share your creations and get help on the [Obsidian Discord](https://discord.gg/obsidianmd)
4. **Create Cool Scripts**: Experiment with your own tag transformations and have fun!

### Need Help?

- 📖 **[Full Documentation](DOCUMENTATION.md)**: Advanced guides and API reference
- 🐛 **[Report Issues](https://github.com/brunoleos/obsidian-tagverse/issues)**: Found a bug? Let us know
- 💬 **[Obsidian Discord](https://discord.gg/obsidianmd)**: Community support and discussions
- 💡 **[Feature Requests](https://github.com/brunoleos/obsidian-tagverse/issues/new)**: Have an idea? Suggest it here

## 🆚 Similar Plugins

Tagverse makes tag-based interactivity general-purpose. Here are related plugins with more specific scopes:

- **Buttons Plugin**: Creates clickable buttons for common actions (run code, open notes, etc.). Less flexible than Tagverse but simpler to use for basic workflows.

- **Tasks Plugin**: Makes task items (checkboxes) interactive and provides task management features.

- **Projects Plugin**: For project management with due dates and status tracking.

- **Dataview**: Powers data visualization and queries, can display interactive results alongside Tagverse widgets.

- **Templater**: Creates dynamic content via scripts - complementary to Tagverse for generated content.

- **Meta Bind**: Allows binding metadata to form controls - similar interactivity but focused on metadata.

What differentiates Tagverse is its ability to transform ANY tag into ANY interactive content using JavaScript, giving creators full control over user experiences.

## 🚀 Future Roadmap

### High Priority
- **JIRA-Style Tag Matching**: Support regex patterns for tags like `PROJ-123` or `GITHUB-456`, extending beyond simple tag names

### Medium Priority
- **Context/Scopes**: Apply transformations only in specific folders, files, or based on frontmatter conditions
- **Script Template Library**: Built-in templates for common use cases with validation and helper functions

### Medium-Low Priority
- **Hover Previews**: See rendered previews when hovering over tags in live preview mode
- **Grouped Tag Mappings**: Organize mappings into categories with batch operations

### Low Priority
- **Performance Monitoring**: Track render times, identify slow scripts, and provide optimization recommendations

---

## Development

### Project Structure

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

### Setup
```bash
npm install
```

### Build
```bash
npm run dev    # Development mode with watch
npm run build  # Production build
```

### Testing
1. Build the plugin
2. Create a test vault or use the `.obsidian/plugins/` folder in an existing vault
3. Copy `main.js`, `manifest.json`, and `styles.css` to the plugin folder
4. Reload Obsidian

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- ☕ Buying me a coffee

## License

MIT License - see LICENSE file for details

## Credits

Created with ❤️ for the Obsidian community

---

**Note**: This plugin executes custom JavaScript code. Only use scripts from trusted sources and review them before use.
