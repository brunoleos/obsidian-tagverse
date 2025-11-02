import { App, TFile } from 'obsidian';
import { logger, logCacheOperation } from '../utils/tagverse-logger';
import { IScriptLoader } from './interfaces';

export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, Function> = new Map();

    async loadScript(scriptPath: string, app: App): Promise<Function> {
        try {
            // Handle community scripts
            if (scriptPath.startsWith('community:')) {
                return this.loadCommunityScript(scriptPath, app);
            }

            // Check cache first
            if (this.scriptCache.has(scriptPath)) {
                logCacheOperation('Cache hit', { script: scriptPath });
                return this.scriptCache.get(scriptPath)!;
            }

            logCacheOperation('Cache miss, loading from file', { script: scriptPath });

            // Load the script file
            const file = app.vault.getAbstractFileByPath(scriptPath);

            if (!file || !(file instanceof TFile)) {
                logger.error('SCRIPT-LOADER', 'Script file not found', { script: scriptPath, fileType: typeof file });
                throw new Error(`Script file not found or not a file: ${scriptPath}`);
            }

            try {
                const scriptContent = await app.vault.read(file);
                logger.debug('SCRIPT-LOADER', 'Script file read successfully', { script: scriptPath, contentLength: scriptContent.length });

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
                logger.debug('SCRIPT-LOADER', 'Script function created', { script: scriptPath });

                // Cache the function
                this.scriptCache.set(scriptPath, scriptFunction);
                logger.debug('SCRIPT-LOADER', 'Script cached', { script: scriptPath });

                return scriptFunction;
            } catch (error) {
                logger.error('SCRIPT-LOADER', 'Failed to read or parse script file', { scriptPath, error });
                throw new Error(`Failed to load script "${scriptPath}": ${error.message}`);
            }
        } catch (error) {
            logger.error('SCRIPT-LOADER', 'Script loading failed', { scriptPath, error });
            throw error;
        }
    }

    /**
     * Load a community script from plugin data folder
     */
    private async loadCommunityScript(scriptPath: string, app: App): Promise<Function> {
        const scriptId = scriptPath.replace('community:', '');
        const cacheKey = `community:${scriptId}`;

        try {
            // Check cache
            if (this.scriptCache.has(cacheKey)) {
                logger.debug('SCRIPT-LOADER', 'Cache hit (community)', { scriptId });
                return this.scriptCache.get(cacheKey)!;
            }

            logger.debug('SCRIPT-LOADER', 'Loading community script', { scriptId });

            // Read from plugin data folder
            const localPath = `community-scripts/${scriptId}.js`;
            const adapter = app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${localPath}`;

            let scriptContent: string;
            try {
                scriptContent = await adapter.read(fullPath);
                logger.debug('SCRIPT-LOADER', 'Community script file read', { scriptId, fullPath, contentLength: scriptContent.length });
            } catch (error) {
                logger.error('SCRIPT-LOADER', 'Failed to read community script file', { scriptId, fullPath, error });
                throw new Error(`Failed to read community script file "${scriptId}": ${error.message}`);
            }

            try {
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
                logger.debug('SCRIPT-LOADER', 'Community script function created', { scriptId });

                // Cache the function
                this.scriptCache.set(cacheKey, scriptFunction);
                logger.debug('SCRIPT-LOADER', 'Community script cached', { scriptId });

                return scriptFunction;
            } catch (error) {
                logger.error('SCRIPT-LOADER', 'Failed to parse community script', { scriptId, error });
                throw new Error(`Failed to parse community script "${scriptId}": ${error.message}`);
            }
        } catch (error) {
            logger.error('SCRIPT-LOADER', 'Failed to load community script', { scriptId, error });
            throw error;
        }
    }

    /**
     * Clear the script cache
     */
    clearCache(): void {
        this.scriptCache.clear();
        logCacheOperation('Script cache cleared', { previousSize: this.scriptCache.size });
    }

    /**
     * Check if a script is cached
     */
    isCached(scriptPath: string): boolean {
        return this.scriptCache.has(scriptPath);
    }
}
