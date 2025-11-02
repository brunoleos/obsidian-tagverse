import { Plugin } from 'obsidian';
import { createScopedLogger, logger, setDefaultLogLevel, setDefaultLoggerOptions, LogCategory } from '../utils/logger';
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
        await createScopedLogger('⚙️ Save Settings').execute(async (saveLogger) => {
            this.settings = settings;

            await saveLogger.withScope('💾 Write to Disk', async (diskLogger) => {
                await this.plugin.saveData(settings);
                diskLogger.info('SETTINGS', 'Settings written to disk');
            });

            await saveLogger.withScope('🔧 Update Log Level', async (logLevelLogger) => {
                setDefaultLogLevel(settings.logLevel || 'debug');
                logLevelLogger.info('SETTINGS', 'Log level updated', {
                    logLevel: settings.logLevel
                });
            });

            saveLogger.info('SETTINGS', 'Settings saved', {
                mappingCount: settings.tagMappings.length,
                logLevel: settings.logLevel
            });

            // Notify all registered callbacks
            await saveLogger.withScope('📢 Notify Callbacks', async (callbackLogger) => {
                this.notifyCallbacks();
                callbackLogger.info('SETTINGS', `Notified ${this.changeCallbacks.length} callback(s)`);
            });
        }); // Auto-flush
    }

    /**
     * Load settings from storage
     */
    async loadSettings(): Promise<void> {
        await createScopedLogger('⚙️ Load Settings').execute(async (loadLogger) => {
            await loadLogger.withScope('📖 Read from Disk', async (diskLogger) => {
                const loadedData = await this.plugin.loadData();
                this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
                diskLogger.info('SETTINGS', 'Settings read from disk');
            });

            await loadLogger.withScope('🔧 Update Log Level', async (logLevelLogger) => {
                setDefaultLogLevel(this.settings.logLevel || 'debug');
                logLevelLogger.info('SETTINGS', 'Log level updated', {
                    logLevel: this.settings.logLevel
                });
            });

            loadLogger.info('SETTINGS', 'Settings loaded', {
                mappingCount: this.settings.tagMappings.length,
                refreshOnFileChange: this.settings.refreshOnFileChange,
                logLevel: this.settings.logLevel
            });

            await loadLogger.withScope('🗺️ Log Mappings', async (mappingLogger) => {
                this.settings.tagMappings.forEach((m, i) => {
                    mappingLogger.debug('SETTINGS', 'Mapping configured', {
                        index: i,
                        tag: m.tag,
                        script: m.scriptPath,
                        enabled: m.enabled
                    });
                });
                mappingLogger.info('SETTINGS', `Logged ${this.settings.tagMappings.length} mapping(s)`);
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
                // Use InstantLogger for synchronous error logging
                logger.error('ERROR-HANDLING', `Settings change callback ${index} failed`, error as Error);
            }
        });
    }
}
