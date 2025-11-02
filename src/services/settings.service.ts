import { Plugin } from 'obsidian';
import { logger, logPluginInit } from '../utils/tagverse-logger';
import { TagverseSettings, DEFAULT_SETTINGS } from '../types/interfaces';
import { ISettingsService } from './interfaces';

/**
 * Service responsible for managing plugin settings.
 * Implements Single Responsibility Principle by focusing only on settings management.
 */
export class SettingsService implements ISettingsService {
    private settings: TagverseSettings;
    private changeCallbacks: Array<(settings: TagverseSettings) => void> = [];

    constructor(private plugin: Plugin) {
        this.settings = { ...DEFAULT_SETTINGS };
    }

    /**
     * Get current settings
     */
    getSettings(): TagverseSettings {
        return this.settings;
    }

    /**
     * Save settings
     */
    async saveSettings(settings: TagverseSettings): Promise<void> {
        this.settings = settings;
        await this.plugin.saveData(settings);
        logger.setLogLevel(settings.logLevel);
        logPluginInit('Settings saved', {
            mappingCount: settings.tagMappings.length,
            logLevel: settings.logLevel
        });

        // Notify all registered callbacks
        this.notifyCallbacks();
    }

    /**
     * Load settings from storage
     */
    async loadSettings(): Promise<void> {
        const loadedData = await this.plugin.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        logger.setLogLevel(this.settings.logLevel);
        logPluginInit('Settings loaded', {
            mappingCount: this.settings.tagMappings.length,
            refreshOnFileChange: this.settings.refreshOnFileChange,
            logLevel: this.settings.logLevel
        });

        this.settings.tagMappings.forEach((m, i) => {
            logPluginInit('Mapping configured', {
                index: i,
                tag: m.tag,
                script: m.scriptPath,
                enabled: m.enabled
            });
        });
    }

    /**
     * Register a callback for settings changes
     */
    onSettingsChanged(callback: (settings: TagverseSettings) => void): void {
        this.changeCallbacks.push(callback);
    }

    /**
     * Notify all registered callbacks of settings changes
     */
    private notifyCallbacks(): void {
        this.changeCallbacks.forEach(callback => {
            try {
                callback(this.settings);
            } catch (error) {
                logger.error('ERROR-HANDLING', 'Settings change callback failed', error);
            }
        });
    }
}
