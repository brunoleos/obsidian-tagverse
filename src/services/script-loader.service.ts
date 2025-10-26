import { App, TFile } from 'obsidian';
import { logger } from '../utils/logger';
import { IScriptLoader } from './interfaces';

/**
 * Service responsible for loading and caching script files.
 * Implements Single Responsibility Principle by focusing only on script management.
 */
export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, Function> = new Map();

    /**
     * Load a script from file or cache
     */
    async loadScript(scriptPath: string, app: App): Promise<Function> {
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
