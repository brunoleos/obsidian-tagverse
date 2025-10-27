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

### 1. Create a Render Script

Create a JavaScript file anywhere in your vault (e.g., `scripts/myTagRenderer.js`):

```javascript
// Example: Render a tag as a button that shows a notice
function render(context) {
    const button = context.element.createEl('button', {
        text: `Click me! (Tag: ${context.tag})`,
        cls: 'my-custom-button'
    });
    
    button.addEventListener('click', () => {
        new context.app.Notice(`You clicked the ${context.tag} tag!`);
    });
    
    return button;
}
```

### 2. Configure the Plugin

1. Open Settings → Tagverse
2. Click "Add mapping"
3. Enter the tag name (without #) and the path to your script
4. The tag will now be rendered dynamically in reading/preview mode

### Script Context

Your render function receives a `context` object with:

- `context.app`: The Obsidian App instance
- `context.tag`: The tag name (without #)
- `context.element`: The container element for your rendered content
- `context.sourcePath`: The path of the current note
- `context.frontmatter`: The note's frontmatter data
- `context.Notice`: The Obsidian Notice constructor

### Example Scripts

#### Display Tag Count
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

#### Link to Tag Search
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

#### Display Related Notes
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
