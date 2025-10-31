# Tagverse Community Scripts

This document explains how to use, contribute to, and manage community scripts in Tagverse.

## For Users

### Installing Scripts

1. Open Obsidian Settings
2. Navigate to **Tagverse → Community Scripts**
3. Browse available scripts or use search/filters
4. Click **Install** on desired script
5. Choose a custom tag name (pre-filled with suggestion)
6. Click **Install & Enable**

The script is now active! Use your custom tag in any note.

### Updating Scripts

When updates are available:
1. Go to **Community Scripts** tab
2. Installed scripts with updates show an "Update" button
3. Click to update to latest version

### Uninstalling Scripts

1. Find the script in **Community Scripts** tab
2. Click **Uninstall**
3. The tag mapping will be removed automatically

### Script Arguments

Many scripts accept arguments for customization:

```markdown
#mytag{argument1: "value", argument2: 123}
```

Check each script's details for available arguments.

## For Contributors

### Submitting Your Script

**Method 1: Via Obsidian (Recommended)**

1. Open **Settings → Tagverse → Submit Script**
2. Select your `.js` file from vault
3. Fill in metadata (name, description, labels, etc.)
4. Click **Generate Submission**
5. Files and instructions are copied to clipboard
6. GitHub PR page opens automatically
7. Fork the repository, add files, and submit PR

**Method 2: Manual GitHub PR**

1. Fork [tagverse-community-scripts](https://github.com/brunoleos/tagverse-community-scripts)
2. Create folder: `scripts/your-script-id/`
3. Add required files (see structure below)
4. Create Pull Request

### Script Structure

Each script requires:

```
scripts/your-script-id/
├── script.js       # Your render function
├── manifest.json   # Metadata
├── README.md       # Usage documentation
└── preview.png     # Screenshot (800x600, optional but recommended)
```

### manifest.json Format

```json
{
  "id": "my-script",
  "name": "My Awesome Script",
  "description": "One-line description of what this does",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "github": "yourusername"
  },
  "minTagverseVersion": "1.0.0",
  "labels": ["productivity", "analytics"],
  "suggestedTag": "mystats",
  "arguments": [
    {
      "name": "style",
      "type": "string",
      "description": "Display style",
      "default": "default",
      "required": false
    }
  ]
}
```

### Script Guidelines

✅ **Do:**
- Write clean, commented code
- Handle errors gracefully
- Use Obsidian CSS variables for theming
- Test in both light and dark themes
- Document all arguments
- Include usage examples

❌ **Don't:**
- Use `eval()` or `Function()` constructor
- Make network requests without user consent
- Access sensitive data unnecessarily
- Block UI with synchronous operations
- Use external dependencies (no npm packages)

### Review Process

1. **Submission** - PR created
2. **Automated Checks** - GitHub Action validates format
3. **Code Review** - Maintainer reviews functionality and security
4. **Merge** - Approved scripts are merged to main
5. **Registry Update** - Auto-generated and deployed
6. **Live** - Available in all Tagverse installations within 24h

Typical review time: 1-3 days

### Versioning

Use semantic versioning (semver):
- `1.0.0` - Initial release
- `1.0.1` - Bug fix
- `1.1.0` - New feature (backwards compatible)
- `2.0.0` - Breaking change

Update version in `manifest.json` and document changes in `CHANGELOG.md`.

## Script Development Tips

### Context Object

Your render function receives a `context` object:

```javascript
async function render(context) {
    context.app           // Obsidian App instance
    context.tag           // Tag name (without #)
    context.args          // Arguments from {key: value}
    context.element       // Container HTMLElement
    context.sourcePath    // Current note path
    context.frontmatter   // Note's frontmatter
    context.Notice        // Notice constructor
}
```

### Common Patterns

**Progress Bar:**
```javascript
const percentage = 75;
return `<div style="width: ${percentage}%; height: 8px; background: var(--interactive-accent);"></div>`;
```

**Button with Action:**
```javascript
const btn = context.element.createEl('button', { text: 'Click me' });
btn.addEventListener('click', () => {
    new context.Notice('Clicked!');
});
return btn;
```

**Query Notes:**
```javascript
const files = context.app.vault.getMarkdownFiles();
const tagged = files.filter(file => {
    const cache = context.app.metadataCache.getFileCache(file);
    return cache?.tags?.some(t => t.tag === '#' + context.tag);
});
```

### Testing

Test your script:
1. In multiple notes (different frontmatter, tags)
2. With and without arguments
3. In Reading and Live Preview modes
4. In light and dark themes
5. With slow operations (large vaults)

## Troubleshooting

**Script won't install**
- Check internet connection
- Verify script exists in registry
- Try refreshing: Settings → Tagverse → General → Clear script cache

**Script not rendering**
- Ensure tag mapping is enabled
- Check developer console (Ctrl+Shift+I) for errors
- Try reinstalling the script

**Update stuck**
- Clear cache and try again
- Uninstall and reinstall script

## Support

- 🐛 [Report bugs](https://github.com/brunoleos/tagverse-community-scripts/issues)
- 💡 [Request features](https://github.com/brunoleos/tagverse-community-scripts/discussions)
- 💬 [Community Discord](https://discord.gg/obsidianmd)

## Labels System

Scripts use labels for multi-category classification. Common labels include:

**Functionality:**
- `productivity` - Task management, workflows
- `analytics` - Statistics, metrics, dashboards
- `utilities` - Tools, helpers, formatting
- `visual` - Animations, decorations, styles
- `navigation` - Links, search, discovery
- `data` - Queries, filters, transformations

**Content Type:**
- `tasks` - Task-related features
- `notes` - Note management
- `tags` - Tag operations
- `links` - Link handling
- `frontmatter` - Metadata operations

**UI Elements:**
- `button` - Interactive buttons
- `chart` - Data visualizations
- `form` - Input elements
- `badge` - Status indicators
- `counter` - Numeric displays

Scripts can have multiple labels. Use labels to help users discover your script!

## Examples

See the [examples folder](examples/) in the main repository for working examples of various script patterns.
