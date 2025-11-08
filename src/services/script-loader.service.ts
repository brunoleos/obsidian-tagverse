import { App, TFile } from 'obsidian';
import { Logger } from '../utils/logger';
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
 * Users should be aware that:
 * - Scripts have full access to the Obsidian API and can read/write vault files
 * - Scripts from untrusted sources should not be added to the vault
 * - The plugin does not sandbox or restrict script execution
 */
export class ScriptLoaderService implements IScriptLoader {
    private scriptCache: Map<string, TagRenderFunction> = new Map();

    async loadScript(scriptPath: string, app: App): Promise<TagRenderFunction> {
        return await Logger.withScope(`📜 Load Script: ${scriptPath}`, async () => {
            if (scriptPath.startsWith('community:')) {
                return this.loadCommunityScript(scriptPath, app);
            }

            const cachedScript = await this.checkCache(scriptPath);
            if (cachedScript) {
                return cachedScript;
            }

            const file = await this.locateScriptFile(scriptPath, app);
            const scriptContent = await this.readScriptContent(file, scriptPath, app);
            const scriptFunction = await this.createScriptFunction(scriptContent, scriptPath);

            await this.cacheScript(scriptPath, scriptFunction);

            Logger.debug('SCRIPT-LOADER', 'Script loaded successfully', {
                scriptPath
            });
            return scriptFunction;
        });
    }

    private async checkCache(scriptPath: string): Promise<TagRenderFunction | null> {
        return await Logger.withScope('💾 Cache Check', async () => {
            if (this.scriptCache.has(scriptPath)) {
                Logger.debug('CACHE', 'Cache hit', { scriptPath });
                return this.scriptCache.get(scriptPath)!;
            }
            Logger.debug('CACHE', 'Cache miss', { scriptPath });
            return null;
        });
    }

    private async locateScriptFile(scriptPath: string, app: App): Promise<TFile> {
        return await Logger.withScope('📖 File Read', async () => {
            const file = app.vault.getAbstractFileByPath(scriptPath);

            if (!file || !(file instanceof TFile)) {
                Logger.error('SCRIPT-LOADER', 'Script file not found', {
                    script: scriptPath,
                    fileType: typeof file
                });
                throw new Error(`Script file not found or not a file: ${scriptPath}`);
            }

            Logger.debug('SCRIPT-LOADER', 'File located in vault', { scriptPath });
            return file;
        });
    }

    private async readScriptContent(file: TFile, scriptPath: string, app: App): Promise<string> {
        return await Logger.withScope('📄 Read Content', async () => {
            try {
                const content = await app.vault.read(file);
                Logger.debug('SCRIPT-LOADER', 'Script content read', {
                    contentLength: content.length
                });
                return content;
            } catch (error) {
                Logger.error('SCRIPT-LOADER', 'Failed to read script file', { error });
                throw new Error(`Failed to load script "${scriptPath}": ${error.message}`);
            }
        });
    }

    private async createScriptFunction(scriptContent: string, scriptPath: string): Promise<TagRenderFunction> {
        return await Logger.withScope('⚙️ Create Function', async () => {
            try {
                const wrappedScript = `
                    return (async function(context) {
                        const Notice = context.Notice;
                        ${scriptContent}

                        if (typeof render === 'function') {
                            return await render(context);
                        }

                        throw new Error('No render() function found in script');
                    });
                `;

            // Use Function constructor to dynamically load user script
            // This is intentional - see class-level security documentation
                const func = new Function(wrappedScript)();
                Logger.debug('SCRIPT-LOADER', 'Script function created', { scriptPath });
                return func;
            } catch (error) {
                Logger.error('SCRIPT-LOADER', 'Failed to parse script', { error });
                throw new Error(`Failed to parse script "${scriptPath}": ${error.message}`);
            }
        });
    }

    private async cacheScript(scriptPath: string, scriptFunction: TagRenderFunction): Promise<void> {
        return await Logger.withScope('💾 Cache Store', async () => {
            this.scriptCache.set(scriptPath, scriptFunction);
            Logger.debug('SCRIPT-LOADER', 'Script cached', { scriptPath });
        });
    }

    private async loadCommunityScript(scriptPath: string, app: App): Promise<TagRenderFunction> {
        const scriptId = scriptPath.replace('community:', '');
        const cacheKey = `community:${scriptId}`;

        return await Logger.withScope(`📦 Load Community Script: ${scriptId}`, async () => {
            const cachedScript = await this.checkCommunityCache(cacheKey);
            if (cachedScript) {
                return cachedScript;
            }

            const scriptContent = await this.readCommunityScript(scriptId, app);
            const scriptFunction = await this.createScriptFunction(scriptContent, scriptId);

            await this.cacheScript(cacheKey, scriptFunction);

            Logger.debug('SCRIPT-LOADER', 'Community script loaded successfully', {
                scriptId
            });
            return scriptFunction;
        });
    }

    private async checkCommunityCache(cacheKey: string): Promise<TagRenderFunction | null> {
        return await Logger.withScope('💾 Cache Check', async () => {
            if (this.scriptCache.has(cacheKey)) {
                Logger.debug('SCRIPT-LOADER', 'Cache hit', { cacheKey });
                return this.scriptCache.get(cacheKey)!;
            }
            Logger.debug('SCRIPT-LOADER', 'Cache miss', { cacheKey });
            return null;
        });
    }

    private async readCommunityScript(scriptId: string, app: App): Promise<string> {
        return await Logger.withScope('📖 Read from Adapter', async () => {
            const localPath = `community-scripts/${scriptId}.js`;
            const adapter = app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${localPath}`;

            try {
                const content = await adapter.read(fullPath);
                Logger.debug('SCRIPT-LOADER', 'Community script file read', {
                    fullPath,
                    contentLength: content.length
                });
                return content;
            } catch (error) {
                Logger.error('SCRIPT-LOADER', 'Failed to read community script file', {
                    fullPath,
                    error
                });
                throw new Error(`Failed to read community script file "${scriptId}": ${error.message}`);
            }
        });
    }

    clearCache(): void {
        Logger.withScope('🗑️ Clear Script Cache', () => {
            const previousSize = this.scriptCache.size;
            this.scriptCache.clear();
            Logger.debug('CACHE', 'Script cache cleared', { previousSize });
        });
    }

    isCached(scriptPath: string): boolean {
        return this.scriptCache.has(scriptPath);
    }
}
