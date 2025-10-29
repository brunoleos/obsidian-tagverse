# Tagverse v1.0.0 - Initial Release

**Date:** October 28, 2025

## Overview

Tagverse is a powerful Obsidian plugin that enables dynamic tag rendering using custom JavaScript scripts. This initial release brings comprehensive functionality for creating interactive and dynamic content within your notes.

## New Features

- **Dynamic Tag Rendering:** Render tags using custom JavaScript scripts for maximum flexibility
- **Tag-Script Mapping Interface:** Easily configure which scripts run for which tags through a clean settings UI
- **Script Caching System:** Improved performance through intelligent script caching
- **Auto-Refresh Capability:** Optional automatic refresh when files change (configurable)
- **Core Commands:**
  - "Refresh dynamic tags in current note" - Manual refresh for current content
  - "Clear script cache" - Reset for updated scripts
- **Full Obsidian API Access:** Scripts can access the complete Obsidian API for rich integrations
- **Robust Error Handling:** Visual feedback for script errors and issues
- **Flexible Return Types:** Support for both HTMLElement and HTML string returns from scripts
- **Async/Await Support:** Modern JavaScript asynchronous operations in render functions
- **Extensive Documentation:** Comprehensive guides and examples included
- **Cross-Platform Mobile Support:** Works on iOS and Android devices

## Technical Specifications

- **Language:** Built with TypeScript for type safety and reliability
- **API Integration:** Uses Obsidian's MarkdownPostProcessor API
- **Performance Optimizations:** Efficient script caching with minimal memory footprint
- **User Interface:** Clean, intuitive settings interface
- **Impact:** Designed for minimal performance overhead

## Installation

1. Download the release files (main.js, manifest.json, styles.css)
2. Place in your `.obsidian/plugins/tagverse/` directory
3. Enable in Obsidian Community Plugins settings

## Usage

See the included documentation and examples for complete setup and usage instructions.

---

For breaking changes, known issues, and future plans, see the full [CHANGELOG.md](CHANGELOG.md).
