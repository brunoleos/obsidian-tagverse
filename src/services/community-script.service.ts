import { App, Notice, requestUrl } from 'obsidian';
import {
    CommunityScriptsRegistry,
    CommunityScriptMetadata,
    InstalledCommunityScript,
    TagverseSettings
} from '../types/interfaces';
import { logger } from '../utils/logger';

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
        const settings = this.getSettings();
        const now = Date.now();

        // Return cache if fresh
        if (this.cachedRegistry && (now - settings.lastRegistryFetch) < this.CACHE_DURATION) {
            logger.debug('COMMUNITY', 'Using cached registry');
            return this.cachedRegistry;
        }

        try {
            logger.info('COMMUNITY', 'Fetching registry from GitHub');
            const response = await requestUrl({
                url: settings.communityRegistryUrl,
                method: 'GET'
            });

            this.cachedRegistry = JSON.parse(response.text);
            settings.lastRegistryFetch = now;
            await this.saveSettings(settings);

            logger.info('COMMUNITY', 'Registry fetched successfully', {
                totalScripts: this.cachedRegistry?.totalScripts
            });

            return this.cachedRegistry!;
        } catch (error) {
            logger.error('COMMUNITY', 'Failed to fetch registry', error);

            // Return cached if available, even if stale
            if (this.cachedRegistry) {
                new Notice('Using cached script library (offline mode)');
                return this.cachedRegistry;
            }

            throw new Error('Failed to fetch community scripts registry');
        }
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
            logger.error('COMMUNITY', 'Failed to download script', { scriptId, error });
            throw new Error(`Failed to download script: ${scriptId}`);
        }
    }

    async installScript(scriptId: string): Promise<void> {
        return await logger.withGroup(`📦 Installing ${scriptId}`, async (group) => {
            const settings = this.getSettings();

            // Check if script already installed
            if (settings.installedCommunityScripts.some(s => s.scriptId === scriptId)) {
                logger.error('COMMUNITY', 'Script already installed', { scriptId });
                throw new Error(`Script "${scriptId}" is already installed`);
            }

            logger.info('COMMUNITY', 'Starting script installation', { scriptId });

            // Download script
            const scriptCode = await this.downloadScript(scriptId);

            // Get metadata
            const registry = await this.fetchRegistry();
            const scriptMeta = registry.scripts.find(s => s.id === scriptId);
            if (!scriptMeta) {
                logger.error('COMMUNITY', 'Script metadata not found', { scriptId });
                throw new Error('Script metadata not found');
            }

            // Save to plugin data folder
            const localPath = `${this.SCRIPTS_FOLDER}/${scriptId}.js`;
            const adapter = this.app.vault.adapter;

            // Ensure folder exists
            const folderPath = `.obsidian/plugins/tagverse/${this.SCRIPTS_FOLDER}`;
            try {
                await adapter.mkdir(folderPath);
                logger.debug('COMMUNITY', 'Created scripts folder', { folderPath });
            } catch (e) {
                // Folder might already exist, that's ok
                logger.debug('COMMUNITY', 'Scripts folder already exists', { folderPath });
            }

            // Write script file
            const fullPath = `.obsidian/plugins/tagverse/${localPath}`;
            try {
                await adapter.write(fullPath, scriptCode);
                logger.debug('COMMUNITY', 'Script file written', { fullPath });
            } catch (error) {
                logger.error('COMMUNITY', 'Failed to write script file', { fullPath, error });
                throw new Error(`Failed to write script file: ${error.message || error}`);
            }

            // Track installation (without creating a mapping)
            settings.installedCommunityScripts.push({
                scriptId,
                version: scriptMeta.version,
                installedAt: Date.now(),
                customTag: '', // No tag assigned yet
                localPath
            });

            await this.saveSettings(settings);

            logger.info('COMMUNITY', 'Script installed successfully', { scriptId, version: scriptMeta.version });
            new Notice(`✅ Installed "${scriptMeta.name}"`);
        });
    }

    async uninstallScript(scriptId: string): Promise<void> {
        return await logger.withGroup(`🗑️ Uninstalling ${scriptId}`, async (group) => {
            const settings = this.getSettings();
            const installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

            if (!installed) {
                logger.error('COMMUNITY', 'Script not installed', { scriptId });
                throw new Error(`Script not installed: ${scriptId}`);
            }

            logger.info('COMMUNITY', 'Starting script uninstallation', { scriptId });

            // Remove file
            const adapter = this.app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${installed.localPath}`;
            try {
                await adapter.remove(fullPath);
                logger.debug('COMMUNITY', 'Script file removed', { fullPath });
            } catch (e) {
                logger.warn('COMMUNITY', 'Failed to remove script file', { scriptId, fullPath, error: e });
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

            logger.info('COMMUNITY', 'Script uninstalled successfully', { scriptId });
            new Notice(`✅ Uninstalled script`);
        });
    }

    async checkForUpdates(): Promise<Map<string, string>> {
        const settings = this.getSettings();
        const registry = await this.fetchRegistry();
        const updates = new Map<string, string>();

        if (settings.installedCommunityScripts.length > 0) {
            await logger.withGroup(
                `🔄 Checking updates for ${settings.installedCommunityScripts.length} scripts`,
                async (group) => {
                    settings.installedCommunityScripts.forEach(installed => {
                        const latest = registry.scripts.find(s => s.id === installed.scriptId);
                        if (latest && latest.version !== installed.version) {
                            logger.debug('COMMUNITY', 'Update available', {
                                scriptId: installed.scriptId,
                                currentVersion: installed.version,
                                latestVersion: latest.version
                            });
                            updates.set(installed.scriptId, latest.version);
                        } else {
                            logger.debug('COMMUNITY', 'Script up to date', {
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
        return await logger.withGroup(`⬆️ Updating ${scriptId}`, async (group) => {
            const settings = this.getSettings();
            const installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

            if (!installed) {
                logger.error('COMMUNITY', 'Script not installed', { scriptId });
                throw new Error(`Script not installed: ${scriptId}`);
            }

            logger.info('COMMUNITY', 'Starting script update', { scriptId, currentVersion: installed.version });

            // Download latest version
            const scriptCode = await this.downloadScript(scriptId);

            // Get latest metadata
            const registry = await this.fetchRegistry();
            const scriptMeta = registry.scripts.find(s => s.id === scriptId);
            if (!scriptMeta) {
                logger.error('COMMUNITY', 'Script metadata not found', { scriptId });
                throw new Error('Script metadata not found');
            }

            // Overwrite file
            const adapter = this.app.vault.adapter;
            const fullPath = `.obsidian/plugins/tagverse/${installed.localPath}`;
            try {
                await adapter.write(fullPath, scriptCode);
                logger.debug('COMMUNITY', 'Script file updated', { fullPath });
            } catch (error) {
                logger.error('COMMUNITY', 'Failed to write updated script file', { fullPath, error });
                throw new Error(`Failed to write updated script file: ${error.message || error}`);
            }

            // Update version tracking
            installed.version = scriptMeta.version;
            await this.saveSettings(settings);

            logger.info('COMMUNITY', 'Script updated successfully', { scriptId, newVersion: scriptMeta.version });
            new Notice(`✅ Updated to v${scriptMeta.version}`);
        });
    }

    getInstalledScripts(): InstalledCommunityScript[] {
        return this.getSettings().installedCommunityScripts;
    }
}
