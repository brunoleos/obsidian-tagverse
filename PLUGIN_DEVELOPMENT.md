# Tagverse Plugin Development Guide

## Overview

Tagverse is an Obsidian plugin that transforms static tags into interactive, dynamic content. The plugin uses a modular architecture to render tags through custom JavaScript scripts, supporting both reading and live preview modes.

Core principles:
- **Separation of Concerns**: Rendering logic is separated by mode (reading vs live preview)
- **Service Layer**: Shared functionality is provided through injectable services
- **Extensibility**: New renderers and features can be added without modifying core code

## Architecture

The plugin consists of several layers:

- **Plugin Layer**: Main entry point (`TagversePlugin`) orchestrates all components
- **Service Layer**: Provides shared functionality (script loading, settings, tag mapping)
- **Rendering Layer**: Mode-specific renderers handle tag transformation
- **Types**: Interfaces and data structures

All components communicate through well-defined interfaces to maintain loose coupling.

### Rendering Pipeline Comparison

Understanding the different rendering pipelines is crucial for maintaining and extending Tagverse. The plugin must handle two fundamentally different approaches that Obsidian uses for rendering content.

#### Live Preview Mode Pipeline

**Input**: Raw markdown text from file  
**Obsidian Processing**: Minimal - CodeMirror renders text with decorations  
**Plugin Intervention Point**: During CodeMirror decoration phase (BEFORE DOM creation)  
**Output**: Widgets embedded directly in CodeMirror editor

```
Raw Markdown File
    ↓
CodeMirror Editor (text-based)
    ↓
MatchDecorator.regexp: /#([a-zA-Z0-9_-]+)(\{[^}]*\})?/g
    ↓ (Finds complete strings like "#progress{value:75}")
TagParser.parseTag("#progress{value:75}")
    ↓ (Extracts: tag="progress", args={value:75})
Script Execution with context.args
    ↓
WidgetType creates custom DOM
    ↓
CodeMirror displays widget inline
```

**Key Characteristics:**
- ✅ Works with **raw text** - sees complete tag strings
- ✅ **Single-pass processing** - no DOM manipulation needed
- ✅ **Real-time updates** - decorations rebuild on text changes
- ✅ **Cursor-aware** - shows native tag when cursor is inside

#### Reading Mode Pipeline

**Input**: Raw markdown file  
**Obsidian Processing**: Full markdown → HTML conversion  
**Plugin Intervention Point**: After DOM creation via `registerMarkdownPostProcessor`  
**Output**: DOM elements replacing tag links

```
Raw Markdown File
    ↓
Obsidian Markdown Parser
    ↓ (Converts "#progress{value:75}" → multiple elements)
DOM Creation:
    <a class="tag">progress</a>{value:75}
    ↓ (Tag and arguments are SPLIT into separate nodes)
Plugin MarkdownPostProcessor runs
    ↓
Tag Reconstruction:
    - tagEl.textContent = "progress"
    - nextSibling.textContent = "{value:75}"
    - Reconstruct: "#progress{value:75}"
    ↓
TagParser.parseTag("#progress{value:75}")
    ↓ (Extracts: tag="progress", args={value:75})
Script Execution with context.args
    ↓
DOM Replacement: tagEl + argsText → rendered widget
```

**Key Characteristics:**
- ⚠️ Works with **processed DOM** - must reconstruct tag strings
- ⚠️ **Post-processing** - Obsidian has already split tags and arguments
- ⚠️ **Manual cleanup** - must remove arguments text nodes
- ⚠️ **Two-phase**: detect tags, then render and replace

#### Critical Difference: Tag Arguments Handling

**The Challenge:**  
Obsidian's markdown processor treats `{value:75}` as plain text, not part of the tag. This creates different behavior in each mode.

**Live Preview Solution:**
```typescript
// CodeMirror's regex captures the complete pattern
const match = text.match(/#([a-zA-Z0-9_-]+)(\{[^}]*\})?/g);
const fullMatch = "#progress{value:75}";  // Complete string
const parsed = TagParser.parseTag(fullMatch);  // Direct parsing
```

**Reading Mode Solution:**
```typescript
// Must reconstruct from split elements
const tagName = tagEl.textContent;  // "progress"
const argsText = nextSibling.textContent;  // "{value:75}"
const fullTag = '#' + tagName + argsText;  // "#progress{value:75}"
const parsed = TagParser.parseTag(fullTag);  // Same parsing logic

// Then clean up
tagEl.replaceWith(renderedWidget);
argsTextNode.remove();  // Remove leftover arguments text
```

### CodeMirror Integration

The plugin uses CodeMirror directly in live preview mode for real-time tag editing:

- **MatchDecorator**: Finds hashtag patterns using regex (`/#([a-zA-Z0-9_-]+)(\{[^}]*\})?/g`)
- **Decoration.replace()**: Replaces matched tags with custom widgets
- **WidgetType**: Wraps rendered content for CodeMirror widget system
- **State Fields**: Monitors editor mode changes via `editorLivePreviewField`
- **Cursor Detection**: Shows native tags when cursor is inside them for editing
- **Decoration Updates**: Rebuilds on document changes, selection changes, or mode switches

Live preview requires custom CodeMirror extensions for widget integration, while reading mode uses standard Obsidian post-processing.

#### Architectural Decisions

**Why Not Pre-Process in Reading Mode?**  
Obsidian doesn't expose hooks to intercept markdown **before** its internal processing. We must work with the already-processed DOM.

**Why TagParser is Single Source of Truth?**  
Both modes converge on TagParser.parseTag() after reconstructing complete tag strings. This ensures:
- Consistent parsing logic across modes
- Single point for tag syntax changes
- Reduced maintenance burden
- Identical behavior for users

**Why Separate Renderers?**  
Despite using the same parsing logic, the rendering mechanics differ fundamentally:
- Live Preview: Widget-based, no DOM manipulation
- Reading Mode: DOM replacement with cleanup

Separating these concerns maintains clean architecture and makes each mode's logic easier to understand and test.

## Repository Structure

```
obsidian-tagverse/
├── src/                    # Source code
│   ├── core/              # Core plugin logic
│   │   ├── plugin.ts           # Main plugin class
│   │   ├── renderer.ts         # Abstract base renderer
│   │   ├── live-preview-renderer.ts
│   │   └── reading-mode-renderer.ts
│   ├── services/           # Service implementations
│   │   ├── interfaces.ts        # Service contracts
│   │   ├── script-loader.service.ts
│   │   ├── settings.service.ts
│   │   ├── tag-mapping.service.ts
│   │   └── renderer-factory.service.ts
│   ├── settings/           # Settings UI
│   │   └── settings-tab.ts
│   ├── types/             # TypeScript interfaces
│   │   └── interfaces.ts
│   └── utils/             # Utilities
│       └── logger.ts
├── examples/              # Example render scripts
├── main.ts               # Entry point
├── manifest.json         # Plugin metadata
├── styles.css            # Plugin styles
└── package.json          # Dependencies and scripts
```

## Key Files Explained

### Core Files
- **main.ts**: Plugin entry point that loads from src/
- **manifest.json**: Obsidian plugin configuration
- **package.json**: Node.js dependencies (primarily Obsidian API types)

### Architecture Files
- **src/core/plugin.ts**: Coordinates services and Obsidian integration
- **src/core/renderer.ts**: Base class handling script execution and result processing
- **src/services/interfaces.ts**: Defines service contracts that maintain compatibility

### Services
The service layer provides the plugin's core functionality:
- Script loading and caching
- Settings persistence
- Tag-to-script mapping
- Renderer instantiation

## External Dependencies

### Core Dependencies
- **Obsidian API**: Primary interface for vault access, file operations, UI interactions
- **TypeScript**: Type safety and development experience

### Observable Aspects (May Change)
Build tools, testing frameworks, and other development utilities are subject to change and not documented here as core component.

## Development Workflow

### Setup
```bash
git clone <repository>
npm install
```

### Building and Testing

#### Build Process
```bash
npm run build  # Production build
npm run dev    # Development watch mode
```

The build generates three core files required for Obsidian plugin installation.

#### Testing in Obsidian

**Manual Installation for Testing:**

1. **Copy Plugin Files**: After building, copy the three files to your test vault:
   - `main.js` → `{VaultFolder}/.obsidian/plugins/tagverse/main.js`
   - `manifest.json` → `{VaultFolder}/.obsidian/plugins/tagverse/manifest.json`
   - `styles.css` → `{VaultFolder}/.obsidian/plugins/tagverse/styles.css`

2. **Copy Example Scripts (Optional)**: To test with existing examples:
   - Copy scripts from project's `examples/` folder to `{VaultFolder}/scripts/`
   - Create the `scripts/` folder if it doesn't exist
   - Examples: tagverse-ex-dashboard.js, tagverse-ex-filter.js, etc.

3. **Create Plugin Folder**: Ensure the `tagverse` folder exists in `.obsidian/plugins/`

4. **Configure Settings**: Open Tagverse settings and add mappings for your example scripts

5. **Reload Obsidian**: Use `Ctrl+R` or close and reopen to load the plugin

6. **Test Vault**: Create a dedicated test vault with minimal plugins for isolated testing

**Development Testing Steps:**

1. **Make Code Changes**: Edit files in `src/` directory
2. **Build**: Run `npm run build` to compile TypeScript
3. **Copy Plugin Files**: Copy the three files to test vault
4. **Reload**: Use Obsidian's reload command or restart
5. **Test Features**: Verify in both reading and live preview modes
6. **Check Console**: Monitor for errors in Obsidian's developer tools

### Development Focus Areas
Core development focuses on:
1. Adding new services in `src/services/`
2. Implementing new renderers in `src/core/`
3. Updating interfaces in `src/types/`
4. Testing changes in Obsidian

## Adding New Features

### Service Creation
1. Define interface in `src/services/interfaces.ts`
2. Implement service in dedicated file
3. Register in `TagversePlugin.initializeServices()`
4. Inject into renderers via constructor

### Renderer Creation
1. Extend `TagRenderer` base class
2. Implement `getMode()` and `render()` methods
3. Register with Obsidian in plugin initialization
4. Add factory method if needed

### Tag Processing Flow
1. Plugin detects tag elements in content
2. Matches against configured mappings
3. Instantiates appropriate renderer
4. Executes user script with context
5. Processes and displays result

## Core Invariants

The following aspects are fundamental to the plugin's design and unlikely to change:

- Tag elements are replaced with script results
- Scripts run in restricted context with app access
- Service injection provides modularity
- Both reading and live preview modes are supported
- Scripts are cached to improve performance
- Settings control tag mappings and behavior

## Security and Breaking Changes

### Security Improvements (Breaking Change)

**Version 1.x introduces important security improvements** that affect how scripts return content:

#### String Return Values (BREAKING CHANGE)

##### Previous Behavior (Pre-1.x)

```javascript
// Scripts could return HTML strings that were rendered directly
function render(context) {
    return '<div class="custom"><b>Bold text</b></div>';  // HTML rendered
}
```

##### New Behavior (1.x+)

```javascript
// HTML strings are now rendered as plain text (not parsed as HTML)
function render(context) {
    return '<div class="custom"><b>Bold text</b></div>';  // Displays as plain text
}
```

##### Why This Change

Using `innerHTML` to render arbitrary HTML strings poses a security risk. While the scripts are user-controlled, following Obsidian's security guidelines requires using safer DOM manipulation methods.

#### Migration Guide

##### Option 1: Return HTMLElement (Recommended)

```javascript
function render(context) {
    // Create elements using DOM API
    const container = context.element.createEl('div', { cls: 'custom' });
    container.createEl('b', { text: 'Bold text' });
    return container;
}
```

##### Option 2: Use Obsidian Helper Functions

```javascript
function render(context) {
    const container = createDiv({ cls: 'custom' });
    container.createEl('b', { text: 'Bold text' });
    return container;
}
```

##### Option 3: Build Complex DOM

```javascript
function render(context) {
    const container = context.element;

    // Add multiple elements
    const title = container.createEl('h3', { text: 'Dashboard' });
    const list = container.createEl('ul');

    ['Item 1', 'Item 2', 'Item 3'].forEach(item => {
        list.createEl('li', { text: item });
    });

    return container;
}
```

#### Available DOM Creation Methods

##### Obsidian Helper Functions

- `createDiv(attrs)` - Create a div element
- `createSpan(attrs)` - Create a span element
- `createEl(tag, attrs)` - Create any element

##### Context Element Methods

- `context.element.createEl(tag, attrs)` - Create and append child element
- `context.element.createDiv(attrs)` - Create and append div
- `context.element.createSpan(attrs)` - Create and append span

##### Standard DOM API

```javascript
const el = document.createElement('div');
el.className = 'custom-class';
el.textContent = 'Safe text content';
```

#### Script Security Model

Scripts execute with full plugin privileges and have access to:

- Complete Obsidian API via `context.app`
- Vault read/write operations
- File system access (within vault)
- All Obsidian UI components

**Important Security Notes:**

1. Only use scripts from trusted sources (your own vault)
2. Scripts from untrusted sources should not be added to your vault
3. The plugin does not sandbox or restrict script execution
4. Scripts have the same access level as the plugin itself

See [src/services/script-loader.service.ts](src/services/script-loader.service.ts) for detailed security model documentation.

### Type Safety Improvements

Version 1.x also includes improved TypeScript types throughout the codebase:

- `any` types replaced with `Record<string, unknown>` or `unknown` where appropriate
- Proper interfaces for internal CodeMirror access
- Better type safety for frontmatter and arguments
- More precise return types for script execution

These changes improve code quality and maintainability without affecting runtime behavior.

## Publishing to Obsidian Community

### Release Process

#### Pre-Release Preparation
1. **Update Documentation**: Ensure README.md, CHANGELOG.md are current
2. **Version Bump**: Run `npm run version` to update versions using semantic versioning
3. **Final Testing**: Test in clean vault with no other plugins enabled

#### Build and Package
1. **Build Production**: Run `npm run build` to generate optimized `main.js`
2. **Verify Build Output**: Ensure `main.js`, `manifest.json`, `styles.css` are present in root
3. **Create Release Archive**: Zip the three required files together

#### Repository Submission
1. **Open Pull Request**: Submit to `obsidianmd/obsidian-releases` repository
2. **Check Template**: Follow the PR template with description, screenshots if applicable
3. **Link Documentation**: Include link to plugin repository for full docs
4. **Version History**: Update `versions.json` with compatibility info

### Version Management

#### Semantic Versioning
Plugin versions follow semantic versioning (`major.minor.patch`):

- **Major (Breaking)**: Changes that break backward compatibility
- **Minor (New Features)**: New features that are backward compatible
- **Patch (Fixes)**: Bug fixes and minor improvements

Examples:
- `1.0.0` → `1.1.0` for new features
- `1.1.0` → `1.1.1` for bug fixes
- `1.1.0` → `2.0.0` for breaking changes

#### Version Increment Process

**Automated Version Increment (Recommended):**

Use npm's built-in version commands to automatically update all version files and create a git commit:

```bash
# For bug fixes (1.0.0 → 1.0.1):
npm version patch

# For new features (1.0.0 → 1.1.0):
npm version minor

# For breaking changes (1.0.0 → 2.0.0):
npm version major
```

**What happens automatically:**
1. npm updates the version in `package.json`
2. The `version-bump.mjs` script runs and updates `manifest.json` and `versions.json`
3. npm stages all changes and creates a git commit with the version number
4. npm creates a git tag for the release

**After versioning:**
```bash
# Push commits and tags to remote:
git push && git push --tags
```

**Manual Version Increment (Not Recommended):**

If you need to manually update versions:
1. Edit `package.json` version field
2. Run `npm run version` to sync `manifest.json` and `versions.json`
3. Commit the changes manually

The automated approach is preferred as it ensures consistency and proper git tagging.

### Best Practices

#### Plugin Metadata
- **Clear Description**: Include compelling description in manifest.json
- **Author Information**: Provide accurate author name and URL
- **Version Accuracy**: For version numbers: major.minor.patch
- **Minimum Version**: Set appropriate minAppVersion based on API usage

#### Documentation Requirements
- **Community Listing**: Provide concise README.snippet for community store
- **User Documentation**: Include setup instructions and examples
- **Changelog**: Document what changed in each version

#### Quality Standards
- **Error Handling**: Ensure graceful fallbacks and error messages
- **Performance**: Avoid resource-intensive operations
- **Security**: Scripts run in user context - provide clear warnings
- **Cross-platform**: Test on major operating systems

#### Community Guidelines
- **Open Licensing**: Use open source license (MIT preferred)
- **Active Maintenance**: Respond to issues and PRs
- **Feature Requests**: Use issues for feature discussions
- **Backwards Compatibility**: Avoid breaking changes in minor versions

### File Requirements for Release
- `main.js`: Built plugin code (production build only)
- `manifest.json`: Plugin metadata with accurate version and dependencies
- `styles.css`: Plugin styles (minify for production)

### Version Compatibility
- Test with Obsidian versions declared in your package dependencies
- Specify minimum supported version in manifest.json
- For breaking changes, update minimum version requirement
- Maintain versions.json for historical compatibility tracking

## Contributing

When contributing:
- Maintain interface contracts
- Add services for new functionality
- Do not modify core rendering interfaces
- Test in both reading and live preview modes
- Keep service layer focused on shared logic
