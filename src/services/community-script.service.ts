import { App, Notice, requestUrl } from 'obsidian';
import {
    CommunityScriptsRegistry,
    CommunityScriptMetadata,
    InstalledCommunityScript,
    TagverseSettings
} from '../types/interfaces';
import { ScopedLogger } from '../utils/logger';

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
        private saveSettings: (settings: TagverseSettings) => Promise<void>,
        private logger: ScopedLogger
    ) {}

    async fetchRegistry(): Promise<CommunityScriptsRegistry> {
        return await this.logger.withScope('📡 Fetch Registry', async (fetchLogger) => {
            const settings = this.getSettings();
            const now = Date.now();

            // Check cache first
            const cached = await fetchLogger.withScope('💾 Check Cache', async (cacheLogger) => {
                if (this.cachedRegistry && (now - settings.lastRegistryFetch) < this.CACHE_DURATION) {
                    cacheLogger.debug('COMMUNITY', 'Using cached registry', {
                        age: now - settings.lastRegistryFetch
                    });
                    return this.cachedRegistry;
                }
                cacheLogger.debug('COMMUNITY', 'Cache miss or expired');
                return null;
            });

            if (cached) {
                return cached;
            }

            // Download from network
            try {
                await fetchLogger.withScope('🌐 Network Request', async (networkLogger) => {
                    networkLogger.info('COMMUNITY', 'Fetching registry from GitHub');
                    const response = await requestUrl({
                        url: settings.communityRegistryUrl,
                        method: 'GET'
                    });

                    this.cachedRegistry = JSON.parse(response.text);
                    networkLogger.info('COMMUNITY', 'Registry downloaded', {
                        totalScripts: this.cachedRegistry?.totalScripts
                    });
                });

                // Update cache timestamp
                await fetchLogger.withScope('⚙️ Update Settings', async (settingsLogger) => {
                    settings.lastRegistryFetch = now;
                    await this.saveSettings(settings);
                    settingsLogger.debug('COMMUNITY', 'Cache timestamp updated');
                });

                fetchLogger.info('COMMUNITY', 'Registry fetched successfully');
                return this.cachedRegistry!;
            } catch (error) {
                fetchLogger.error('COMMUNITY', 'Failed to fetch registry', error as Error);

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
            this.logger.error('COMMUNITY', 'Failed to download script', { scriptId, error });
            throw new Error(`Failed to download script: ${scriptId}`);
        }
    }

    async installScript(scriptId: string): Promise<void> {
        return await this.logger.withScope(`📦 Installing ${scriptId}`, async (scopedLogger) => {
            const settings = this.getSettings();

            // Validation phase
            await scopedLogger.withScope('✅ Validation', async (validationLogger) => {
                if (settings.installedCommunityScripts.some(s => s.scriptId === scriptId)) {
                    validationLogger.error('COMMUNITY', 'Script already installed', { scriptId });
                    throw new Error(`Script "${scriptId}" is already installed`);
                }
                validationLogger.debug('COMMUNITY', 'Validation passed');
            });

            scopedLogger.info('COMMUNITY', 'Starting script installation', { scriptId });

            // Download phase
            const { scriptCode, scriptMeta } = await scopedLogger.withScope('⬇️ Download', async (downloadLogger) => {
                downloadLogger.debug('COMMUNITY', 'Downloading script code');
                const code = await this.downloadScript(scriptId);

                downloadLogger.debug('COMMUNITY', 'Fetching metadata');
                const registry = await this.fetchRegistry();
                const meta = registry.scripts.find(s => s.id === scriptId);
                if (!meta) {
                    downloadLogger.error('COMMUNITY', 'Script metadata not found', { scriptId });
                    throw new Error('Script metadata not found');
                }

                downloadLogger.info('COMMUNITY', 'Download complete', {
                    version: meta.version,
                    size: code.length
                });

                return { scriptCode: code, scriptMeta: meta };
            });

            // File system operations phase
            await scopedLogger.withScope('💾 File System', async (fsLogger) => {
                const localPath = `${this.SCRIPTS_FOLDER}/${scriptId}.js`;
                const adapter = this.app.vault.adapter;
                const folderPath = `.obsidian/plugins/tagverse/${this.SCRIPTS_FOLDER}`;

                // Ensure folder exists
                await fsLogger.withScope('📁 Create Folder', async (folderLogger) => {
                    try {
                        await adapter.mkdir(folderPath);
                        folderLogger.debug('COMMUNITY', 'Created scripts folder', { folderPath });
                    } catch (e) {
                        folderLogger.debug('COMMUNITY', 'Scripts folder already exists', { folderPath });
                    }
                });

                // Write script file
                await fsLogger.withScope('📝 Write File', async (writeLogger) => {
                    const fullPath = `.obsidian/plugins/tagverse/${localPath}`;
                    try {
                        await adapter.write(fullPath, scriptCode);
                        writeLogger.info('COMMUNITY', 'Script file written', {
                            fullPath,
                            size: scriptCode.length
                        });
                    } catch (error) {
                        writeLogger.error('COMMUNITY', 'Failed to write script file', { fullPath, error });
                        throw new Error(`Failed to write script file: ${error.message || error}`);
                    }
                });

                // Track installation
                await fsLogger.withScope('⚙️ Update Settings', async (settingsLogger) => {
                    settings.installedCommunityScripts.push({
                        scriptId,
                        version: scriptMeta.version,
                        installedAt: Date.now(),
                        customTag: '',
                        localPath: `${this.SCRIPTS_FOLDER}/${scriptId}.js`
                    });

                    await this.saveSettings(settings);
                    settingsLogger.debug('COMMUNITY', 'Installation tracked in settings');
                });
            });

            scopedLogger.info('COMMUNITY', 'Script installed successfully', { scriptId, version: scriptMeta.version });
            new Notice(`✅ Installed "${scriptMeta.name}"`);
        });
    }

    async uninstallScript(scriptId: string): Promise<void> {
        return await this.logger.withScope(`🗑️ Uninstalling ${scriptId}`, async (scopedLogger) => {
            const settings = this.getSettings();
            const installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

            if (!installed) {
                scopedLogger.error('COMMUNITY', 'Script not installed', { scriptId });
                throw new Error(`Script not installed: ${scriptId}`);
            }

            scopedLogger.info('COMMUNITY', 'Starting script uninstallation', { scriptId });

            // Remove file
            const adapter = this.app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${installed.localPath}`;
            try {
                await adapter.remove(fullPath);
                scopedLogger.debug('COMMUNITY', 'Script file removed', { fullPath });
            } catch (e) {
                scopedLogger.warn('COMMUNITY', 'Failed to remove script file', { scriptId, fullPath, error: e });
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

            scopedLogger.info('COMMUNITY', 'Script uninstalled successfully', { scriptId });
            new Notice(`✅ Uninstalled script`);
        });
    }

    async checkForUpdates(): Promise<Map<string, string>> {
        const settings = this.getSettings();
        const registry = await this.fetchRegistry();
        const updates = new Map<string, string>();

        if (settings.installedCommunityScripts.length > 0) {
            await this.logger.withScope(
                `🔄 Checking updates for ${settings.installedCommunityScripts.length} scripts`,
                async (scopedLogger) => {
                    settings.installedCommunityScripts.forEach(installed => {
                        const latest = registry.scripts.find(s => s.id === installed.scriptId);
                        if (latest && latest.version !== installed.version) {
                            scopedLogger.debug('COMMUNITY', 'Update available', {
                                scriptId: installed.scriptId,
                                currentVersion: installed.version,
                                latestVersion: latest.version
                            });
                            updates.set(installed.scriptId, latest.version);
                        } else {
                            scopedLogger.debug('COMMUNITY', 'Script up to date', {
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
        return await this.logger.withScope(`⬆️ Updating ${scriptId}`, async (scopedLogger) => {
            const settings = this.getSettings();
            let installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

            // Validation phase
            await scopedLogger.withScope('✅ Validation', async (validationLogger) => {
                if (!installed) {
                    validationLogger.error('COMMUNITY', 'Script not installed', { scriptId });
                    throw new Error(`Script not installed: ${scriptId}`);
                }
                validationLogger.debug('COMMUNITY', 'Script is installed', {
                    currentVersion: installed.version
                });
            });

            // TypeScript now knows installed is defined after validation
            if (!installed) return; // This should never happen, but helps TypeScript

            scopedLogger.info('COMMUNITY', 'Starting script update', { scriptId, currentVersion: installed.version });

            // Download phase
            const { scriptCode, scriptMeta } = await scopedLogger.withScope('⬇️ Download Latest', async (downloadLogger) => {
                downloadLogger.debug('COMMUNITY', 'Downloading latest script version');
                const code = await this.downloadScript(scriptId);

                downloadLogger.debug('COMMUNITY', 'Fetching latest metadata');
                const registry = await this.fetchRegistry();
                const meta = registry.scripts.find(s => s.id === scriptId);
                if (!meta) {
                    downloadLogger.error('COMMUNITY', 'Script metadata not found', { scriptId });
                    throw new Error('Script metadata not found');
                }

                downloadLogger.info('COMMUNITY', 'Latest version downloaded', {
                    oldVersion: installed!.version,
                    newVersion: meta.version,
                    size: code.length
                });

                return { scriptCode: code, scriptMeta: meta };
            });

            // File overwrite phase
            await scopedLogger.withScope('💾 Overwrite File', async (fileLogger) => {
                const adapter = this.app.vault.adapter;
                const fullPath = `.obsidian/plugins/tagverse/${installed!.localPath}`;

                try {
                    await adapter.write(fullPath, scriptCode);
                    fileLogger.info('COMMUNITY', 'Script file overwritten', {
                        fullPath,
                        size: scriptCode.length
                    });
                } catch (error) {
                    fileLogger.error('COMMUNITY', 'Failed to write updated script file', { fullPath, error });
                    throw new Error(`Failed to write updated script file: ${error.message || error}`);
                }
            });

            // Update version tracking
            await scopedLogger.withScope('⚙️ Update Settings', async (settingsLogger) => {
                installed!.version = scriptMeta.version;
                await this.saveSettings(settings);
                settingsLogger.debug('COMMUNITY', 'Version tracking updated', {
                    newVersion: scriptMeta.version
                });
            });

            scopedLogger.info('COMMUNITY', 'Script updated successfully', { scriptId, newVersion: scriptMeta.version });
            new Notice(`✅ Updated to v${scriptMeta.version}`);
        });
    }

    getInstalledScripts(): InstalledCommunityScript[] {
        return this.getSettings().installedCommunityScripts;
    }
}
