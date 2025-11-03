import { App, Notice, requestUrl } from 'obsidian';
import {
    CommunityScriptsRegistry,
    CommunityScriptMetadata,
    InstalledCommunityScript,
    TagverseSettings
} from '../types/interfaces';
import { Logger } from '../utils/logger';

export interface ICommunityScriptService {
    fetchRegistry(): Promise<CommunityScriptsRegistry>;
    getCachedRegistry(): CommunityScriptsRegistry | null;
    searchScripts(query: string, labels?: string[]): CommunityScriptMetadata[];
    downloadScript(scriptId: string): Promise<string>;
    installScript(scriptId: string): Promise<void>;
    uninstallScript(scriptId: string): Promise<void>;
    checkForUpdates(): Promise<Map<string, string>>; // scriptId -> newVersion
    updateScript(scriptId: string): Promise<void>;
    getInstalledScripts(): InstalledCommunityScript[];
}

export class CommunityScriptService implements ICommunityScriptService {
    private cachedRegistry: CommunityScriptsRegistry | null = null;
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    private readonly SCRIPTS_FOLDER = 'community-scripts';

    constructor(
        private app: App,
        private getSettings: () => TagverseSettings,
        private saveSettings: (settings: TagverseSettings) => Promise<void>
    ) {}

    async fetchRegistry(): Promise<CommunityScriptsRegistry> {
        return await Logger.withScope('📡 Fetch Registry', async () => {
            const settings = this.getSettings();
            const now = Date.now();

            // Check cache first
            const cached = await Logger.withScope('💾 Check Cache', async () => {
                if (this.cachedRegistry && (now - settings.lastRegistryFetch) < this.CACHE_DURATION) {
                    Logger.debug('COMMUNITY', 'Using cached registry', {
                        age: now - settings.lastRegistryFetch
                    });
                    return this.cachedRegistry;
                }
                Logger.debug('COMMUNITY', 'Cache miss or expired', {
                    cacheAge: now - settings.lastRegistryFetch,
                    cacheDuration: this.CACHE_DURATION
                });
                return null;
            });

            if (cached) {
                return cached;
            }

            // Download from network
            try {
                await Logger.withScope('🌐 Network Request', async () => {
                    Logger.debug('COMMUNITY', 'Fetching registry from GitHub', {
                        url: settings.communityRegistryUrl
                    });
                    const response = await requestUrl({
                        url: settings.communityRegistryUrl,
                        method: 'GET'
                    });

                    this.cachedRegistry = JSON.parse(response.text);
                    Logger.debug('COMMUNITY', 'Registry downloaded', {
                        totalScripts: this.cachedRegistry?.totalScripts
                    });
                });

                // Update cache timestamp
                await Logger.withScope('⚙️ Update Settings', async () => {
                    settings.lastRegistryFetch = now;
                    await this.saveSettings(settings);
                    Logger.debug('COMMUNITY', 'Cache timestamp updated', {
                        timestamp: now
                    });
                });

                Logger.debug('COMMUNITY', 'Registry fetched successfully', {
                    totalScripts: this.cachedRegistry!.totalScripts
                });
                return this.cachedRegistry!;
            } catch (error) {
                Logger.error('COMMUNITY', 'Failed to fetch registry', error as Error);

                // Return cached if available, even if stale
                if (this.cachedRegistry) {
                    new Notice('Using cached script library (offline mode)');
                    return this.cachedRegistry;
                }

                throw new Error('Failed to fetch community scripts registry');
            }
        });
    }

    getCachedRegistry(): CommunityScriptsRegistry | null {
        return this.cachedRegistry;
    }

    searchScripts(query: string, labels?: string[]): CommunityScriptMetadata[] {
        if (!this.cachedRegistry) return [];

        let results = this.cachedRegistry.scripts;

        // Filter by labels (must match ALL selected labels)
        if (labels && labels.length > 0) {
            results = results.filter(script =>
                labels.every(label => script.labels.includes(label))
            );
        }

        // Filter by search query
        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(script =>
                script.name.toLowerCase().includes(lowerQuery) ||
                script.description.toLowerCase().includes(lowerQuery) ||
                script.labels.some(label => label.toLowerCase().includes(lowerQuery)) ||
                script.author.name.toLowerCase().includes(lowerQuery)
            );
        }

        return results;
    }

    async downloadScript(scriptId: string): Promise<string> {
        const registry = await this.fetchRegistry();
        const scriptMeta = registry.scripts.find(s => s.id === scriptId);

        if (!scriptMeta) {
            throw new Error(`Script not found: ${scriptId}`);
        }

        try {
            const response = await requestUrl({
                url: scriptMeta.urls.script,
                method: 'GET'
            });

            return response.text;
        } catch (error) {
            Logger.error('COMMUNITY', 'Failed to download script', { scriptId, error });
            throw new Error(`Failed to download script: ${scriptId}`);
        }
    }

    async installScript(scriptId: string): Promise<void> {
        return await Logger.withScope(`📦 Installing ${scriptId}`, async () => {
            const settings = this.getSettings();

            // Validation phase
            await Logger.withScope('✅ Validation', async () => {
                if (settings.installedCommunityScripts.some(s => s.scriptId === scriptId)) {
                    Logger.error('COMMUNITY', 'Script already installed', { scriptId });
                    throw new Error(`Script "${scriptId}" is already installed`);
                }
                Logger.debug('COMMUNITY', 'Validation passed', { scriptId });
            });

            Logger.debug('COMMUNITY', 'Starting script installation', { scriptId });

            // Download phase
            const { scriptCode, scriptMeta } = await Logger.withScope('⬇️ Download', async () => {
                Logger.debug('COMMUNITY', 'Downloading script code', { scriptId });
                const code = await this.downloadScript(scriptId);

                Logger.debug('COMMUNITY', 'Fetching metadata', { scriptId });
                const registry = await this.fetchRegistry();
                const meta = registry.scripts.find(s => s.id === scriptId);
                if (!meta) {
                    Logger.error('COMMUNITY', 'Script metadata not found', { scriptId });
                    throw new Error('Script metadata not found');
                }

                Logger.debug('COMMUNITY', 'Download complete', {
                    version: meta.version,
                    size: code.length
                });

                return { scriptCode: code, scriptMeta: meta };
            });

            // File system operations phase
            await Logger.withScope('💾 File System', async () => {
                const localPath = `${this.SCRIPTS_FOLDER}/${scriptId}.js`;
                const adapter = this.app.vault.adapter;
                const folderPath = `.obsidian/plugins/tagverse/${this.SCRIPTS_FOLDER}`;

                // Ensure folder exists
                await Logger.withScope('📁 Create Folder', async () => {
                    try {
                        await adapter.mkdir(folderPath);
                        Logger.debug('COMMUNITY', 'Created scripts folder', { folderPath });
                    } catch (e) {
                        Logger.debug('COMMUNITY', 'Scripts folder already exists', { folderPath });
                    }
                });

                // Write script file
                await Logger.withScope('📝 Write File', async () => {
                    const fullPath = `.obsidian/plugins/tagverse/${localPath}`;
                    try {
                        await adapter.write(fullPath, scriptCode);
                        Logger.debug('COMMUNITY', 'Script file written', {
                            fullPath,
                            size: scriptCode.length
                        });
                    } catch (error) {
                        Logger.error('COMMUNITY', 'Failed to write script file', { fullPath, error });
                        throw new Error(`Failed to write script file: ${error.message || error}`);
                    }
                });

                // Track installation
                await Logger.withScope('⚙️ Update Settings', async () => {
                    settings.installedCommunityScripts.push({
                        scriptId,
                        version: scriptMeta.version,
                        installedAt: Date.now(),
                        customTag: '',
                        localPath: `${this.SCRIPTS_FOLDER}/${scriptId}.js`
                    });

                    await this.saveSettings(settings);
                    Logger.debug('COMMUNITY', 'Installation tracked in settings', {
                        scriptId,
                        version: scriptMeta.version
                    });
                });
            });

            Logger.debug('COMMUNITY', 'Script installed successfully', { scriptId, version: scriptMeta.version });
            new Notice(`✅ Installed "${scriptMeta.name}"`);
        });
    }

    async uninstallScript(scriptId: string): Promise<void> {
        return await Logger.withScope(`🗑️ Uninstalling ${scriptId}`, async () => {
            const settings = this.getSettings();
            const installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

            if (!installed) {
                Logger.error('COMMUNITY', 'Script not installed', { scriptId });
                throw new Error(`Script not installed: ${scriptId}`);
            }

            Logger.debug('COMMUNITY', 'Starting script uninstallation', { scriptId });

            // Remove file
            const adapter = this.app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${installed.localPath}`;
            try {
                await adapter.remove(fullPath);
                Logger.debug('COMMUNITY', 'Script file removed', { fullPath });
            } catch (e) {
                Logger.warn('COMMUNITY', 'Failed to remove script file', { scriptId, fullPath, error: e });
            }

            // Remove mapping
            settings.tagMappings = settings.tagMappings.filter(
                m => m.scriptPath !== `community:${scriptId}`
            );

            // Remove from installed list
            settings.installedCommunityScripts = settings.installedCommunityScripts.filter(
                s => s.scriptId !== scriptId
            );

            await this.saveSettings(settings);

            Logger.debug('COMMUNITY', 'Script uninstalled successfully', { scriptId });
            new Notice(`✅ Uninstalled script`);
        });
    }

    async checkForUpdates(): Promise<Map<string, string>> {
        const settings = this.getSettings();
        const registry = await this.fetchRegistry();
        const updates = new Map<string, string>();

        if (settings.installedCommunityScripts.length > 0) {
            await Logger.withScope(
                `🔄 Checking updates for ${settings.installedCommunityScripts.length} scripts`,
                async () => {
                    settings.installedCommunityScripts.forEach(installed => {
                        const latest = registry.scripts.find(s => s.id === installed.scriptId);
                        if (latest && latest.version !== installed.version) {
                            Logger.debug('COMMUNITY', 'Update available', {
                                scriptId: installed.scriptId,
                                currentVersion: installed.version,
                                latestVersion: latest.version
                            });
                            updates.set(installed.scriptId, latest.version);
                        } else {
                            Logger.debug('COMMUNITY', 'Script up to date', {
                                scriptId: installed.scriptId,
                                version: installed.version
                            });
                        }
                    });
                }
            );
        }

        return updates;
    }

    async updateScript(scriptId: string): Promise<void> {
        return await Logger.withScope(`⬆️ Updating ${scriptId}`, async () => {
            const settings = this.getSettings();
            let installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

            // Validation phase
            await Logger.withScope('✅ Validation', async () => {
                if (!installed) {
                    Logger.error('COMMUNITY', 'Script not installed', { scriptId });
                    throw new Error(`Script not installed: ${scriptId}`);
                }
                Logger.debug('COMMUNITY', 'Script is installed', {
                    currentVersion: installed.version
                });
            });

            // TypeScript now knows installed is defined after validation
            if (!installed) return; // This should never happen, but helps TypeScript

            Logger.debug('COMMUNITY', 'Starting script update', { scriptId, currentVersion: installed.version });

            // Download phase
            const { scriptCode, scriptMeta } = await Logger.withScope('⬇️ Download Latest', async () => {
                Logger.debug('COMMUNITY', 'Downloading latest script version', { scriptId });
                const code = await this.downloadScript(scriptId);

                Logger.debug('COMMUNITY', 'Fetching latest metadata', { scriptId });
                const registry = await this.fetchRegistry();
                const meta = registry.scripts.find(s => s.id === scriptId);
                if (!meta) {
                    Logger.error('COMMUNITY', 'Script metadata not found', { scriptId });
                    throw new Error('Script metadata not found');
                }

                Logger.debug('COMMUNITY', 'Latest version downloaded', {
                    oldVersion: installed!.version,
                    newVersion: meta.version,
                    size: code.length
                });

                return { scriptCode: code, scriptMeta: meta };
            });

            // File overwrite phase
            await Logger.withScope('💾 Overwrite File', async () => {
                const adapter = this.app.vault.adapter;
                const fullPath = `.obsidian/plugins/tagverse/${installed!.localPath}`;

                try {
                    await adapter.write(fullPath, scriptCode);
                    Logger.debug('COMMUNITY', 'Script file overwritten', {
                        fullPath,
                        size: scriptCode.length
                    });
                } catch (error) {
                    Logger.error('COMMUNITY', 'Failed to write updated script file', { fullPath, error });
                    throw new Error(`Failed to write updated script file: ${error.message || error}`);
                }
            });

            // Update version tracking
            await Logger.withScope('⚙️ Update Settings', async () => {
                installed!.version = scriptMeta.version;
                await this.saveSettings(settings);
                Logger.debug('COMMUNITY', 'Version tracking updated', {
                    newVersion: scriptMeta.version
                });
            });

            Logger.debug('COMMUNITY', 'Script updated successfully', { scriptId, newVersion: scriptMeta.version });
            new Notice(`✅ Updated to v${scriptMeta.version}`);
        });
    }

    getInstalledScripts(): InstalledCommunityScript[] {
        return this.getSettings().installedCommunityScripts;
    }
}
