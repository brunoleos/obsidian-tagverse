import {
    Plugin,
    MarkdownView,
    Notice
} from 'obsidian';
import { Logger, LogCategory } from '../utils/logger';
import { LivePreviewRenderer } from './live-preview-renderer';
import { ReadingModeRenderer } from './reading-mode-renderer';
import { TagverseSettingTab } from '../settings/settings-tab';
import { TagverseSettings } from '../types/interfaces';
import { ScriptLoaderService } from '../services/script-loader.service';
import { TagMappingService } from '../services/tag-mapping.service';
import { SettingsService } from '../services/settings.service';
import { RendererFactoryService } from '../services/renderer-factory.service';
import { CommunityScriptService } from '../services/community-script.service';
import { TagMatchingService } from '../services/tag-matching.service';
import { IScriptLoader, ITagMappingProvider, ISettingsService } from '../services/interfaces';
import { TagParser } from '../utils/tag-parser';

export let TagversePluginInstance: TagversePlugin | null = null;

/**
 * Main plugin class for Tagverse
 */
export default class TagversePlugin extends Plugin {
    // Service instances (dependency injection)
    private scriptLoader: IScriptLoader;
    private tagMapping: ITagMappingProvider;
    private settingsService: ISettingsService;
    private rendererFactory: RendererFactoryService;
    public communityService: CommunityScriptService;
    public settingTab: TagverseSettingTab | null = null;

    // Track the last mode of the active view to detect mode changes
    private lastActiveViewMode: string | null = null;

    // Public getter for settings (backward compatibility)
    get settings(): TagverseSettings {
        return this.settingsService.getSettings();
    }

    async onload() {
        // Execute plugin initialization with auto-flush
        await Logger.withScope('🚀 Plugin Initialization', async () => {
            Logger.debug('PLUGIN-INIT', 'Plugin initialization started', {
                version: this.manifest.version
            });

            TagversePluginInstance = this;

            // Initialize services with nested scope
            await Logger.withScope('📦 Service Initialization', async () => {
                this.initializeServices();
                Logger.debug('PLUGIN-INIT', 'ScriptLoader, TagMapping, Settings, and RendererFactory created');
            });

            // Load settings with nested scope
            await Logger.withScope('⚙️ Settings Loading', async () => {
                await this.settingsService.loadSettings();
                Logger.debug('PLUGIN-INIT', 'Settings loaded', {
                    refreshOnFileChange: this.settings.refreshOnFileChange,
                    logLevel: this.settings.logLevel
                });
            });

            // Initialize community script service with nested scope
            await Logger.withScope('🌐 Community Service Init', async () => {
                this.communityService = new CommunityScriptService(
                    this.app,
                    () => this.settings,
                    async (settings) => await this.saveSettings(settings)
                );
                Logger.debug('PLUGIN-INIT', 'Community script service initialized', {
                    registryUrl: this.settings.communityRegistryUrl
                });
            });

            // Initialize tag mappings after settings are loaded
            await this.tagMapping.rebuildMappings(this.settings.tagMappings);

            // Check for script updates on startup if enabled (before registering callback to avoid duplicate rebuilds)
            if (this.settings.checkForUpdatesOnStartup) {
                await Logger.withScope('🔄 Update Check', async () => {
                    await this.checkForScriptUpdates();
                    Logger.debug('PLUGIN-INIT', 'Script update check completed', {
                        checkForUpdatesOnStartup: this.settings.checkForUpdatesOnStartup
                    });
                });
            }

            // Setup settings change handler (after initial update check to prevent duplicate callbacks)
            this.settingsService.onSettingsChanged((settings) => {
                this.onSettingsChanged();
            });

            // Register processors and event handlers with nested scope
            await Logger.withScope('📝 Registration Phase', async () => {
                // Register markdown post processor for reading mode
                this.registerMarkdownPostProcessor((element, context) => {
                    // Only process when view is actually in reading/preview mode
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (!view || view.getMode() !== 'preview') {
                        return; // Skip if not in reading mode
                    }

                    return ReadingModeRenderer.processMarkdown(
                        this.tagMapping,
                        this.rendererFactory,
                        element,
                        context
                    );
                });
                Logger.debug('PLUGIN-INIT', 'Markdown post processor registered');

                // Register live preview processor (source mode will show plain text)
                this.registerEditorExtension(
                    LivePreviewRenderer.registerLivePreviewExtension(
                        this.app,
                        this.tagMapping,
                        this.rendererFactory
                    )
                );
                Logger.debug('PLUGIN-INIT', 'Live preview processor registered');

                // Register event for file changes if enabled
                this.registerEvent(
                    this.app.workspace.on('file-open', async (file) => {
                        if (this.settings.refreshOnFileChange) {
                            await Logger.withScope('📂 File Opened', async () => {
                                Logger.debug('PLUGIN-EVENT', 'File opened, refreshing tags', {
                                    filePath: file?.path || 'unknown',
                                    refreshOnFileChange: this.settings.refreshOnFileChange
                                });

                                await this.refreshActiveView();
                            });
                        }
                    })
                );

                // Register event for layout changes to detect mode switches
                this.registerEvent(
                    this.app.workspace.on('layout-change', async () => {
                        await this.checkForModeChange();
                    })
                );
                Logger.debug('PLUGIN-INIT', 'Event handlers registered', {
                    refreshOnFileChange: this.settings.refreshOnFileChange
                });

                // Add settings tab
                this.settingTab = new TagverseSettingTab(this.app, this);
                this.addSettingTab(this.settingTab);
                Logger.debug('PLUGIN-INIT', 'Settings tab added');

                // Add command to refresh current view
                this.addCommand({
                    id: 'refresh-dynamic-tags',
                    name: 'Refresh tagverses in current note',
                    callback: async () => {
                        await Logger.withScope('🔄 Manual Refresh', async () => {
                            Logger.debug('PLUGIN-COMMAND', 'Manual refresh command executed');
                            await this.refreshActiveView();
                            new Notice('Tagverses refreshed');
                            Logger.info('PLUGIN-COMMAND', 'Manual refresh completed');
                        });
                    }
                });

                // Add command to clear script cache
                this.addCommand({
                    id: 'clear-script-cache',
                    name: 'Clear script cache',
                    callback: async () => {
                        await Logger.withScope('🗑️ Clear Cache', async () => {
                            Logger.debug('PLUGIN-COMMAND', 'Clear cache command executed');
                            await Logger.withScope('🗑️ Cache Operations', async () => {
                                this.scriptLoader.clearCache();
                                Logger.debug('PLUGIN-COMMAND', 'Script cache cleared');
                            });
                            new Notice('Script cache cleared');
                            Logger.info('PLUGIN-COMMAND', 'Cache clear completed');
                        });
                    }
                });
                Logger.debug('PLUGIN-INIT', 'Commands registered');
            });

            Logger.info('PLUGIN-INIT', 'Plugin loaded successfully');
        }); // Auto-flushes here
    }

    onunload() {
        TagversePluginInstance = null;
        this.scriptLoader.clearCache();

        Logger.info('PLUGIN-INIT', 'Plugin unloaded successfully');
    }

    /**
     * Initialize all services with proper dependency injection
     */
    private initializeServices(): void {
        // Create service instances (no longer need logger parameters)
        this.scriptLoader = new ScriptLoaderService();
        this.tagMapping = new TagMappingService();
        this.settingsService = new SettingsService(this);
        this.rendererFactory = new RendererFactoryService(
            this.scriptLoader,
            this.app
        );
    }

    /**
     * Save settings through the settings service
     */
    async saveSettings(settings: TagverseSettings): Promise<void> {
        await this.settingsService.saveSettings(settings);
    }

    /**
     * Handle settings changes - update dependent services
     */
    private async onSettingsChanged(): Promise<void> {
        await Logger.withScope('⚙️ Settings Changed', async () => {
            const settings = this.settings;
            Logger.debug('PLUGIN-SETTINGS', 'Settings change detected', {
                tagMappingsCount: settings.tagMappings.length,
                logLevel: settings.logLevel
            });

            // Update tag mappings
            await Logger.withScope('🗺️ Update Mappings', async () => {
                this.tagMapping.rebuildMappings(settings.tagMappings);
                Logger.debug('PLUGIN-SETTINGS', 'Tag mappings updated');
            });

            // Clear script cache when settings change
            await Logger.withScope('🗑️ Clear Cache', async () => {
                this.scriptLoader.clearCache();
                Logger.debug('PLUGIN-SETTINGS', 'Script cache cleared');
            });

            // Refresh active view
            await this.refreshActiveView();

            Logger.info('PLUGIN-SETTINGS', 'Settings change handling completed');
        });
    }

    /**
     * Check if the active view's mode has changed and refresh if needed
     */
    private async checkForModeChange(): Promise<void> {
        await Logger.withScope('🔄 Layout Changed', async () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const currentMode = activeView.getMode();

                // Check if mode changed
                if (this.lastActiveViewMode !== null && this.lastActiveViewMode !== currentMode) {
                    Logger.info('PLUGIN-EVENT', `Mode change detected: ${this.lastActiveViewMode} -> ${currentMode}`);
                    await this.refreshActiveView();
                }

                // Update last known mode
                this.lastActiveViewMode = currentMode;
            }

            Logger.debug('PLUGIN-EVENT', 'Mode change check completed');
        });     
    }

    private async refreshActiveView(): Promise<void> {
        await Logger.withScope('🔄 Refresh Tags', async () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const currentMode = view.getMode();
                if (currentMode === 'preview') {
                    // Force re-render in reading mode
                    Logger.debug('PLUGIN-EVENT', `Refreshing reading mode`);
                    view.previewMode.rerender(true);
                } else if (currentMode === 'source') {
                    // Force complete live preview decoration rebuild
                    Logger.debug('PLUGIN-EVENT', `Refreshing live preview`);
                    try {
                        // Access CodeMirror EditorView (this is implementation-specific but necessary)
                        const cm = (view.editor as any).cm;
                        if (cm) {
                            // Dispatch enhanced transaction with user event to force visual update
                            const transactionSpec = {
                                effects: [LivePreviewRenderer.createInvalidateEffect()],
                                userEvent: "invalidate"
                            };
                            cm.dispatch(transactionSpec);
                        }
                    } catch (error) {
                        // If not live preview or CodeMirror not accessible, ignore silently
                        Logger.warn('PLUGIN-EVENT', `Not live preview, or CodeMirror not accessible`);
                    }
                }
            }
            Logger.info('PLUGIN-EVENT', 'Tag refresh completed');
        });
    }

    /**
     * Check for community script updates on startup
     */
    private async checkForScriptUpdates(): Promise<void> {
        try {
            const updates = await this.communityService.checkForUpdates();
            if (updates.size > 0) {
                new Notice(`${updates.size} script update(s) available. Check Community Scripts tab.`);
            }
        } catch (error) {
            // Silent fail - don't bother user with update check failures
        }
    }
}
