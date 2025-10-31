# Tagverse Plugin - Implementation Roadmap

**Last Updated:** 2025-10-30
**Total Estimated Effort:** ~115 hours (8-9 weeks)
**Overall Progress:** 0/12 features completed

---

## How to Use This Document

1. **Starting a Feature:** Mark status as `🟡 IN PROGRESS` and add start date
2. **Completing a Feature:** Mark status as `✅ COMPLETED`, add completion date, and note any deviations from plan
3. **Blocking Issues:** Mark status as `🔴 BLOCKED` and document the blocker
4. **Skipping a Feature:** Mark status as `⏭️ SKIPPED` and document why

When starting a new session with Claude, share this file so I can understand:
- Which features are complete
- What's currently in progress
- Any issues or deviations encountered
- What to work on next

---

## Phase 1: Developer Experience & Polish (Weeks 1-2)

### ⬜ Feature 12: Hot Reload ⚡
**Status:** `⬜ NOT STARTED` | **Priority:** HIGH | **Risk:** LOW
**Estimated Effort:** 6 hours
**Started:** _____
**Completed:** _____

#### Description
Auto-reload scripts when .js files change, eliminating the need to manually clear cache and refresh.

#### Implementation Checklist
- [ ] Add vault file watcher in [src/core/plugin.ts](src/core/plugin.ts)
  - [ ] Register `vault.on('modify')` listener for `.js` files in `onload()`
  - [ ] Filter events to only script files used in mappings
- [ ] Extend [src/services/script-loader.service.ts](src/services/script-loader.service.ts)
  - [ ] Add `invalidateScript(path: string)` method
  - [ ] Add `isMappedScript(path: string)` helper
- [ ] Implement refresh logic
  - [ ] Clear script from cache on file modify
  - [ ] Dispatch state effect to refresh affected widgets
  - [ ] Count affected tag instances in current view
- [ ] Add user notifications
  - [ ] Show Notice: "Reloaded N tagverses in current note"
  - [ ] Add setting to enable/disable auto-reload
- [ ] Testing
  - [ ] Test with community scripts (`community:*` prefix)
  - [ ] Test with vault scripts (relative paths)
  - [ ] Test with non-mapped scripts (should ignore)
  - [ ] Test performance with many rapid changes

#### Files to Modify
- `src/core/plugin.ts` - Add file watcher and refresh orchestration
- `src/services/script-loader.service.ts` - Add invalidation method
- `src/types/interfaces.ts` - Add `autoReload` setting (optional)

#### Success Criteria
- [ ] Editing a script file triggers immediate re-render in open notes
- [ ] No manual cache clearing needed
- [ ] Performance impact negligible (<50ms delay)
- [ ] Works with both vault and community scripts

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 14: Loading States 🎨
**Status:** `⬜ NOT STARTED` | **Priority:** HIGH | **Risk:** LOW
**Estimated Effort:** 7 hours
**Started:** _____
**Completed:** _____

#### Description
Replace simple "Loading..." text with skeleton loaders, progress indicators, and error retry UI.

#### Implementation Checklist
- [ ] Create skeleton component
  - [ ] Create [src/components/loading-skeleton.ts](src/components/loading-skeleton.ts)
  - [ ] Export `createSkeleton(type: 'card' | 'list' | 'text'): HTMLElement`
  - [ ] Make theme-aware (respects light/dark mode)
- [ ] Add CSS animations
  - [ ] Add skeleton styles to [styles.css](styles.css)
  - [ ] Use `@keyframes shimmer` for pulse effect
  - [ ] Use CSS variables for theme colors
- [ ] Modify base renderer
  - [ ] Update [src/core/renderer.ts](src/core/renderer.ts)
  - [ ] Add `renderStartTime` tracking
  - [ ] Add `setLoadingState(type: 'skeleton' | 'text' | null)`
  - [ ] Show skeleton if render takes >200ms
- [ ] Enhance error UI
  - [ ] Create error component with "Retry" button
  - [ ] Add "Copy Error" button for debugging
  - [ ] Style errors with theme-aware colors
- [ ] Update renderers
  - [ ] Modify [src/core/live-preview-renderer.ts](src/core/live-preview-renderer.ts)
  - [ ] Modify [src/core/reading-mode-renderer.ts](src/core/reading-mode-renderer.ts)
  - [ ] Use skeleton during async render
  - [ ] Add `data-tagverse-loading` attribute for CSS hooks

#### Files to Create/Modify
- **NEW:** `src/components/loading-skeleton.ts`
- **MODIFY:** `src/core/renderer.ts`
- **MODIFY:** `src/core/live-preview-renderer.ts`
- **MODIFY:** `src/core/reading-mode-renderer.ts`
- **MODIFY:** `styles.css`

#### Success Criteria
- [ ] Skeleton appears for renders >200ms
- [ ] Smooth transition from skeleton to content
- [ ] Error UI includes retry functionality
- [ ] Works in both light and dark themes
- [ ] No layout shift during loading

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 15: Settings UX Improvements 🎛️
**Status:** `⬜ NOT STARTED` | **Priority:** MEDIUM | **Risk:** LOW
**Estimated Effort:** 7 hours
**Started:** _____
**Completed:** _____

#### Description
Improve settings tab with validation, testing, duplication, and import/export functionality.

#### Implementation Checklist
- [ ] Script validation
  - [ ] Add `validateScript(path)` to [src/services/script-loader.service.ts](src/services/script-loader.service.ts)
  - [ ] Check if file exists, is readable, and has valid syntax
  - [ ] Return validation result with error details
- [ ] Update settings UI in [src/settings/settings-tab.ts](src/settings/settings-tab.ts)
  - [ ] Add red border + warning icon for invalid scripts
  - [ ] Add "Fix" button that opens file picker to correct path
  - [ ] Validate on load and on script path change
- [ ] Add "Test" button per mapping
  - [ ] Create test modal that renders tag with sample args
  - [ ] Show rendered output or error message
  - [ ] Allow editing test args in modal
- [ ] Add "Duplicate" button per mapping
  - [ ] Add duplicate icon next to delete button
  - [ ] Clone mapping with "(copy)" suffix on tag name
  - [ ] Auto-scroll to new mapping
- [ ] Add import/export functionality
  - [ ] Add "Export Mappings" button → downloads JSON file
  - [ ] Add "Import Mappings" button → file picker → merge or replace
  - [ ] Add validation for imported JSON structure
  - [ ] Show preview before confirming import
- [ ] Add search/filter to script dropdown
  - [ ] Convert dropdown to filterable suggest modal
  - [ ] Show file path hints for disambiguation
  - [ ] Add "Browse" button to open file picker

#### Files to Modify
- `src/settings/settings-tab.ts` - Main settings UI
- `src/services/script-loader.service.ts` - Add validation
- `styles.css` - Add validation styling

#### Success Criteria
- [ ] Invalid scripts highlighted immediately
- [ ] Test button works and shows clear results
- [ ] Duplicate creates functional copy
- [ ] Export/import preserves all mapping data
- [ ] Search filter responsive (<100ms)

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

## Phase 2: Core UX Features (Weeks 3-4)

### ⬜ Feature 4: Tag Arguments Auto-Complete 💡
**Status:** `⬜ NOT STARTED` | **Priority:** HIGH | **Risk:** MEDIUM
**Estimated Effort:** 10 hours
**Started:** _____
**Completed:** _____

#### Description
Show autocomplete suggestions when typing `#tag{` with available argument names from JSDoc or metadata.

#### Implementation Checklist
- [ ] Extend community script metadata
  - [ ] Use existing `arguments` field in [src/types/interfaces.ts](src/types/interfaces.ts)
  - [ ] Ensure `CommunityScriptMetadata.arguments` is populated
- [ ] Parse JSDoc from vault scripts
  - [ ] Create [src/utils/jsdoc-parser.ts](src/utils/jsdoc-parser.ts)
  - [ ] Extract `@param` tags from script comments
  - [ ] Parse parameter names, types, and descriptions
  - [ ] Cache parsed metadata with script
- [ ] Create autocomplete extension
  - [ ] Create [src/core/autocomplete-extension.ts](src/core/autocomplete-extension.ts)
  - [ ] Use CodeMirror `autocompletion()` API
  - [ ] Trigger on `#tagname{` pattern
  - [ ] Filter suggestions based on tag name
- [ ] Build suggestion UI
  - [ ] Show arg name, type, and description
  - [ ] Insert arg with proper syntax: `name: `
  - [ ] Support multiple args with comma separation
  - [ ] Show "No args defined" if no metadata
- [ ] Register extension
  - [ ] Modify [src/core/plugin.ts](src/core/plugin.ts)
  - [ ] Add autocomplete to CodeMirror extensions array
  - [ ] Ensure proper precedence (after tag matching)

#### Files to Create/Modify
- **NEW:** `src/core/autocomplete-extension.ts`
- **NEW:** `src/utils/jsdoc-parser.ts`
- **MODIFY:** `src/core/plugin.ts`
- **MODIFY:** `src/types/interfaces.ts` (ensure `arguments` field is used)

#### Success Criteria
- [ ] Autocomplete triggers on `{` after tag
- [ ] Shows relevant args for current tag
- [ ] Inserts proper syntax on selection
- [ ] Works for both community and vault scripts
- [ ] Performance <50ms for suggestion display

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 6: Scoped Rendering 📁
**Status:** `⬜ NOT STARTED` | **Priority:** HIGH | **Risk:** MEDIUM
**Estimated Effort:** 8 hours
**Started:** _____
**Completed:** _____

#### Description
Allow different scripts for the same tag based on file location using glob patterns.

#### Implementation Checklist
- [ ] Extend data model
  - [ ] Add `scope?: string` to `TagScriptMapping` in [src/types/interfaces.ts](src/types/interfaces.ts)
  - [ ] Make scope optional for backwards compatibility
  - [ ] Scope format: glob pattern like "/Work/**" or "Projects/Active/*.md"
- [ ] Update tag mapping service
  - [ ] Modify [src/services/tag-mapping.service.ts](src/services/tag-mapping.service.ts)
  - [ ] Change `getMapping(tag)` to `getMapping(tag, sourcePath)`
  - [ ] Match most specific scope first (longest path wins)
  - [ ] Use minimatch or similar for glob matching
  - [ ] Fallback to no-scope mapping if no match
- [ ] Update call sites
  - [ ] Modify [src/services/tag-matching.service.ts](src/services/tag-matching.service.ts)
  - [ ] Pass `sourcePath` to `getMapping()`
  - [ ] Update reading mode and live preview renderers
- [ ] Add UI for scope configuration
  - [ ] Modify [src/settings/settings-tab.ts](src/settings/settings-tab.ts)
  - [ ] Add folder suggester dropdown for scope field
  - [ ] Show scope pattern in mapping row
  - [ ] Add "Browse Folders" button
  - [ ] Show scope indicator (icon or text) in mapping list
- [ ] Handle conflicts
  - [ ] Warn if multiple scopes could match same path
  - [ ] Show scope resolution order in UI
  - [ ] Add debug logging for scope matching

#### Files to Modify
- `src/types/interfaces.ts` - Add scope field
- `src/services/tag-mapping.service.ts` - Add scope matching logic
- `src/services/tag-matching.service.ts` - Pass sourcePath
- `src/settings/settings-tab.ts` - Add scope UI
- `src/core/live-preview-renderer.ts` - Pass sourcePath
- `src/core/reading-mode-renderer.ts` - Pass sourcePath

#### Success Criteria
- [ ] Same tag renders differently in different folders
- [ ] Most specific scope takes precedence
- [ ] Global mappings (no scope) work as fallback
- [ ] UI clearly shows scope configuration
- [ ] Performance impact <10ms per lookup

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 13: Tag Preview on Hover 👁️
**Status:** `⬜ NOT STARTED` | **Priority:** MEDIUM | **Risk:** LOW
**Estimated Effort:** 5 hours
**Started:** _____
**Completed:** _____

#### Description
Show rendered preview in tooltip when hovering over tags in edit mode.

#### Implementation Checklist
- [ ] Create hover extension
  - [ ] Create [src/core/hover-preview-extension.ts](src/core/hover-preview-extension.ts)
  - [ ] Use CodeMirror `hoverTooltip()` API
  - [ ] Detect hover over `#tag` or `#tag{args}` pattern
- [ ] Implement preview rendering
  - [ ] Reuse existing renderer infrastructure
  - [ ] Create lightweight preview mode (optional cheap render)
  - [ ] Cache previews by tag+args+sourcePath
  - [ ] Throttle expensive renders (debounce hover)
- [ ] Build tooltip UI
  - [ ] Show rendered content in tooltip container
  - [ ] Add loading state for async renders
  - [ ] Add error state with message
  - [ ] Style tooltip with theme-aware CSS
- [ ] Add settings
  - [ ] Add `previewMode` setting: "full" | "cheap" | "off"
  - [ ] Add `previewDelay` setting (default 300ms)
  - [ ] Add setting to enable/disable preview
- [ ] Register extension
  - [ ] Modify [src/core/plugin.ts](src/core/plugin.ts)
  - [ ] Add hover extension to CodeMirror extensions
  - [ ] Conditionally register based on setting

#### Files to Create/Modify
- **NEW:** `src/core/hover-preview-extension.ts`
- **MODIFY:** `src/core/plugin.ts`
- **MODIFY:** `src/types/interfaces.ts` - Add preview settings
- **MODIFY:** `styles.css` - Add tooltip styles

#### Success Criteria
- [ ] Hover shows preview after delay
- [ ] Preview cached for subsequent hovers
- [ ] Works in edit mode only (not live preview)
- [ ] Respects performance throttling
- [ ] Can be disabled in settings

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

## Phase 3: Advanced Features (Weeks 5-7)

### ⬜ Feature 5: Reactive/Live Data Updates 🔄
**Status:** `⬜ NOT STARTED` | **Priority:** HIGH | **Risk:** HIGH
**Estimated Effort:** 12 hours
**Started:** _____
**Completed:** _____

#### Description
Allow scripts to watch vault events and re-render automatically when relevant data changes.

#### Implementation Checklist
- [ ] Create reactive state service
  - [ ] Create [src/services/reactive-state.service.ts](src/services/reactive-state.service.ts)
  - [ ] Implement event subscription system
  - [ ] Track which tags subscribe to which events
  - [ ] Implement debouncing (default 500ms)
- [ ] Extend context API
  - [ ] Modify [src/types/interfaces.ts](src/types/interfaces.ts)
  - [ ] Add `watchVault(events, callback)` to ScriptContext
  - [ ] Add `onUpdate(callback)` helper
  - [ ] Add `unwatch()` for cleanup
- [ ] Implement vault watching
  - [ ] Register vault event listeners in [src/core/plugin.ts](src/core/plugin.ts)
  - [ ] Support events: 'create', 'modify', 'delete', 'rename'
  - [ ] Filter events by file path patterns (optional)
  - [ ] Notify subscribed renderers
- [ ] Update renderer base class
  - [ ] Modify [src/core/renderer.ts](src/core/renderer.ts)
  - [ ] Add `update()` method for re-rendering
  - [ ] Track active subscriptions
  - [ ] Auto-cleanup on widget destruction
- [ ] Handle performance
  - [ ] Implement debouncing per tag instance
  - [ ] Limit concurrent re-renders
  - [ ] Add opt-in flag (scripts must explicitly watch)
  - [ ] Log performance warnings for slow re-renders
- [ ] Add settings
  - [ ] Add `enableReactiveUpdates` global toggle
  - [ ] Add `reactiveDebounceMs` setting
  - [ ] Add debug mode to log update events

#### Files to Create/Modify
- **NEW:** `src/services/reactive-state.service.ts`
- **MODIFY:** `src/types/interfaces.ts` - Add watchVault to ScriptContext
- **MODIFY:** `src/core/renderer.ts` - Add update() method
- **MODIFY:** `src/core/plugin.ts` - Register vault listeners
- **MODIFY:** `src/core/live-preview-renderer.ts` - Support updates
- **MODIFY:** `src/core/reading-mode-renderer.ts` - Support updates

#### Success Criteria
- [ ] Scripts can watch vault events
- [ ] Re-renders triggered automatically on events
- [ ] Debouncing prevents excessive updates
- [ ] No memory leaks (subscriptions cleaned up)
- [ ] Performance impact <100ms per update

#### Potential Issues / Mitigations
```
- Memory leaks if subscriptions not cleaned up → Use WeakMap, auto-cleanup on unmount
- Performance degradation with many watchers → Limit concurrent updates, use debouncing
- Race conditions in re-render → Queue updates, use async locks
```

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 7: Cross-Tag Communication 📡
**Status:** `⬜ NOT STARTED` | **Priority:** MEDIUM | **Risk:** HIGH
**Estimated Effort:** 10 hours
**Started:** _____
**Completed:** _____

#### Description
Enable tags to communicate via shared state and event bus for sophisticated multi-tag UIs.

#### Implementation Checklist
- [ ] Create event bus service
  - [ ] Create [src/services/event-bus.service.ts](src/services/event-bus.service.ts)
  - [ ] Implement `on(event, handler)`, `emit(event, data)`, `off(event, handler)`
  - [ ] Namespace events: `tagverse:${tagName}:${eventName}`
  - [ ] Track handlers for cleanup
- [ ] Implement global state
  - [ ] Add `Map<string, any>` for shared state
  - [ ] Add `getGlobalState(key)`, `setGlobalState(key, value)`
  - [ ] Add optional TTL for state entries
  - [ ] Persist state across re-renders (same note session)
- [ ] Extend context API
  - [ ] Modify [src/types/interfaces.ts](src/types/interfaces.ts)
  - [ ] Add `emit(event, data)` to ScriptContext
  - [ ] Add `on(event, handler)` to ScriptContext
  - [ ] Add `globalState.get(key)` and `globalState.set(key, value)`
- [ ] Update renderer base class
  - [ ] Modify [src/core/renderer.ts](src/core/renderer.ts)
  - [ ] Inject event bus into context
  - [ ] Track event listeners per renderer
  - [ ] Auto-cleanup listeners on widget destruction
- [ ] Handle cleanup
  - [ ] Clear state when note closes
  - [ ] Remove listeners when widgets unmount
  - [ ] Add debug logging for event flow
- [ ] Add safety features
  - [ ] Limit event payload size (prevent memory issues)
  - [ ] Throttle high-frequency events
  - [ ] Add error boundaries for handler failures

#### Files to Create/Modify
- **NEW:** `src/services/event-bus.service.ts`
- **MODIFY:** `src/types/interfaces.ts` - Add eventBus to ScriptContext
- **MODIFY:** `src/core/renderer.ts` - Inject event bus, track listeners
- **MODIFY:** `src/core/plugin.ts` - Initialize event bus service

#### Success Criteria
- [ ] Tags can emit and listen to events
- [ ] Global state shared across tags in same note
- [ ] No memory leaks (listeners cleaned up)
- [ ] Event handlers errors don't crash other tags
- [ ] Performance <50ms for event propagation

#### Potential Issues / Mitigations
```
- Memory leaks from listeners → Auto-cleanup on unmount, use WeakMap
- Infinite event loops → Add cycle detection, limit event depth
- State conflicts → Namespace state by tag, document best practices
```

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 8: Script Sandboxing/Permissions 🛡️
**Status:** `⬜ NOT STARTED` | **Priority:** CRITICAL | **Risk:** HIGH
**Estimated Effort:** 18 hours
**Started:** _____
**Completed:** _____

#### Description
Add permission model and sandboxed execution to protect users from malicious or buggy scripts.

#### Implementation Checklist
- [ ] Define permission model
  - [ ] Create permission types: 'read-vault', 'write-vault', 'network', 'clipboard', 'commands'
  - [ ] Add `permissions?: string[]` to script metadata
  - [ ] Add `requiredPermissions?: string[]` to `CommunityScriptMetadata`
- [ ] Create permissions service
  - [ ] Create [src/services/permissions.service.ts](src/services/permissions.service.ts)
  - [ ] Track granted permissions per script
  - [ ] Show permission dialog on first run
  - [ ] Persist granted permissions in settings
- [ ] Create sandboxed API
  - [ ] Create [src/api/sandboxed-api.ts](src/api/sandboxed-api.ts)
  - [ ] Proxy Obsidian API based on permissions
  - [ ] Block dangerous methods (e.g., `app.vault.delete` without permission)
  - [ ] Provide safe alternatives for common tasks
- [ ] Implement sandbox execution
  - [ ] Option 1: Use iframe with limited context (more secure)
  - [ ] Option 2: Proxy API and use strict Function() (easier)
  - [ ] Option 3: Use Web Worker (most secure, but complex)
  - [ ] **Decision needed:** Choose execution model
- [ ] Update script loader
  - [ ] Modify [src/services/script-loader.service.ts](src/services/script-loader.service.ts)
  - [ ] Check permissions before executing
  - [ ] Use sandboxed execution if not fully trusted
  - [ ] Provide sandboxed context instead of full app
- [ ] Add "Safe Mode" setting
  - [ ] Global toggle: "Run scripts in safe mode"
  - [ ] Read-only API when enabled
  - [ ] No write, network, or command access
  - [ ] Show indicator in UI when safe mode active
- [ ] Add code signing (future)
  - [ ] Verify community script signatures
  - [ ] Trust verified authors
  - [ ] Warn on unsigned scripts

#### Files to Create/Modify
- **NEW:** `src/services/permissions.service.ts`
- **NEW:** `src/services/sandbox.service.ts`
- **NEW:** `src/api/sandboxed-api.ts`
- **MODIFY:** `src/services/script-loader.service.ts` - Use sandbox
- **MODIFY:** `src/types/interfaces.ts` - Add permissions to metadata
- **MODIFY:** `src/settings/settings-tab.ts` - Add safe mode toggle
- **MODIFY:** `src/settings/community-scripts-tab.ts` - Show permissions in install modal

#### Success Criteria
- [ ] Permission dialog shows on first script run
- [ ] Scripts blocked if permissions not granted
- [ ] Safe mode restricts all dangerous operations
- [ ] No way to bypass permission checks
- [ ] Performance impact <100ms

#### Potential Issues / Mitigations
```
- Sandboxing breaks existing scripts → Provide migration guide, auto-grant permissions to existing scripts
- iframe sandbox too restrictive → Use proxy pattern instead, document limitations
- Performance overhead → Cache proxied APIs, optimize checks
```

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

## Phase 4: Power User Features (Weeks 8-9)

### ⬜ Feature 16: Smart Tags 🏷️
**Status:** `⬜ NOT STARTED` | **Priority:** MEDIUM | **Risk:** MEDIUM
**Estimated Effort:** 9 hours
**Started:** _____
**Completed:** _____

#### Description
Support advanced tag patterns: regex matching, colon subtypes, @mentions, and [[link|#tag]] combos.

#### Implementation Checklist
- [ ] Extend tag pattern support
  - [ ] Modify [src/constants/index.ts](src/constants/index.ts)
  - [ ] Add regex pattern support: `#task-PROJ-\d+`
  - [ ] Add colon subtype: `#chart:pie` → tag="chart", subtype="pie"
  - [ ] Add @mention support: `@username` (optional)
- [ ] Create tag router service
  - [ ] Create [src/services/tag-router.service.ts](src/services/tag-router.service.ts)
  - [ ] Match tags against pattern mappings
  - [ ] Extract capture groups from regex
  - [ ] Pass captured values to script as args
- [ ] Extend data model
  - [ ] Add `pattern?: string` to `TagScriptMapping` in [src/types/interfaces.ts](src/types/interfaces.ts)
  - [ ] Support both exact match and pattern in same config
  - [ ] Validate regex patterns on save
- [ ] Update tag mapping service
  - [ ] Modify [src/services/tag-mapping.service.ts](src/services/tag-mapping.service.ts)
  - [ ] Try exact match first
  - [ ] Fall back to pattern matching
  - [ ] Return best match + captured groups
- [ ] Update renderers
  - [ ] Pass captured groups to script context
  - [ ] Handle subtype as special arg
  - [ ] Update documentation with examples
- [ ] Add UI for pattern configuration
  - [ ] Modify [src/settings/settings-tab.ts](src/settings/settings-tab.ts)
  - [ ] Add "Pattern" toggle per mapping
  - [ ] Show regex input when pattern mode enabled
  - [ ] Validate regex on input
  - [ ] Show pattern match examples

#### Files to Create/Modify
- **NEW:** `src/services/tag-router.service.ts`
- **MODIFY:** `src/types/interfaces.ts` - Add pattern field
- **MODIFY:** `src/services/tag-mapping.service.ts` - Add pattern matching
- **MODIFY:** `src/constants/index.ts` - Add new tag patterns
- **MODIFY:** `src/settings/settings-tab.ts` - Add pattern UI

#### Success Criteria
- [ ] Regex patterns match correctly
- [ ] Captured groups passed to scripts
- [ ] Colon subtypes work
- [ ] Fallback chain: exact → pattern → none
- [ ] Performance <20ms for pattern matching

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 17: Template Interpolation 📝
**Status:** `⬜ NOT STARTED` | **Priority:** LOW | **Risk:** LOW
**Estimated Effort:** 6 hours
**Started:** _____
**Completed:** _____

#### Description
Simple template syntax for common use cases without full JavaScript.

#### Implementation Checklist
- [ ] Create template engine
  - [ ] Create [src/utils/template-engine.ts](src/utils/template-engine.ts)
  - [ ] Support mustache syntax: `{{variable}}`
  - [ ] Support helpers: `{{format date}}`, `{{sum values}}`
  - [ ] Support conditionals: `{{#if condition}}...{{/if}}`
- [ ] Add auto-injected variables
  - [ ] `{{count}}` - file count in vault
  - [ ] `{{words}}` - word count in current note
  - [ ] `{{files}}` - all vault files
  - [ ] `{{tags}}` - all tags in vault
  - [ ] `{{frontmatter.KEY}}` - frontmatter access
- [ ] Integrate with renderer
  - [ ] Modify [src/core/renderer.ts](src/core/renderer.ts)
  - [ ] Check if `args.template` exists
  - [ ] If template mode, skip script execution
  - [ ] Use template engine instead
  - [ ] Pass computed variables to template
- [ ] Add documentation
  - [ ] Create template syntax guide
  - [ ] Provide examples for common patterns
  - [ ] Show template in autocomplete

#### Files to Create/Modify
- **NEW:** `src/utils/template-engine.ts`
- **MODIFY:** `src/core/renderer.ts` - Add template processing
- **MODIFY:** `src/types/interfaces.ts` - Add template mode flag

#### Success Criteria
- [ ] Templates render without JavaScript
- [ ] Variables computed automatically
- [ ] Helpers work correctly
- [ ] Performance <50ms for simple templates
- [ ] Clear error messages for invalid syntax

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

### ⬜ Feature 18: Plugin Integration Hooks 🔌
**Status:** `⬜ NOT STARTED` | **Priority:** MEDIUM | **Risk:** MEDIUM
**Estimated Effort:** 10 hours
**Started:** _____
**Completed:** _____

#### Description
Make Tagverse middleware for other plugins with integration API and built-in helpers.

#### Implementation Checklist
- [ ] Design public API
  - [ ] Create [src/api/plugin-api.ts](src/api/plugin-api.ts)
  - [ ] Expose `registerIntegration(name, handler)`
  - [ ] Expose `registerTransform(pluginId, transformer)`
  - [ ] Document API for third-party developers
- [ ] Create integration registry
  - [ ] Create [src/services/integration-registry.service.ts](src/services/integration-registry.service.ts)
  - [ ] Track registered integrations
  - [ ] Provide lookup by plugin ID
  - [ ] Handle plugin load order issues
- [ ] Build common integrations
  - [ ] Add Dataview helper: `#dataview{query: "..."}`
  - [ ] Add Tasks helper: `#tasks{filter: "..."}`
  - [ ] Add Kanban helper: `#kanban{board: "..."}`
  - [ ] Document integration API
- [ ] Implement middleware pattern
  - [ ] Allow transforming results from other plugins
  - [ ] Chain transformers
  - [ ] Pass context through pipeline
- [ ] Expose public API
  - [ ] Modify [src/core/plugin.ts](src/core/plugin.ts)
  - [ ] Add `app.plugins.plugins.tagverse` public API
  - [ ] Version the API for stability
  - [ ] Add compatibility checks
- [ ] Add error handling
  - [ ] Gracefully handle missing plugins
  - [ ] Show helpful error if plugin not installed
  - [ ] Provide fallback rendering

#### Files to Create/Modify
- **NEW:** `src/api/plugin-api.ts`
- **NEW:** `src/services/integration-registry.service.ts`
- **NEW:** `src/integrations/dataview.ts` (example)
- **MODIFY:** `src/core/plugin.ts` - Expose public API

#### Success Criteria
- [ ] Other plugins can register integrations
- [ ] Built-in helpers work (Dataview, Tasks)
- [ ] API documented for developers
- [ ] Handles missing plugins gracefully
- [ ] No breaking changes in future versions

#### Notes / Deviations
```
(Document any issues, changes to approach, or learnings here)
```

---

## Progress Tracking

### Features by Status
- **⬜ Not Started:** 12
- **🟡 In Progress:** 0
- **✅ Completed:** 0
- **🔴 Blocked:** 0
- **⏭️ Skipped:** 0

### Phase Progress
- **Phase 1 (DX & Polish):** 0/3 features (0%)
- **Phase 2 (Core UX):** 0/3 features (0%)
- **Phase 3 (Advanced):** 0/3 features (0%)
- **Phase 4 (Power User):** 0/3 features (0%)

---

## Decision Log

### Decisions Made
_(Document key architectural or implementation decisions here)_

1. **[Date]:** Decision about X
   - **Context:** Why this decision was needed
   - **Decision:** What was chosen
   - **Rationale:** Why this was the best choice
   - **Alternatives Considered:** What else was evaluated

---

## Known Issues & Technical Debt

_(Document issues discovered during implementation that need future attention)_

- **Issue:** Description
  - **Impact:** How this affects users/developers
  - **Workaround:** Temporary solution
  - **Resolution Plan:** How to properly fix

---

## Lessons Learned

_(Document insights gained during implementation that could help future features)_

- **Lesson:** What was learned
  - **Context:** When this was discovered
  - **Impact:** How this affects future work
  - **Action:** What to do differently next time

---

## Next Steps

When starting a new session:
1. Share this document with Claude
2. Mention which feature you want to work on
3. Claude will review completed features and start the next one
4. Update the status and checkboxes as you progress

**Current Recommendation:** Start with **Phase 1, Feature 12: Hot Reload** - High impact, low risk, and improves the development workflow immediately.