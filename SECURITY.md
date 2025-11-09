# Security Documentation

## Overview

Tagverse is an Obsidian plugin that executes custom JavaScript code to render dynamic content for hashtags. This document provides comprehensive information about the plugin's security model, technical implementation decisions, and user responsibilities.

## Security Model

### Trust Boundary

The security boundary for Tagverse is **the vault itself**. This means:

- Scripts are loaded exclusively from files within the user's Obsidian vault
- No external code is fetched or executed
- Scripts are treated as trusted content, similar to notes and other vault files
- Users have full control over which scripts exist in their vault

### Threat Model

**In Scope:**
- Protecting against accidental misconfiguration
- Clear documentation of script capabilities
- Preventing unintended script execution from untrusted vaults

**Out of Scope:**
- Sandboxing user scripts from Obsidian API
- Protecting against malicious vault content (if the vault is compromised, all content including notes is at risk)
- Network-level attacks (scripts run with same permissions as the plugin)

**Assumption:** Users trust the content of their own vault. If an attacker has write access to the vault, they can already:
- Modify sensitive notes and documents
- Change plugin settings
- Add or modify scripts
- Access any data stored in the vault

## Technical Implementation: Function Constructor

### Why We Use `new Function()`

Tagverse uses JavaScript's `Function` constructor to dynamically load and execute user scripts. While this is flagged by many security tools as equivalent to `eval()`, it is the correct technical choice for this plugin. Here's why:

### Required Capabilities

User scripts need the following capabilities that cannot be achieved through safer alternatives:

1. **Async/Await Support**
   - Scripts must `await` vault file operations (`app.vault.read()`)
   - Scripts must `await` metadata operations
   - Must support async rendering workflows

2. **Context Injection**
   - Scripts receive a `context` object containing:
     - `app` - Full Obsidian App instance
     - `tag` - The hashtag being rendered
     - `args` - Arguments from tag syntax (e.g., `#tag{value: 75}`)
     - `element` - Pre-created HTMLElement container
     - `sourcePath` - Path of the current note
     - `frontmatter` - Note's frontmatter metadata
     - `Notice` - Obsidian Notice constructor

3. **Full Obsidian API Access**
   - Read/write vault files
   - Query metadata cache
   - Open notes and search
   - Manipulate workspace
   - Access plugins

4. **DOM Manipulation**
   - Create and modify elements
   - Attach event listeners
   - Apply dynamic styling
   - Run animations

5. **Module-Level Variables**
   - Define helper functions outside `render()`
   - Use closures and state
   - Standard JavaScript patterns

### Alternatives Evaluated and Rejected

Extensive research was conducted to find safer alternatives. Each approach was rejected for specific technical reasons:

#### 1. Dynamic `import()` with Data/Blob URLs

```javascript
// Would look like:
const blob = new Blob([scriptContent], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
const module = await import(url);
```

**Why it doesn't work:**
- ❌ Blocked by Electron's security policies for blob/data URL imports
- ❌ Requires scripts to be ES6 modules with `export` syntax (breaking change)
- ❌ Cannot inject context variables into module scope
- ❌ Module scripts run in strict mode with different scoping rules
- ❌ Would break all 19+ existing example scripts
- ❌ Performance overhead of creating/revoking blob URLs
- ❌ No security benefit in this use case (still executing user code)

#### 2. AsyncFunction Constructor

```javascript
// Would look like:
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const scriptFunction = new AsyncFunction('context', scriptContent);
```

**Why it doesn't work:**
- ❌ Identical security profile to `Function()` constructor
- ❌ Would require rewriting all user scripts (breaking change)
- ❌ Current pattern allows module-level helper functions; this doesn't
- ❌ No actual security improvement
- ❌ Scripts would need to be pure function bodies without `render()` wrapper

#### 3. Web Workers

```javascript
// Would look like:
const worker = new Worker('script.js');
worker.postMessage(context);
```

**Why it doesn't work:**
- ❌ Workers run in separate thread with no DOM access
- ❌ Cannot manipulate `context.element` or create UI
- ❌ No access to Obsidian API (different global scope)
- ❌ Requires complex message passing for every operation
- ❌ Scripts need synchronous DOM manipulation
- ❌ Fundamental architectural mismatch

#### 4. iframe Sandboxing

```javascript
// Would look like:
const iframe = document.createElement('iframe');
iframe.sandbox = 'allow-scripts';
// Execute script inside iframe
```

**Why it doesn't work:**
- ❌ Sandboxed iframes cannot access parent context
- ❌ No access to Obsidian App instance
- ❌ Cannot read vault files or metadata
- ❌ Defeats the entire purpose of the plugin
- ❌ Significant complexity for no benefit

#### 5. VM/Sandboxed Execution

```javascript
// Would look like:
const vm = require('vm');
const sandbox = { context, console, ... };
vm.runInNewContext(scriptContent, sandbox);
```

**Why it doesn't work:**
- ❌ Would need to whitelist every Obsidian API method
- ❌ Users want full vault read/write access
- ❌ Users want full workspace control
- ❌ Defeats the plugin's value proposition
- ❌ Massive complexity with no security benefit (vault is already trusted)
- ❌ Performance overhead

### Why Function Constructor is Appropriate

Given the above analysis, `new Function()` is the correct choice because:

✅ **Enables Required Functionality**
- Supports async/await natively
- Allows context injection
- Provides full API access
- Works with existing script patterns

✅ **Matches Security Model**
- Vault is the trust boundary
- Scripts are part of trusted vault content
- Additional sandboxing provides no benefit

✅ **Proven Pattern**
- Consistent with other Obsidian plugins (Templater, Custom JS, Dataview)
- Well-understood behavior
- Stable and reliable

✅ **User Experience**
- Simple script authoring
- No complex module syntax required
- Compatible with 19+ existing examples

## Comparison with Similar Plugins

### Templater Plugin
- Uses `new Function()` and `eval()`
- Executes user-defined templates
- No sandboxing
- Same trust model (vault content)

### Dataview Plugin
- Had CVE-2021-42057 for evaluating untrusted markdown from external sources
- Key difference: Dataview evaluated content from potentially shared/untrusted notes
- Tagverse only executes scripts from explicit script files in the vault

### Custom JS Plugin
- Explicitly designed for arbitrary JavaScript execution
- Loads JS files from vault
- Same security model

### RunJS Plugin
- Allows running arbitrary JavaScript code
- User-initiated execution
- No sandboxing

**Tagverse's approach is consistent with established Obsidian plugin patterns.**

## User Responsibilities

### What Users Should Know

When using Tagverse, users should understand:

1. **Scripts Have Full Access**
   - Can read any file in the vault
   - Can write/modify vault files
   - Can access note metadata
   - Can open notes and search
   - Can show notifications
   - Can access the full Obsidian API

2. **Trust is Required**
   - Only add scripts you trust
   - Review scripts before use
   - Be cautious with scripts from external sources
   - Understand that scripts run with your full vault permissions

3. **Vault is the Security Boundary**
   - If someone has write access to your vault, they can add malicious scripts
   - This is no different from them modifying your notes
   - Protect your vault using system-level security (file permissions, encryption)

### Best Practices

**For Script Users:**
- ✅ Review script code before adding to vault
- ✅ Use scripts from trusted sources
- ✅ Keep backups of your vault
- ✅ Use Obsidian's built-in sync or another backup solution
- ✅ Test scripts on non-critical data first

**For Script Developers:**
- ✅ Document what your script does
- ✅ Use clear variable names
- ✅ Handle errors gracefully
- ✅ Avoid unnecessary file operations
- ✅ Provide example usage
- ✅ Follow JavaScript best practices

**What to Avoid:**
- ❌ Copying untrusted scripts without review
- ❌ Running scripts from unknown sources
- ❌ Giving vault access to untrusted users
- ❌ Disabling sync/backup while experimenting with scripts

## Security Reporting

### Reporting Security Issues

If you discover a security vulnerability in Tagverse, please report it by:

1. **Do Not** open a public GitHub issue
2. Email the maintainer directly (see package.json for contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What Constitutes a Security Issue

**Valid security concerns:**
- Scripts executing from outside the vault
- Unintended code execution without user configuration
- Privilege escalation beyond plugin permissions
- Data exfiltration to external services without user knowledge

**Not security issues (by design):**
- Scripts having full Obsidian API access (intended functionality)
- Scripts being able to read/write vault files (core feature)
- Use of `Function` constructor (necessary for implementation)
- Scripts running without per-execution confirmation (would make plugin unusable)

## Technical Documentation

### For Plugin Reviewers

If you're reviewing this plugin for the Obsidian community plugin directory:

1. **Function Constructor Usage is Intentional**
   - See `src/services/script-loader.service.ts` lines 5-57 for detailed justification
   - Alternatives were evaluated and documented
   - Pattern is consistent with similar approved plugins

2. **Security Model is Appropriate**
   - Vault is the correct trust boundary for Obsidian plugins
   - Users have full control over script content
   - Clear documentation of capabilities and risks

3. **ESLint Warning is Acknowledged**
   - `eslint-disable-next-line no-new-func` comment added
   - Decision was made after thorough analysis
   - See this document for comprehensive research

### Code References

**Primary Implementation:**
- `src/services/script-loader.service.ts` - Script loading with security documentation
- `src/core/renderer.ts` - Script execution in rendering context

**Documentation:**
- `SECURITY.md` (this file) - Comprehensive security documentation
- `README.md` - User-facing security warnings
- `DOCUMENTATION.md` - Script development security considerations
- `PLUGIN_DEVELOPMENT.md` - Technical architecture and security model

## Version History

### 1.0.3 (Current)
- Enhanced security documentation across all files
- Added comprehensive SECURITY.md
- Documented alternatives analysis
- Added code-level justification comments

### 1.0.2
- Fixed innerHTML security issues (migrated to textContent)
- Improved security model documentation
- Added user warnings

### Earlier Versions
- Initial implementation of script execution
- Basic security model established

## Conclusion

Tagverse's use of the Function constructor for dynamic script execution is:

1. **Technically necessary** for the plugin's functionality
2. **Security appropriate** given the trust model and use case
3. **Well-documented** with clear user warnings
4. **Consistent** with other approved Obsidian plugins
5. **Thoroughly researched** with alternatives properly evaluated

The security model correctly identifies the vault as the trust boundary and does not attempt to sandbox user content from itself, which would be both futile and counterproductive for this plugin's purpose.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-09
**Related:** README.md, DOCUMENTATION.md, PLUGIN_DEVELOPMENT.md
