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

### CodeMirror Integration

The plugin uses CodeMirror directly in live preview mode for real-time tag editing:

- **MatchDecorator**: Finds hashtag patterns using regex (`/#([a-zA-Z0-9_-]+)/g`)
- **Decoration.replace()**: Replaces matched tags with custom widgets
- **WidgetType**: Wraps rendered content for CodeMirror widget system
- **State Fields**: Monitors editor mode changes via `editorLivePreviewField`
- **Cursor Detection**: Shows native tags when cursor is inside them for editing
- **Decoration Updates**: Rebuilds on document changes, selection changes, or mode switches

Live preview requires custom CodeMirror extensions for widget integration, while reading mode uses standard Obsidian post-processing.

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

**Manual Version Increment:**
1. Edit `manifest.json` version field
2. Edit `package.json` version field
3. Update `versions.json` with minimum Obsidian version for the plugin version

**Automated Version Increment:**
```bash
npm run version  # This handles manifest.json, package.json, and versions.json
git add manifest.json versions.json
git commit -m "Bump version to x.y.z"
```

The `version-bump.mjs` script automates the version increment and version tracking. Use it instead of manual editing to ensure consistency.

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
