# Tagverse - Advanced Documentation

## Table of Contents
1. [Script Development Guide](#script-development-guide)
2. [Security Considerations](#security-considerations)
3. [Simple Examples](#simple-examples)
4. [API Reference](#api-reference)
5. [Troubleshooting](#troubleshooting)

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

## Security Considerations

### Understanding Script Execution

Tagverse executes JavaScript code from your vault to provide dynamic tag rendering. As a script developer, you should understand what your scripts can do and how to write them safely.

### Script Capabilities

Your scripts have full access to:

**Vault Operations:**
- Read any file: `context.app.vault.read(file)`
- Write to files: `context.app.vault.modify(file, content)`
- Create new files: `context.app.vault.create(path, content)`
- Delete files: `context.app.vault.delete(file)`
- List all files: `context.app.vault.getMarkdownFiles()`

**Metadata Access:**
- File metadata: `context.app.metadataCache.getFileCache(file)`
- Frontmatter: `context.frontmatter` (current note)
- Links and backlinks
- Tags and headings

**Workspace Control:**
- Open notes: `context.app.workspace.openLinkText(link, sourcePath)`
- Access active file: `context.app.workspace.getActiveFile()`
- Manipulate UI elements
- Show notifications: `new context.Notice(message)`

**Full JavaScript Runtime:**
- DOM manipulation
- Network requests (fetch, XMLHttpRequest)
- Timers (setTimeout, setInterval)
- Local storage
- All standard JavaScript APIs

### Writing Secure Scripts

**Best Practices:**

1. **Validate Input**
   ```javascript
   function render(context) {
       // Validate tag arguments
       const value = typeof context.args.value === 'number'
           ? context.args.value
           : 0;

       // Sanitize user input
       const label = String(context.args.label || '').slice(0, 100);
   }
   ```

2. **Handle Errors Gracefully**
   ```javascript
   async function render(context) {
       try {
           const file = context.app.vault.getAbstractFileByPath(somePath);
           if (!file) {
               return '<span class="error">File not found</span>';
           }
           const content = await context.app.vault.read(file);
           return processContent(content);
       } catch (error) {
           console.error('Render error:', error);
           return `<span class="error">Error: ${error.message}</span>`;
       }
   }
   ```

3. **Avoid Unnecessary File Operations**
   ```javascript
   // Bad: Reading all files every render
   async function render(context) {
       const files = context.app.vault.getMarkdownFiles();
       // Processing all files...
   }

   // Good: Cache results or limit scope
   async function render(context) {
       // Only process files in specific folder
       const files = context.app.vault.getMarkdownFiles()
           .filter(f => f.path.startsWith('specific-folder/'));
   }
   ```

4. **Use Safe DOM Manipulation**
   ```javascript
   // Good: Using textContent for user data
   element.textContent = userProvidedText;

   // Careful: innerHTML with user data (XSS risk if sharing scripts)
   element.innerHTML = sanitizedHTML; // Only if you control the content
   ```

5. **Document Your Scripts**
   ```javascript
   /**
    * Progress Bar Renderer
    *
    * Arguments:
    * - value: Current progress (0-100)
    * - label: Optional label text
    *
    * Example: #progress{value: 75, label: "Complete"}
    */
   function render(context) {
       // Implementation...
   }
   ```

### Security Model

**Trust Boundary:**
The vault is the security boundary. Scripts in your vault are treated as trusted content, just like your notes.

**What This Means:**
- Scripts from your vault are trusted and executed with full permissions
- The plugin does not sandbox or restrict script execution
- Scripts have the same capabilities as the plugin itself
- You are responsible for the scripts you add to your vault

**For Script Sharing:**
When sharing scripts with others:
- Document what the script does clearly
- Use descriptive variable and function names
- Include comments explaining complex logic
- Warn about any file modifications
- Provide example usage

**For Script Users:**
When using scripts from others:
- Review the code before adding to your vault
- Understand what the script does
- Test on non-critical data first
- Keep backups of your vault

### Common Pitfalls to Avoid

1. **Infinite Loops in Renders**
   ```javascript
   // Bad: Can freeze Obsidian
   function render(context) {
       while(true) { /* ... */ }
   }
   ```

2. **Memory Leaks**
   ```javascript
   // Bad: Event listeners not cleaned up
   setInterval(() => updateElement(), 1000); // Runs forever

   // Good: Store reference and clean up if needed
   // (Though for tag rendering, this is generally managed by Obsidian)
   ```

3. **Slow Synchronous Operations**
   ```javascript
   // Bad: Blocking operation
   function render(context) {
       // Complex computation that takes seconds
       const result = complexCalculation();
   }

   // Good: Use async or web workers for heavy computation
   async function render(context) {
       const result = await calculateAsync();
   }
   ```

### Additional Resources

For comprehensive security documentation including technical implementation details and threat model analysis, see:
- [SECURITY.md](SECURITY.md) - Full security documentation
- [README.md - Security Section](README.md#-security-considerations) - User-facing overview
- [PLUGIN_DEVELOPMENT.md](PLUGIN_DEVELOPMENT.md) - Technical architecture

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
