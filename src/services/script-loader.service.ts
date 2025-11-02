import { App, TFile } from 'obsidian';
import { withLogScope, emit } from '../utils/logger';
import { IScriptLoader } from './interfaces';

export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, Function> = new Map();

    constructor() {}

    async loadScript(scriptPath: string, app: App): Promise<Function> {
        // 🔮 THE MAGIC: Create ambient context with withLogScope
        return await withLogScope(`📜 Load Script: ${scriptPath}`, async () => {
            // Handle community scripts
            if (scriptPath.startsWith('community:')) {
                return this.loadCommunityScript(scriptPath, app);
            }

            // 🔮 Check cache - this method can emit without receiving a logger!
            const cachedScript = await this.checkCache(scriptPath);
            if (cachedScript) {
                return cachedScript;
            }

            // 🔮 Load and parse script - these methods emit automatically!
            const file = await this.locateScriptFile(scriptPath, app);
            const scriptContent = await this.readScriptContent(file, scriptPath, app);
            const scriptFunction = await this.createScriptFunction(scriptContent, scriptPath);

            // 🔮 Cache the result
            await this.cacheScript(scriptPath, scriptFunction);

            emit('debug', 'SCRIPT-LOADER', 'Script loaded successfully');
            return scriptFunction;
        }); // Auto-flush
    }

    /**
     * 🔮 THE MAGIC: This method can emit logs without receiving a logger parameter!
     * Logs automatically go to the current ambient scope.
     */
    private async checkCache(scriptPath: string): Promise<Function | null> {
        return await withLogScope('💾 Cache Check', async () => {
            if (this.scriptCache.has(scriptPath)) {
                emit('debug', 'CACHE', 'Cache hit');
                return this.scriptCache.get(scriptPath)!;
            }
            emit('debug', 'CACHE', 'Cache miss');
            return null;
        });
    }

    /**
     * 🔮 THE MAGIC: Inner function emits to ambient scope!
     */
    private async locateScriptFile(scriptPath: string, app: App): Promise<TFile> {
        return await withLogScope('📖 File Read', async () => {
            const file = app.vault.getAbstractFileByPath(scriptPath);

            if (!file || !(file instanceof TFile)) {
                emit('error', 'SCRIPT-LOADER', 'Script file not found', {
                    script: scriptPath,
                    fileType: typeof file
                });
                throw new Error(`Script file not found or not a file: ${scriptPath}`);
            }

            emit('debug', 'SCRIPT-LOADER', 'File located in vault');
            return file;
        });
    }

    /**
     * 🔮 THE MAGIC: Another inner function using ambient scope!
     */
    private async readScriptContent(file: TFile, scriptPath: string, app: App): Promise<string> {
        return await withLogScope('📄 Read Content', async () => {
            try {
                const content = await app.vault.read(file);
                emit('debug', 'SCRIPT-LOADER', 'Script content read', {
                    contentLength: content.length
                });
                return content;
            } catch (error) {
                emit('error', 'SCRIPT-LOADER', 'Failed to read script file', { error });
                throw new Error(`Failed to load script "${scriptPath}": ${error.message}`);
            }
        });
    }

    /**
     * 🔮 THE MAGIC: Script function creation with automatic logging!
     */
    private async createScriptFunction(scriptContent: string, scriptPath: string): Promise<Function> {
        return await withLogScope('⚙️ Create Function', async () => {
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
                emit('debug', 'SCRIPT-LOADER', 'Script function created');
                return func;
            } catch (error) {
                emit('error', 'SCRIPT-LOADER', 'Failed to parse script', { error });
                throw new Error(`Failed to parse script "${scriptPath}": ${error.message}`);
            }
        });
    }

    /**
     * 🔮 THE MAGIC: Caching with automatic scope inheritance!
     */
    private async cacheScript(scriptPath: string, scriptFunction: Function): Promise<void> {
        return await withLogScope('💾 Cache Store', async () => {
            this.scriptCache.set(scriptPath, scriptFunction);
            emit('debug', 'SCRIPT-LOADER', 'Script cached');
        });
    }

    /**
     * Load a community script from plugin data folder
     * 🔮 THE MAGIC: Now uses ambient context throughout!
     */
    private async loadCommunityScript(scriptPath: string, app: App): Promise<Function> {
        const scriptId = scriptPath.replace('community:', '');
        const cacheKey = `community:${scriptId}`;

        return await withLogScope(`📦 Load Community Script: ${scriptId}`, async () => {
            // Check cache
            const cachedScript = await this.checkCommunityCache(cacheKey);
            if (cachedScript) {
                return cachedScript;
            }

            // Read from plugin data folder
            const scriptContent = await this.readCommunityScript(scriptId, app);
            const scriptFunction = await this.createScriptFunction(scriptContent, scriptId);

            // Cache the function
            await this.cacheScript(cacheKey, scriptFunction);

            emit('debug', 'SCRIPT-LOADER', 'Community script loaded successfully');
            return scriptFunction;
        }); // Auto-flush
    }

    /**
     * 🔮 THE MAGIC: Check community script cache
     */
    private async checkCommunityCache(cacheKey: string): Promise<Function | null> {
        return await withLogScope('💾 Cache Check', async () => {
            if (this.scriptCache.has(cacheKey)) {
                emit('debug', 'SCRIPT-LOADER', 'Cache hit');
                return this.scriptCache.get(cacheKey)!;
            }
            emit('debug', 'SCRIPT-LOADER', 'Cache miss');
            return null;
        });
    }

    /**
     * 🔮 THE MAGIC: Read community script from adapter
     */
    private async readCommunityScript(scriptId: string, app: App): Promise<string> {
        return await withLogScope('📖 Read from Adapter', async () => {
            const localPath = `community-scripts/${scriptId}.js`;
            const adapter = app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${localPath}`;

            try {
                const content = await adapter.read(fullPath);
                emit('debug', 'SCRIPT-LOADER', 'Community script file read', {
                    fullPath,
                    contentLength: content.length
                });
                return content;
            } catch (error) {
                emit('error', 'SCRIPT-LOADER', 'Failed to read community script file', {
                    fullPath,
                    error
                });
                throw new Error(`Failed to read community script file "${scriptId}": ${error.message}`);
            }
        });
    }

    /**
     * Clear the script cache
     * 🔮 THE MAGIC: Even sync methods can use ambient context!
     */
    clearCache(): void {
        withLogScope('🗑️ Clear Script Cache', () => {
            const previousSize = this.scriptCache.size;
            this.scriptCache.clear();
            emit('debug', 'CACHE', 'Script cache cleared', { previousSize });
        }); // Auto-flush (synchronous)
    }

    /**
     * Check if a script is cached
     */
    isCached(scriptPath: string): boolean {
        return this.scriptCache.has(scriptPath);
    }
}
