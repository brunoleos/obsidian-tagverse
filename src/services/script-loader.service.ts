import { App, TFile } from 'obsidian';
import { createScopedLogger } from '../utils/logger';
import { IScriptLoader } from './interfaces';

export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, Function> = new Map();

    constructor() {}

    async loadScript(scriptPath: string, app: App): Promise<Function> {
        return await createScopedLogger(`📜 Load Script: ${scriptPath}`).execute(async (loadLogger) => {
            // Handle community scripts
            if (scriptPath.startsWith('community:')) {
                return this.loadCommunityScript(scriptPath, app);
            }

            // Check cache first
            const cachedScript = await loadLogger.withScope('💾 Cache Check', async (cacheLogger) => {
                if (this.scriptCache.has(scriptPath)) {
                    cacheLogger.debug('CACHE', 'Cache hit');
                    return this.scriptCache.get(scriptPath)!;
                }
                cacheLogger.debug('CACHE', 'Cache miss');
                return null;
            });

            if (cachedScript) {
                return cachedScript;
            }

            // Load the script file
            const file = await loadLogger.withScope('📖 File Read', async (fileLogger) => {
                const file = app.vault.getAbstractFileByPath(scriptPath);

                if (!file || !(file instanceof TFile)) {
                    fileLogger.error('SCRIPT-LOADER', 'Script file not found', {
                        script: scriptPath,
                        fileType: typeof file
                    });
                    throw new Error(`Script file not found or not a file: ${scriptPath}`);
                }

                fileLogger.debug('SCRIPT-LOADER', 'File located in vault');
                return file;
            });

            const scriptContent = await loadLogger.withScope('📄 Read Content', async (readLogger) => {
                try {
                    const content = await app.vault.read(file);
                    readLogger.debug('SCRIPT-LOADER', 'Script content read', {
                        contentLength: content.length
                    });
                    return content;
                } catch (error) {
                    readLogger.error('SCRIPT-LOADER', 'Failed to read script file', { error });
                    throw new Error(`Failed to load script "${scriptPath}": ${error.message}`);
                }
            });

            const scriptFunction = await loadLogger.withScope('⚙️ Create Function', async (funcLogger) => {
                try {
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

                    const func = new Function(wrappedScript)();
                    funcLogger.debug('SCRIPT-LOADER', 'Script function created');
                    return func;
                } catch (error) {
                    funcLogger.error('SCRIPT-LOADER', 'Failed to parse script', { error });
                    throw new Error(`Failed to parse script "${scriptPath}": ${error.message}`);
                }
            });

            // Cache the function
            await loadLogger.withScope('💾 Cache Store', async (storeLogger) => {
                this.scriptCache.set(scriptPath, scriptFunction);
                storeLogger.debug('SCRIPT-LOADER', 'Script cached');
            });

            loadLogger.info('SCRIPT-LOADER', 'Script loaded successfully');
            return scriptFunction;
        }); // Auto-flush
    }

    /**
     * Load a community script from plugin data folder
     */
    private async loadCommunityScript(scriptPath: string, app: App): Promise<Function> {
        const scriptId = scriptPath.replace('community:', '');
        const cacheKey = `community:${scriptId}`;

        return await createScopedLogger(`📦 Load Community Script: ${scriptId}`).execute(async (loadLogger) => {
            // Check cache
            const cachedScript = await loadLogger.withScope('💾 Cache Check', async (cacheLogger) => {
                if (this.scriptCache.has(cacheKey)) {
                    cacheLogger.debug('SCRIPT-LOADER', 'Cache hit');
                    return this.scriptCache.get(cacheKey)!;
                }
                cacheLogger.debug('SCRIPT-LOADER', 'Cache miss');
                return null;
            });

            if (cachedScript) {
                return cachedScript;
            }

            // Read from plugin data folder
            const scriptContent = await loadLogger.withScope('📖 Read from Adapter', async (readLogger) => {
                const localPath = `community-scripts/${scriptId}.js`;
                const adapter = app.vault.adapter;
                const fullPath = `.obsidian/plugins/tagverse/${localPath}`;

                try {
                    const content = await adapter.read(fullPath);
                    readLogger.debug('SCRIPT-LOADER', 'Community script file read', {
                        fullPath,
                        contentLength: content.length
                    });
                    return content;
                } catch (error) {
                    readLogger.error('SCRIPT-LOADER', 'Failed to read community script file', {
                        fullPath,
                        error
                    });
                    throw new Error(`Failed to read community script file "${scriptId}": ${error.message}`);
                }
            });

            const scriptFunction = await loadLogger.withScope('⚙️ Create Function', async (funcLogger) => {
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

                    const func = new Function(wrappedScript)();
                    funcLogger.debug('SCRIPT-LOADER', 'Community script function created');
                    return func;
                } catch (error) {
                    funcLogger.error('SCRIPT-LOADER', 'Failed to parse community script', { error });
                    throw new Error(`Failed to parse community script "${scriptId}": ${error.message}`);
                }
            });

            // Cache the function
            await loadLogger.withScope('💾 Cache Store', async (storeLogger) => {
                this.scriptCache.set(cacheKey, scriptFunction);
                storeLogger.debug('SCRIPT-LOADER', 'Community script cached');
            });

            loadLogger.info('SCRIPT-LOADER', 'Community script loaded successfully');
            return scriptFunction;
        }); // Auto-flush
    }

    /**
     * Clear the script cache
     */
    clearCache(): void {
        createScopedLogger('🗑️ Clear Script Cache').execute((clearLogger) => {
            const previousSize = this.scriptCache.size;
            this.scriptCache.clear();
            clearLogger.debug('CACHE', 'Script cache cleared', { previousSize });
        }); // Auto-flush (synchronous)
    }

    /**
     * Check if a script is cached
     */
    isCached(scriptPath: string): boolean {
        return this.scriptCache.has(scriptPath);
    }
}
