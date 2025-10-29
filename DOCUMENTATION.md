# Tagverse - Advanced Documentation

## Table of Contents
1. [Script Development Guide](#script-development-guide)
2. [Simple Examples](#simple-examples)
3. [API Reference](#api-reference)
4. [Troubleshooting](#troubleshooting)

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
    args: object,          // Arguments passed to the tag (NEW!)
    element: HTMLElement,  // Pre-created container
    sourcePath: string,    // Current note path
    frontmatter: object,   // Note's frontmatter
    Notice: Notice         // Obsidian Notice constructor
}
```

### Tag Arguments (NEW!)

Tags now support JavaScript/JSON-style arguments for dynamic customization.

**Syntax:** `#tagname{key: value, key2: value2}`

**Supported Types:**
- Strings: `{color: "red"}` or `{color: 'red'}`
- Numbers: `{value: 75, max: 100}`
- Booleans: `{enabled: true}`
- Arrays: `{items: [1, 2, 3]}`
- Objects: `{config: {x: 10, y: 20}}`

**Examples:**

```markdown
#progress{value: 75, max: 100, color: "blue"}
#button{action: "create-note", label: "New Note"}
#chart{type: "pie", data: [10, 20, 30], legend: true}
```

**Accessing Arguments in Scripts:**

```javascript
function render(context) {
    // Simple access with defaults
    const value = context.args.value || 0;
    const color = context.args.color || "green";
    
    // Destructuring with defaults
    const { value = 0, max = 100, label = "" } = context.args;
    
    // Check if arguments exist
    if (Object.keys(context.args).length === 0) {
        // No arguments provided
    }
    
    return `<span style="color: ${color}">${value}/${max}</span>`;
}
```

**Backward Compatibility:**
- Tags without arguments work seamlessly
- `context.args` will be an empty object `{}`
- Existing scripts continue to work without modification

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

## Simple Examples

Here are three simple examples to get you started:

### Button Click
```javascript
function render(context) {
    const button = context.element.createEl('button');
    button.textContent = `Click #${context.tag}!`;
    button.addEventListener('click', () => {
        new context.Notice(`Hello from #${context.tag}!`);
    });
    return button;
}
```

### Tag Counter
```javascript
async function render(context) {
    const files = context.app.vault.getMarkdownFiles();
    let count = 0;
    for (const file of files) {
        const cache = context.app.metadataCache.getFileCache(file);
        if (cache?.tags?.some(t => t.tag === '#' + context.tag)) count++;
    }
    return `<strong>#${context.tag}</strong> (${count} notes)`;
}
```

### Search Link
```javascript
function render(context) {
    const link = context.element.createEl('a');
    link.textContent = `🔍 Search #${context.tag}`;
    link.addEventListener('click', (e) => {
        e.preventDefault();
        context.app.internalPlugins.getPluginById('global-search')
            .instance.openGlobalSearch(`tag:#${context.tag}`);
    });
    return link;
}
```

For more complex examples including interactive dashboards, filters, and progress trackers, see the `examples/` folder.

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
new context.Notice(message)
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
2. Optimize your render functions
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
