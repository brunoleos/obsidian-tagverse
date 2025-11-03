import { Plugin } from 'obsidian';
import { Logger, LoggerConfig } from '../utils/logger';
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
        await Logger.withScope('⚙️ Save Settings', async () => {
            this.settings = settings;

            await Logger.withScope('💾 Write to Disk', async () => {
                await this.plugin.saveData(settings);
                Logger.debug('SETTINGS', 'Settings written to disk', {
                    mappingCount: settings.tagMappings.length,
                    logLevel: settings.logLevel
                });
            });

            await Logger.withScope('🔧 Update Log Level', async () => {
                LoggerConfig.setLogLevel(settings.logLevel || 'debug');
                Logger.debug('SETTINGS', 'Log level updated', {
                    logLevel: settings.logLevel
                });
            });

            Logger.info('SETTINGS', 'Settings saved', {
                mappingCount: settings.tagMappings.length,
                logLevel: settings.logLevel
            });

            // Notify all registered callbacks
            await Logger.withScope('📢 Notify Callbacks', async () => {
                this.notifyCallbacks();
                Logger.debug('SETTINGS', `Notified ${this.changeCallbacks.length} callback(s)`);
            });
        }); // Auto-flush
    }

    /**
     * Load settings from storage
     */
    async loadSettings(): Promise<void> {
        await Logger.withScope('⚙️ Load Settings', async () => {
            await Logger.withScope('📖 Read from Disk', async () => {
                const loadedData = await this.plugin.loadData();
                this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
                Logger.debug('SETTINGS', 'Settings read from disk', {
                    hasData: !!loadedData,
                    mappingCount: loadedData?.tagMappings?.length || 0
                });
            });

            await Logger.withScope('🔧 Update Log Level', async () => {
                LoggerConfig.setLogLevel(this.settings.logLevel || 'debug');
                Logger.debug('SETTINGS', 'Log level updated', {
                    logLevel: this.settings.logLevel
                });
            });

            Logger.info('SETTINGS', 'Settings loaded', {
                mappingCount: this.settings.tagMappings.length,
                refreshOnFileChange: this.settings.refreshOnFileChange,
                logLevel: this.settings.logLevel
            });

            await Logger.withScope('🗺️ Log Mappings', async () => {
                this.settings.tagMappings.forEach((m, i) => {
                    Logger.debug('SETTINGS', 'Mapping configured', {
                        index: i,
                        tag: m.tag,
                        script: m.scriptPath,
                        enabled: m.enabled
                    });
                });
                Logger.debug('SETTINGS', `Logged ${this.settings.tagMappings.length} mapping(s)`);
            });
        }); // Auto-flush
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
        // Note: This is called from within saveSettings scope, so we don't create a new root scope
        this.changeCallbacks.forEach((callback, index) => {
            try {
                callback(this.settings);
            } catch (error) {
                // Use Logger for synchronous error logging
                Logger.error('ERROR-HANDLING', `Settings change callback ${index} failed`, error as Error);
            }
        });
    }
}
