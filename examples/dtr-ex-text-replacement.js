// Example render script for Dynamic Tag Renderer
// This file shows how to create a custom tag renderer

/**
 * The render function is called for each tag that matches your configuration
 * @param {Object} context - The rendering context
 * @param {App} context.app - Obsidian App instance
 * @param {string} context.tag - The tag name (without #)
 * @param {HTMLElement} context.element - Container element
 * @param {string} context.sourcePath - Path of the current note
 * @param {Object} context.frontmatter - Note frontmatter
 * @returns {HTMLElement|string|null} The rendered content
 */
async function render(context) {
    
    // Example 1: Simple text replacement
    
    return `'#${context.tag}/fun'`;
}

// Note: The render function must be defined.
// You can use async/await for asynchronous operations.
// Return an HTMLElement, a string (HTML), or null.