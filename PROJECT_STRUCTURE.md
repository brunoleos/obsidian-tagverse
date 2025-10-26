# Tagverse - Project Structure

## Complete File Structure

```
obsidian-tagverse/
│
├── 📄 main.ts                      # Main entry point (imports from src/)
├── 📄 manifest.json                # Plugin metadata
├── 📄 package.json                 # NPM dependencies & scripts
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 esbuild.config.mjs           # Build configuration
├── 📄 version-bump.mjs             # Version management script
├── 📄 versions.json                # Version compatibility tracking
├── 📄 styles.css                   # Plugin styles
├── 📄 .gitignore                   # Git ignore rules
├── 📄 LICENSE                      # MIT License
│
├── 📖 README.md                    # Main documentation
├── 📖 QUICKSTART.md                # Quick start guide for users
├── 📖 DOCUMENTATION.md             # Advanced documentation
├── 📖 PUBLISHING.md                # Guide for publishing
├── 📖 CHANGELOG.md                 # Version history
├── 📖 PROJECT_STRUCTURE.md         # This file
│
├── 📁 src/                         # Modular source code
│   ├── 📄 index.ts                 # Main exports
│   ├── 📁 types/
│   │   └── 📄 interfaces.ts         # TypeScript interfaces and types
│   ├── 📁 core/
│   │   ├── 📄 plugin.ts             # Main plugin class (TagversePlugin)
│   │   ├── 📄 renderer.ts           # Abstract TagRenderer base class
│   │   ├── 📄 reading-mode-renderer.ts   # Reading mode renderer
│   │   └── 📄 live-preview-renderer.ts   # Live preview renderer & widget
│   ├── 📁 settings/
│   │   └── 📄 settings-tab.ts       # Settings UI (TagverseSettingTab)
│   ├── 📁 utils/
│   │   └── 📄 logger.ts             # Logger utility
│   └── 📁 constants/
│       └── 📄 index.ts             # Constants and configuration
│
├── 📄 logger.ts                    # Legacy logger (superseded by src/utils/logger.ts)
├── 📁 examples/
│   └── 📄 example-script.js        # Example render scripts
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 release.yml          # Auto-release workflow
│
└── 📁 dist/                        # Build output (git-ignored)
    ├── main.js                     # Compiled plugin
    └── main.js.map                 # Source map (dev only)
```

## Core Files Explained

### Source Files

#### `main.ts`
Entry point that imports and exports from the modular `src/` structure.

#### `src/index.ts`
Main exports file that re-exports all public components from the modular structure.

#### `src/types/interfaces.ts`
All TypeScript interfaces and types:
- `TagScriptMapping`: Configuration for tag-script mappings
- `ScriptContext`: Context object passed to render scripts
- `TagverseSettings`: Plugin settings interface
- `DEFAULT_SETTINGS`: Default configuration values

#### `src/core/plugin.ts`
Main plugin class (`TagversePlugin`):
- `onload()`: Initialize plugin
- `onunload()`: Cleanup
- `processMarkdown()`: Intercept and transform tags
- `renderDynamicTag()`: Execute render scripts
- `loadScript()`: Load and cache scripts
- `refreshActiveView()`: Force re-render
- Live preview processing with CodeMirror integration

#### `src/core/renderer.ts`
Abstract base class (`TagRenderer`) for tag rendering:
- Provides common interface for both rendering modes
- Handles script execution and result processing
- Manages error handling and loading states
- Enforces consistent behavior across renderers

#### `src/core/reading-mode-renderer.ts`
Reading mode renderer (`ReadingModeRenderer`):
- Extends TagRenderer for static reading view
- Direct DOM element replacement
- Optimized for non-interactive content display

#### `src/core/live-preview-renderer.ts`
Live preview renderer and widget:
- `LivePreviewRenderer`: Extends TagRenderer for live editing
- `TagverseWidget`: CodeMirror WidgetType wrapper
- Handles dynamic content in editable context
- Manages loading states and cursor detection
- Integrates with CodeMirror decoration system

#### `src/settings/settings-tab.ts`
Settings UI (`TagverseSettingTab`):
- Tag-script mappings management
- Add/edit/delete mappings
- Enable/disable individual mappings
- General plugin configuration

#### `src/utils/logger.ts`
Logger utility class with configurable logging levels and convenience methods for plugin debugging and monitoring.

#### `src/constants/index.ts`
Constants and configuration values for the plugin.

#### `logger.ts` (root level)
Existing logger utility with comprehensive logging methods for debugging and monitoring.

**Key Technologies**:
- TypeScript for type safety with modular architecture
- Obsidian API for vault access and plugin integration
- CodeMirror integration for live preview editing
- MarkdownPostProcessor for tag interception
- Function constructor for dynamic script execution

#### `manifest.json`
Plugin metadata for Obsidian:
```json
{
  "id": "unique-plugin-id",
  "name": "Display Name",
  "version": "semver",
  "minAppVersion": "minimum Obsidian version",
  "description": "Short description",
  "author": "brunoleos",
  "authorUrl": "Your website/GitHub",
  "isDesktopOnly": false
}
```

#### `styles.css`
Visual styling for:
- `.tagverse-widget-container`: Rendered tag container
- `.tagverse-error`: Error display
- `.dynamic-tag-mapping`: Settings UI items

### Configuration Files

#### `package.json`
NPM configuration with:
- Dependencies: Obsidian API, TypeScript, esbuild
- Scripts:
  - `dev`: Development build with watch mode
  - `build`: Production build
  - `version`: Bump version numbers

#### `tsconfig.json`
TypeScript compiler options:
- Target: ES6
- Module: ESNext
- Strict mode enabled
- Source maps for debugging

#### `esbuild.config.mjs`
Build system configuration:
- Bundle TypeScript to single JavaScript file
- External dependencies (Obsidian API)
- Sourcemap generation
- Watch mode for development

#### `version-bump.mjs`
Automates version management:
- Reads version from package.json
- Updates manifest.json
- Updates versions.json
- Runs on `npm run version`

#### `versions.json`
Tracks Obsidian compatibility:
```json
{
  "1.0.0": "0.15.0",  // Plugin version: Min Obsidian version
  "1.1.0": "0.15.0"
}
```

### Documentation Files

#### `README.md`
Main documentation covering:
- Features overview
- Installation instructions
- Basic usage
- Example scripts
- Commands
- Contributing guidelines

#### `QUICKSTART.md`
User-friendly getting started guide:
- Simple explanations
- Step-by-step instructions
- Common use cases
- Troubleshooting basics

#### `DOCUMENTATION.md`
Advanced documentation:
- Architecture details
- Script development guide
- Complex examples
- API reference
- Performance optimization
- Best practices

#### `PUBLISHING.md`
Developer guide for:
- Preparing repository
- Building plugin
- Creating releases
- Submitting to community plugins
- Maintenance procedures

#### `CHANGELOG.md`
Version history:
- All changes per version
- Release dates
- Breaking changes
- New features and fixes

### Automation

#### `.github/workflows/release.yml`
GitHub Actions workflow:
- Triggers on git tags
- Builds plugin automatically
- Creates GitHub releases
- Attaches build artifacts

### Build Output

#### `main.js` (generated)
The final bundled plugin:
- Transpiled TypeScript → JavaScript
- All dependencies bundled
- Minified for production
- This file is loaded by Obsidian

#### `main.js.map` (generated, dev only)
Source map for debugging:
- Maps compiled code back to source
- Only in development builds
- Helps debug in browser DevTools

## Development Workflow

### 1. Initial Setup
```bash
git clone <repo>
cd obsidian-tagverse
npm install
```

### 2. Development
```bash
npm run dev  # Starts watch mode
# Edit files in src/ directory
# Changes auto-compile to main.js
# Copy to test vault and reload Obsidian
```

### 3. Testing
```bash
# Copy to test vault
cp main.js manifest.json styles.css ~/Vault/.obsidian/plugins/tagverse/
# Reload Obsidian (Ctrl+R)
# Test features
```

### 4. Release Preparation
```bash
# Update version
npm run version

# Commit changes
git add .
git commit -m "Bump version to x.y.z"

# Create tag
git tag -a x.
