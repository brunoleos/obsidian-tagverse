import { App, TFile } from 'obsidian';
import { logger } from '../utils/logger';
import { IScriptLoader, TagRenderFunction } from './interfaces';

/**
 * Service for loading and caching user scripts from the vault.
 *
 * SECURITY MODEL:
 * This service uses the Function constructor (similar to eval) to dynamically load
 * and execute JavaScript code from user scripts in the vault. While this is generally
 * considered a security risk, it is acceptable in this context because:
 *
 * 1. **User-Controlled Content**: Scripts are files in the user's own Obsidian vault,
 *    not external or untrusted sources. The user has full control over these files.
 *
 * 2. **Intentional Design**: The plugin's core functionality is to execute user-written
 *    scripts to render custom tag content. This is the intended purpose of the plugin.
 *
 * 3. **Execution Context**: Scripts execute with the same privileges as the plugin itself,
 *    which has access to the Obsidian App instance and vault. This is by design to allow
 *    scripts to interact with the user's notes and vault.
 *
 * 4. **Trust Model**: The security boundary is at the vault level - if a user's vault is
 *    compromised, the entire vault content (including notes) is already at risk. Scripts
 *    are part of that trusted vault content.
 *
 * WHY FUNCTION CONSTRUCTOR IS NECESSARY:
 * Alternative approaches were evaluated and rejected for the following technical reasons:
 *
 * - **Dynamic import()**: Requires ES6 module syntax, blocked by Electron security policies
 *   for blob/data URLs, and cannot inject context variables into module scope.
 *
 * - **AsyncFunction constructor**: Same security profile as Function(), but would break
 *   all existing user scripts by requiring different syntax patterns.
 *
 * - **Web Workers**: Cannot access DOM or Obsidian API, runs in isolated thread,
 *   incompatible with synchronous UI rendering requirements.
 *
 * - **iframe sandboxing**: Prevents access to Obsidian API and vault operations,
 *   defeats the core purpose of the plugin.
 *
 * - **VM/sandboxed execution**: Would require whitelisting every Obsidian API method,
 *   adds significant complexity without meaningful security benefit given the trust model.
 *
 * The Function constructor approach enables:
 * - Async/await support for vault file operations
 * - Context injection (app, tag, args, element, frontmatter)
 * - Full Obsidian API access for script capabilities
 * - Compatibility with existing user script patterns
 *
 * See SECURITY.md for comprehensive security analysis and threat model documentation.
 *
 * Users should be aware that:
 * - Scripts have full access to the Obsidian API and can read/write vault files
 * - Scripts from untrusted sources should not be added to the vault
 * - The plugin does not sandbox or restrict script execution
 */
export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, TagRenderFunction> = new Map();

    /**
     * Load and cache a script from the vault.
     *
     * @param scriptPath - Path to the script file in the vault
     * @param app - Obsidian App instance to access vault files
     * @returns Promise resolving to the loaded script function
     * @throws Error if the script file is not found or fails to load
     *
     * @security Uses Function constructor to dynamically load scripts.
     * See class-level documentation for security model details.
     */
    async loadScript(scriptPath: string, app: App): Promise<TagRenderFunction> {
        // Check cache first
        if (this.scriptCache.has(scriptPath)) {
            logger.logCacheOperation('Cache hit', { script: scriptPath });
            return this.scriptCache.get(scriptPath)!;
        }

        logger.logCacheOperation('Cache miss, loading from file', { script: scriptPath });

        // Load the script file
        const file = app.vault.getAbstractFileByPath(scriptPath);

        if (!file || !(file instanceof TFile)) {
            logger.logErrorHandling('Script file not found', { script: scriptPath, fileType: typeof file });
            throw new Error(`Script file not found or not a file: ${scriptPath}`);
        }

        try {
            const scriptContent = await app.vault.read(file);
            logger.logCacheOperation('Script file read successfully', { script: scriptPath, contentLength: scriptContent.length });

            // Wrap in async function to support await
            const wrappedScript = `
                return (async function(context) {
                    const Notice = context.Notice;
                    ${scriptContent}

                    // If render function is defined, call it
                    if (typeof render === 'function') {
                        return await render(context);
                    }

                    throw new Error('No render() function found in script');
                });
            `;

            // Use Function constructor to dynamically load user script
            // This is intentional - see class-level security documentation and SECURITY.md
            // eslint-disable-next-line no-new-func
            const scriptFunction = new Function(wrappedScript)();
            logger.logCacheOperation('Script function created', { script: scriptPath });

            // Cache the function
            this.scriptCache.set(scriptPath, scriptFunction);
            logger.logCacheOperation('Script cached', { script: scriptPath });

            return scriptFunction;
        } catch (error) {
            logger.logErrorHandling('Script loading failed', error);
            throw new Error(`Failed to load script "${scriptPath}": ${error.message}`);
        }
    }

    /**
     * Clear the script cache
     */
    clearCache(): void {
        this.scriptCache.clear();
        logger.logCacheOperation('Script cache cleared', { previousSize: this.scriptCache.size });
    }

    /**
     * Check if a script is cached
     */
    isCached(scriptPath: string): boolean {
        return this.scriptCache.has(scriptPath);
    }
}
