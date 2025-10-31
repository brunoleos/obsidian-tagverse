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
    installScript(scriptId: string, customTag: string): Promise<void>;
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

    async installScript(scriptId: string, customTag: string): Promise<void> {
        const settings = this.getSettings();

        // Check if tag already mapped
        if (settings.tagMappings.some(m => m.tag === customTag)) {
            throw new Error(`Tag "${customTag}" is already mapped`);
        }

        // Check if script already installed
        if (settings.installedCommunityScripts.some(s => s.scriptId === scriptId)) {
            throw new Error(`Script "${scriptId}" is already installed`);
        }

        // Download script
        const scriptCode = await this.downloadScript(scriptId);

        // Get metadata
        const registry = await this.fetchRegistry();
        const scriptMeta = registry.scripts.find(s => s.id === scriptId);
        if (!scriptMeta) throw new Error('Script metadata not found');

        // Save to plugin data folder
        const localPath = `${this.SCRIPTS_FOLDER}/${scriptId}.js`;
        const adapter = this.app.vault.adapter;

        // Ensure folder exists
        const folderPath = `${adapter.getBasePath()}/.obsidian/plugins/tagverse/${this.SCRIPTS_FOLDER}`;
        try {
            await adapter.mkdir(folderPath);
        } catch (e) {
            // Folder might already exist, that's ok
        }

        // Write script file
        const fullPath = `${adapter.getBasePath()}/.obsidian/plugins/tagverse/${localPath}`;
        await adapter.write(fullPath, scriptCode);

        // Add mapping
        settings.tagMappings.push({
            tag: customTag,
            scriptPath: `community:${scriptId}`,  // Special prefix
            enabled: true
        });

        // Track installation
        settings.installedCommunityScripts.push({
            scriptId,
            version: scriptMeta.version,
            installedAt: Date.now(),
            customTag,
            localPath
        });

        await this.saveSettings(settings);

        logger.info('COMMUNITY', 'Script installed', { scriptId, customTag });
        new Notice(`Installed "${scriptMeta.name}" as #${customTag}`);
    }

    async uninstallScript(scriptId: string): Promise<void> {
        const settings = this.getSettings();
        const installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

        if (!installed) {
            throw new Error(`Script not installed: ${scriptId}`);
        }

        // Remove file
        const adapter = this.app.vault.adapter;
        const fullPath = `${adapter.getBasePath()}/.obsidian/plugins/tagverse/${installed.localPath}`;
        try {
            await adapter.remove(fullPath);
        } catch (e) {
            logger.warn('COMMUNITY', 'Failed to remove script file', { scriptId, error: e });
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

        logger.info('COMMUNITY', 'Script uninstalled', { scriptId });
        new Notice(`Uninstalled script`);
    }

    async checkForUpdates(): Promise<Map<string, string>> {
        const settings = this.getSettings();
        const registry = await this.fetchRegistry();
        const updates = new Map<string, string>();

        settings.installedCommunityScripts.forEach(installed => {
            const latest = registry.scripts.find(s => s.id === installed.scriptId);
            if (latest && latest.version !== installed.version) {
                updates.set(installed.scriptId, latest.version);
            }
        });

        return updates;
    }

    async updateScript(scriptId: string): Promise<void> {
        const settings = this.getSettings();
        const installed = settings.installedCommunityScripts.find(s => s.scriptId === scriptId);

        if (!installed) {
            throw new Error(`Script not installed: ${scriptId}`);
        }

        // Download latest version
        const scriptCode = await this.downloadScript(scriptId);

        // Get latest metadata
        const registry = await this.fetchRegistry();
        const scriptMeta = registry.scripts.find(s => s.id === scriptId);
        if (!scriptMeta) throw new Error('Script metadata not found');

        // Overwrite file
        const adapter = this.app.vault.adapter;
        const fullPath = `${adapter.getBasePath()}/.obsidian/plugins/tagverse/${installed.localPath}`;
        await adapter.write(fullPath, scriptCode);

        // Update version tracking
        installed.version = scriptMeta.version;
        await this.saveSettings(settings);

        logger.info('COMMUNITY', 'Script updated', { scriptId, newVersion: scriptMeta.version });
        new Notice(`Updated to v${scriptMeta.version}`);
    }

    getInstalledScripts(): InstalledCommunityScript[] {
        return this.getSettings().installedCommunityScripts;
    }
}
