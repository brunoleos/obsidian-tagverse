# Complete Guide: Developing and Publishing Your Obsidian Plugin

This is your complete step-by-step guide from initial setup to publishing on the Obsidian Community Plugins directory.

## Part 1: Development Environment Setup

### Prerequisites

Before you start, ensure you have:

- [ ] **Node.js** installed (v16 or higher) - [Download here](https://nodejs.org/)
- [ ] **Git** installed - [Download here](https://git-scm.com/)
- [ ] **Visual Studio Code** (recommended) - [Download here](https://code.visualstudio.com/)
- [ ] **Obsidian** installed - [Download here](https://obsidian.md/)
- [ ] A **GitHub account** - [Sign up here](https://github.com/)
- [ ] A test vault in Obsidian (create a separate vault for testing)

### Understanding the Development Process

**Important**: Plugin development happens **outside Obsidian** using VS Code (or any code editor). Here's the workflow:

```
1. Write code in VS Code (main.ts) 
   ↓
2. Build with npm (creates main.js)
   ↓
3. Copy files to test vault's plugin folder
   ↓
4. Reload Obsidian to test
   ↓
5. Repeat
```

**You do NOT develop inside Obsidian.** Obsidian is only used for testing the compiled plugin.

---

## Part 2: Initial Project Setup

### Step 1: Create Project Directory

```bash
# Create and navigate to your project folder
mkdir obsidian-dynamic-tag-renderer
cd obsidian-dynamic-tag-renderer
```

### Step 2: Initialize Git Repository

```bash
git init
git branch -M main
```

### Step 3: Create All Project Files

Create the following files in your project folder. You can do this in VS Code or your preferred editor:

**File Structure to Create:**
```
obsidian-dynamic-tag-renderer/
├── main.ts
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── version-bump.mjs
├── versions.json
├── styles.css
├── .gitignore
├── LICENSE
├── README.md
├── QUICKSTART.md
├── DOCUMENTATION.md
├── CHANGELOG.md
└── examples/
    └── example-script.js
```

**Copy the content I provided for each file into these files.**

### Step 4: Initialize npm and Install Dependencies

```bash
# Install dependencies
npm install

# This will create node_modules/ folder and package-lock.json
```

### Step 5: Update Your Information

Edit these files with your details:

**`manifest.json`:**
```json
{
    "id": "dynamic-tag-renderer",
    "name": "Dynamic Tag Renderer",
    "version": "1.0.0",
    "minAppVersion": "0.15.0",
    "description": "Dynamically render tags with custom JavaScript scripts",
    "author": "YOUR NAME HERE",  // ← Change this
    "authorUrl": "https://github.com/YOUR-USERNAME",  // ← Change this
    "fundingUrl": "https://github.com/sponsors/YOUR-USERNAME",  // ← Optional
    "isDesktopOnly": false
}
```

**`package.json`:**
```json
{
    "name": "obsidian-dynamic-tag-renderer",
    "version": "1.0.0",
    "description": "Dynamically render tags with custom JavaScript scripts",
    "author": "YOUR NAME HERE",  // ← Change this
    "license": "MIT",
    // ... rest stays the same
}
```

**`LICENSE`:**
Replace `[Your Name]` with your actual name.

**All README files:**
Replace `YOUR-USERNAME` with your GitHub username in any links.

---

## Part 3: Development Workflow

### Step 1: Open Project in VS Code

```bash
# Open VS Code from project directory
code .
```

### Step 2: Build the Plugin

#### Option A: Development Build (with watch mode)

```bash
npm run dev
```

This will:
- Compile `main.ts` → `main.js`
- Watch for changes (auto-rebuilds when you save)
- Include source maps for debugging
- Keep running until you stop it (Ctrl+C)

**Keep this terminal running while developing!**

#### Option B: Production Build (one-time)

```bash
npm run build
```

This creates an optimized `main.js` without source maps.

### Step 3: Set Up Test Vault

1. **Create a test vault in Obsidian** (or use existing one)
2. **Locate the plugins folder:**
   - Windows: `C:\Users\YourName\Documents\YourVault\.obsidian\plugins\`
   - Mac: `/Users/YourName/Documents/YourVault/.obsidian/plugins/`
   - Linux: `/home/YourName/Documents/YourVault/.obsidian/plugins/`

3. **Create plugin folder:**
   ```bash
   mkdir -p /path/to/vault/.obsidian/plugins/dynamic-tag-renderer
   ```

4. **Copy files to plugin folder:**
   ```bash
   # From your project directory, copy these files:
   cp main.js /path/to/vault/.obsidian/plugins/dynamic-tag-renderer/
   cp manifest.json /path/to/vault/.obsidian/plugins/dynamic-tag-renderer/
   cp styles.css /path/to/vault/.obsidian/plugins/dynamic-tag-renderer/
   ```

### Step 4: Enable Plugin in Obsidian

1. Open your test vault in Obsidian
2. Go to **Settings** → **Community plugins**
3. Make sure **Restricted Mode** is OFF
4. Find "Dynamic Tag Renderer" in the list
5. Click the toggle to enable it

### Step 5: Development Cycle

Now you're ready to develop! The cycle is:

1. **Edit code in VS Code** (`main.ts`)
2. **Save the file** (auto-builds if `npm run dev` is running)
3. **Copy `main.js` to plugin folder**
   ```bash
   cp main.js /path/to/vault/.obsidian/plugins/dynamic-tag-renderer/
   ```
4. **Reload Obsidian** (Ctrl+R / Cmd+R)
5. **Test your changes**
6. **Check for errors** (Ctrl+Shift+I for DevTools Console)
7. **Repeat**

**Pro Tip:** Create a script to automate copying:

**`copy-to-vault.sh` (Mac/Linux):**
```bash
#!/bin/bash
cp main.js ~/Documents/MyTestVault/.obsidian/plugins/dynamic-tag-renderer/
echo "Plugin copied! Reload Obsidian."
```

**`copy-to-vault.bat` (Windows):**
```batch
@echo off
copy main.js "C:\Users\YourName\Documents\MyTestVault\.obsidian\plugins\dynamic-tag-renderer\"
echo Plugin copied! Reload Obsidian.
```

Make it executable and run:
```bash
chmod +x copy-to-vault.sh  # Mac/Linux only
./copy-to-vault.sh         # Mac/Linux
copy-to-vault.bat          # Windows
```

### Step 6: Debugging

**To see console logs and errors:**

1. In Obsidian, press **Ctrl+Shift+I** (Cmd+Option+I on Mac)
2. Go to the **Console** tab
3. Look for errors or your `console.log()` messages

**In your code, you can use:**
```typescript
console.log('Debug info:', someVariable);
console.error('Error occurred:', error);
```

### Step 7: Testing Best Practices

Create test notes in your vault to test different scenarios:

**Test Note 1: Basic Tags**
```markdown
# Test Basic Rendering

Testing #test tag rendering.
Also testing #project and #idea tags.
```

**Test Note 2: Multiple Tags**
```markdown
# Test Multiple

#project #work #important #todo
```

**Test Note 3: In Different Contexts**
```markdown
# In Heading #test

In paragraph #test with text.

- In list #test
- [ ] In task #test
```

---

## Part 4: Prepare for Publishing

### Step 1: Final Testing

Before publishing, thoroughly test:

- [ ] All tag mappings work
- [ ] Settings save correctly
- [ ] Commands work
- [ ] No console errors
- [ ] Works in different notes
- [ ] Works with many tags
- [ ] Error handling works (test with invalid script)
- [ ] Disable/enable plugin works
- [ ] Works after Obsidian restart

### Step 2: Clean Up Code

```bash
# Run production build
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Step 3: Update Version (if needed)

```bash
# This updates manifest.json and versions.json
npm version patch  # for bug fixes (1.0.0 → 1.0.1)
npm version minor  # for new features (1.0.0 → 1.1.0)
npm version major  # for breaking changes (1.0.0 → 2.0.0)
```

Or manually edit:
- `manifest.json` → `"version": "1.0.0"`
- `package.json` → `"version": "1.0.0"`
- `versions.json` → Add entry `"1.0.0": "0.15.0"`

### Step 4: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `obsidian-dynamic-tag-renderer`
3. Description: "Dynamically render Obsidian tags with custom JavaScript"
4. Make it **PUBLIC** (required for community plugins)
5. **Don't** initialize with README (you already have one)
6. Click "Create repository"

### Step 5: Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/obsidian-dynamic-tag-renderer.git

# Push
git push -u origin main
```

### Step 6: Create First Release

#### Create Git Tag

```bash
git tag -a 1.0.0 -m "Initial release"
git push origin 1.0.0
```

#### Create GitHub Release

1. Go to your repository on GitHub
2. Click **Releases** → **Create a new release**
3. Click **Choose a tag** → Select `1.0.0`
4. Release title: `1.0.0 - Initial Release`
5. Description:

```markdown
# Dynamic Tag Renderer v1.0.0

Initial release! 🎉

## Features
- ✨ Dynamically render tags with custom JavaScript
- ⚙️ Flexible tag-script mapping configuration
- 🔄 Auto-refresh on file changes
- 💾 Script caching for performance
- 🎨 Full access to Obsidian API

## Installation

Download the files below and place them in:
`VaultFolder/.obsidian/plugins/dynamic-tag-renderer/`

Then reload Obsidian and enable the plugin.

## Quick Start

See the [README](https://github.com/YOUR-USERNAME/obsidian-dynamic-tag-renderer) for usage instructions.
```

6. **Upload these files** (from your project folder):
   - `main.js`
   - `manifest.json`
   - `styles.css`

7. Click **Publish release**

---

## Part 5: Submit to Community Plugins

### Step 1: Fork obsidian-releases

1. Go to https://github.com/obsidianmd/obsidian-releases
2. Click **Fork** (top right)
3. This creates a copy in your GitHub account

### Step 2: Clone Your Fork

```bash
# Clone your fork (replace YOUR-USERNAME)
git clone https://github.com/YOUR-USERNAME/obsidian-releases.git
cd obsidian-releases
```

### Step 3: Create New Branch

```bash
git checkout -b add-dynamic-tag-renderer
```

### Step 4: Edit community-plugins.json

Open `community-plugins.json` in your editor and add your plugin **in alphabetical order**:

```json
{
  "id": "dynamic-tag-renderer",
  "name": "Dynamic Tag Renderer",
  "author": "YOUR NAME",
  "description": "Dynamically render tags with custom JavaScript scripts. Transform tags into interactive content using your own render functions.",
  "repo": "YOUR-USERNAME/obsidian-dynamic-tag-renderer"
}
```

**Important:**
- Entries are alphabetical by `id`
- `repo` format: `username/repository-name` (no https://)
- Description should be concise but clear

### Step 5: Commit and Push

```bash
git add community-plugins.json
git commit -m "Add Dynamic Tag Renderer plugin"
git push origin add-dynamic-tag-renderer
```

### Step 6: Create Pull Request

1. Go to your fork on GitHub
2. You'll see a banner: "Compare & pull request" → Click it
3. Title: `Add Dynamic Tag Renderer plugin`
4. Description:

```markdown
## Plugin Submission

**Plugin Name:** Dynamic Tag Renderer  
**Repository:** https://github.com/YOUR-USERNAME/obsidian-dynamic-tag-renderer  
**Release:** v1.0.0  

## Description

Dynamic Tag Renderer allows users to transform Obsidian tags into interactive, dynamic content using custom JavaScript render functions. Users can map specific tags to scripts that execute when the tag is displayed in preview/reading mode.

## Key Features

- Map tags to custom JavaScript render functions
- Access full Obsidian API from scripts
- Script caching for performance
- Flexible configuration interface
- Support for async operations
- Error handling with visual feedback

## Testing

The plugin has been thoroughly tested in multiple scenarios:
- ✅ Different tag configurations
- ✅ Multiple tags per note
- ✅ Various script types
- ✅ Error conditions
- ✅ Enable/disable functionality
- ✅ Settings persistence

## Compliance

- ✅ Follows Obsidian plugin guidelines
- ✅ No telemetry or external requests
- ✅ Open source (MIT License)
- ✅ Comprehensive documentation
- ✅ Example scripts provided
- ✅ Mobile compatible

Thank you for reviewing!
```

5. Click **Create pull request**

### Step 7: Wait for Review

The Obsidian team will review your submission. This typically takes:
- **1-2 weeks** for initial review
- **Several days** for follow-up reviews

They will check:
- Code quality and security
- Plugin functionality
- Documentation quality
- Compliance with guidelines

### Step 8: Address Feedback

If reviewers request changes:

1. Make changes in your plugin repository
2. Create new release if needed
3. Comment on the PR when done
4. Update PR if needed (edit community-plugins.json)

### Step 9: Approval & Launch

Once approved:
- ✅ Plugin appears in Community Plugins browser
- ✅ Users can install directly from Obsidian
- ✅ You'll be notified via GitHub

---

## Part 6: Post-Launch Maintenance

### Responding to Issues

1. Monitor GitHub Issues regularly
2. Respond within a few days
3. Label issues appropriately
4. Fix critical bugs quickly

### Releasing Updates

**For each new version:**

1. **Make changes in your code**
2. **Update version:**
   ```bash
   npm version patch  # or minor/major
   ```
3. **Build:**
   ```bash
   npm run build
   ```
4. **Test thoroughly**
5. **Commit and tag:**
   ```bash
   git add .
   git commit -m "Version 1.0.1: Fix bug X"
   git tag -a 1.0.1 -m "Version 1.0.1"
   git push && git push --tags
   ```
6. **Create GitHub release** with new files
7. **Update CHANGELOG.md**

Users will automatically be notified of updates!

---

## Quick Reference: Common Commands

```bash
# Development
npm run dev              # Start watch mode
npm run build            # Production build
npm version patch        # Bump version

# Git
git add .                # Stage changes
git commit -m "message"  # Commit
git push                 # Push to GitHub
git tag -a v1.0.0 -m ""  # Create tag
git push --tags          # Push tags

# Testing in Obsidian
# 1. Copy main.js to plugin folder
# 2. Reload Obsidian (Ctrl+R)
# 3. Check Console (Ctrl+Shift+I)
```

---

## Troubleshooting

### Build Errors

**"Cannot find module 'obsidian'"**
```bash
npm install
```

**TypeScript errors**
```bash
npx tsc --noEmit  # Check errors
# Fix issues in main.ts
```

### Plugin Not Loading in Obsidian

1. Check files are in correct location
2. Verify `manifest.json` is valid JSON
3. Check Console for errors (Ctrl+Shift+I)
4. Ensure Community Plugins are enabled
5. Try disabling and re-enabling plugin

### GitHub Issues

**Push rejected**
```bash
git pull origin main  # Pull first
git push              # Then push
```

**Wrong remote**
```bash
git remote -v                    # Check remotes
git remote remove origin         # Remove wrong one
git remote add origin <URL>      # Add correct one
```

---

## Summary: Your Complete Workflow

1. ✅ **Setup** (one-time)
   - Install Node.js, Git, VS Code
   - Create project folder
   - Copy all plugin files
   - Run `npm install`

2. ✅ **Develop** (iterative)
   - Edit code in VS Code (`main.ts`)
   - Run `npm run dev` (keep running)
   - Copy `main.js` to test vault
   - Reload Obsidian and test
   - Repeat

3. ✅ **Publish** (when ready)
   - Final testing
   - Build: `npm run build`
   - Create GitHub repo
   - Push code
   - Create release with files
   - Submit to community plugins
   - Wait for approval

4. ✅ **Maintain** (ongoing)
   - Fix bugs
   - Add features
   - Release updates
   - Respond to issues

---

## Need Help?

- 📖 [Obsidian Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 💬 [Obsidian Discord](https://discord.gg/obsidianmd) - #plugin-dev channel
- 🐛 [Report Issues](https://github.com/YOUR-USERNAME/obsidian-dynamic-tag-renderer/issues)
- 📧 [Email Obsidian Support](support@obsidian.md)

**Good luck with your plugin! 🚀**