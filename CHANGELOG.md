# Changelog

All notable changes to the Tagverse plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- [ ] Visual script editor
- [ ] Tag preview on hover
- [ ] Performance metrics dashboard
- [ ] Export/import configurations
- [ ] Regex-based tag matching

## [1.1.0] - TBD

### Added
- **Community Scripts Marketplace**: Browse and install scripts created by the community
- One-click script installation with automatic updates
- Script submission wizard: Share your scripts via auto-generated PRs
- Label-based filtering system for script discovery (multi-label support)
- Download tracking for popular scripts
- Manual update mechanism for installed community scripts
- Community Scripts tab in settings with gallery view
- Script submission tab for easy community contributions
- Comprehensive `COMMUNITY_SCRIPTS.md` documentation

### Changed
- Settings UI now uses tabbed interface (General / Community Scripts / Submit Script)
- ScriptLoader now supports `community:` prefix for installed community scripts
- Updated README with Community Scripts section

### Technical
- New `CommunityScriptService` for marketplace functionality
- New `CommunityScriptsTab` component with search and filter UI
- New `ScriptSubmissionModal` for generating PRs
- Scripts downloaded to `.obsidian/plugins/tagverse/community-scripts/`
- Registry cached for 24 hours to minimize network requests
- Added interfaces: `CommunityScriptMetadata`, `CommunityScriptsRegistry`, `InstalledCommunityScript`, `ScriptArgument`
- Extended `TagverseSettings` with community script options

## [1.0.0] - 2025-10-28

### Added
- Initial release
- Dynamic tag rendering with custom JavaScript scripts
- Tag-script mapping configuration interface
- Script caching system for improved performance
- Auto-refresh on file changes (optional)
- Command: "Refresh dynamic tags in current note"
- Command: "Clear script cache"
- Full access to Obsidian API from render scripts
- Error handling with visual feedback
- Support for both HTMLElement and HTML string returns
- Async/await support in render functions
- Comprehensive documentation and examples
- Mobile support (iOS/Android)

### Technical Details
- Built with TypeScript
- Uses MarkdownPostProcessor API
- Implements efficient script caching
- Clean settings interface
- Minimal performance impact

---

## Version Guidelines

### Version Number Format: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

### Change Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

---

## Future Roadmap

### v1.2.0 (Next Minor Release)
- **Visual Script Builder (No-Code Mode)**: Complete form-based interface for creating scripts without coding
  - Template gallery with 6 common script types (Counter, Badge, Progress Bar, Button, List, Stats)
  - Step-by-step wizard with live preview
  - Automatic code generation from visual configs
  - Three-tier system: Templates → Visual Builder → Code Editor
  - Covers 80% of common use cases without writing JavaScript
  - See full design in Visual Script Builder documentation
- Tag preview on hover in edit mode
- Performance monitoring dashboard
- Improved error messages with actionable guidance
- Context menu integration

### v1.3.0
- Reactive/live data updates for scripts
- Scoped rendering (folder-based)
- Cross-tag communication (shared state)
- Script editor with validation
- Tag groups support

### v2.0.0 (Major Release - When Ready)
- Breaking: Enhanced context API structure
- Script sandboxing with permissions
- TypeScript support for scripts
- Advanced caching strategies
- Plugin integration hooks
