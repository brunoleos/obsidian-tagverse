# Changelog

All notable changes to the Dynamic Tag Renderer plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- [ ] Script library browser
- [ ] Visual script editor
- [ ] Tag preview on hover
- [ ] Performance metrics dashboard
- [ ] Export/import configurations

## [1.0.0] - 2024-XX-XX

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

### v1.1.0 (Next Minor Release)
- Script template library
- Improved error messages
- Performance monitoring
- Context menu integration

### v1.2.0
- Visual script builder
- Tag groups support
- Conditional rendering rules
- Script testing framework

### v2.0.0 (Major Release - When Ready)
- Breaking: New context API structure
- Plugin marketplace integration
- Advanced caching strategies
- Real-time collaboration features