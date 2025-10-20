# Dynamic Tag Renderer

A powerful Obsidian plugin that allows you to dynamically render tags with custom JavaScript scripts. Transform your tags into interactive, dynamic content!

## Features

- 🏷️ **Custom Tag Rendering**: Define custom JavaScript functions to render specific tags
- ⚙️ **Flexible Configuration**: Map multiple tags to different render scripts
- 🔄 **Auto-refresh**: Automatically refresh rendered tags when opening files
- 💾 **Script Caching**: Efficient caching system for better performance
- 🎨 **Full Access**: Scripts have access to the Obsidian API, note metadata, and more

## Installation

### From Obsidian Community Plugins (Coming Soon)
1. Open Settings → Community Plugins
2. Browse and search for "Dynamic Tag Renderer"
3. Install and enable the plugin

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to `{VaultFolder}/.obsidian/plugins/dynamic-tag-renderer/`
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

1. Open Settings → Dynamic Tag Renderer
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

## Commands

- **Refresh dynamic tags in current note**: Manually refresh all rendered tags
- **Clear script cache**: Clear the script cache (useful when developing scripts)

## Development

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