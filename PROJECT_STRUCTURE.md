# Dynamic Tag Renderer - Project Structure

## Complete File Structure

```
obsidian-dynamic-tag-renderer/
│
├── 📄 main.ts                      # Main plugin source code
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
The heart of the plugin. Contains:
- **DynamicTagRendererPlugin**: Main plugin class
  - `onload()`: Initialize plugin
  - `onunload()`: Cleanup
  - `processMarkdown()`: Intercept and transform tags
  - `renderDynamicTag()`: Execute render scripts
  - `loadScript()`: Load and cache scripts
  - `refreshActiveView()`: Force re-render
- **DynamicTagRendererSettingTab**: Settings UI
  - Tag-script mappings management
  - Add/edit/delete mappings
  - Enable/disable individual mappings
- **Interfaces**: TypeScript type definitions

**Key Technologies**:
- TypeScript for type safety
- Obsidian API for vault access
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
  "author": "Your name",
  "authorUrl": "Your website/GitHub",
  "isDesktopOnly": false
}
```

#### `styles.css`
Visual styling for:
- `.dynamic-tag-container`: Rendered tag container
- `.dynamic-tag-error`: Error display
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
cd obsidian-dynamic-tag-renderer
npm install
```

### 2. Development
```bash
npm run dev  # Starts watch mode
# Edit main.ts
# Changes auto-compile to main.js
# Copy to test vault and reload Obsidian
```

### 3. Testing
```bash
# Copy to test vault
cp main.js manifest.json styles.css ~/Vault/.obsidian/plugins/dynamic-tag-renderer/
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