import { App, TFile } from 'obsidian';
import { logger } from '../utils/logger';
import { IScriptLoader } from './interfaces';

export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, Function> = new Map();

    async loadScript(scriptPath: string, app: App): Promise<Function> {
        // Handle community scripts
        if (scriptPath.startsWith('community:')) {
            return this.loadCommunityScript(scriptPath, app);
        }

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
     * Load a community script from plugin data folder
     */
    private async loadCommunityScript(scriptPath: string, app: App): Promise<Function> {
        const scriptId = scriptPath.replace('community:', '');
        const cacheKey = `community:${scriptId}`;

        // Check cache
        if (this.scriptCache.has(cacheKey)) {
            logger.logCacheOperation('Cache hit (community)', { scriptId });
            return this.scriptCache.get(cacheKey)!;
        }

        // Read from plugin data folder
        const localPath = `community-scripts/${scriptId}.js`;
        const adapter = app.vault.adapter;
        const fullPath = `${adapter.getBasePath()}/.obsidian/plugins/tagverse/${localPath}`;

        try {
            const scriptContent = await adapter.read(fullPath);

            // Wrap in async function to support await (same pattern as loadScript)
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
            logger.logCacheOperation('Community script function created', { scriptId });

            // Cache the function
            this.scriptCache.set(cacheKey, scriptFunction);
            logger.logCacheOperation('Community script cached', { scriptId });

            return scriptFunction;
        } catch (error) {
            logger.logErrorHandling('Failed to load community script', error);
            throw new Error(`Failed to load community script "${scriptId}": ${error.message}`);
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
