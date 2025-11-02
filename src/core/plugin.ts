import {
    Plugin,
    MarkdownView,
    Notice
} from 'obsidian';
import { logger, logPluginInit, logUserAction } from '../utils/tagverse-logger';
import { LivePreviewRenderer } from './live-preview-renderer';
import { ReadingModeRenderer } from './reading-mode-renderer';
import { TagverseSettingTab } from '../settings/settings-tab';
import { TagverseSettings } from '../types/interfaces';
import { ScriptLoaderService } from '../services/script-loader.service';
import { TagMappingService } from '../services/tag-mapping.service';
import { SettingsService } from '../services/settings.service';
import { RendererFactoryService } from '../services/renderer-factory.service';
import { CommunityScriptService } from '../services/community-script.service';
import { IScriptLoader, ITagMappingProvider, ISettingsService } from '../services/interfaces';

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
        await logger.withGroup('🚀 Plugin Initialization', async (group) => {
            logPluginInit('Plugin initialization started', undefined, group);

            TagversePluginInstance = this;

            // Initialize services
            this.initializeServices();
            logPluginInit('Services initialized', undefined, group);

            // Load settings
            await this.settingsService.loadSettings();
            logPluginInit('Settings loaded', {
                refreshOnFileChange: this.settings.refreshOnFileChange,
                logLevel: this.settings.logLevel
            }, group);

            // Initialize community script service
            this.communityService = new CommunityScriptService(
                this.app,
                () => this.settings,
                async (settings) => await this.saveSettings(settings)
            );
            logPluginInit('Community script service initialized', undefined, group);

            // Initialize tag mappings after settings are loaded
            await this.tagMapping.rebuildMappings(this.settings.tagMappings);

            // Check for script updates on startup if enabled (before registering callback to avoid duplicate rebuilds)
            if (this.settings.checkForUpdatesOnStartup) {
                await this.checkForScriptUpdates();
            }

            // Setup settings change handler (after initial update check to prevent duplicate callbacks)
            this.settingsService.onSettingsChanged((settings) => {
                this.onSettingsChanged();
            });

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
            logPluginInit('Markdown post processor registered', undefined, group);

            // Register live preview processor (source mode will show plain text)
            this.registerEditorExtension(
                LivePreviewRenderer.registerLivePreviewExtension(
                    this.app,
                    this.tagMapping,
                    this.rendererFactory
                )
            );
            logPluginInit('Live preview processor registered', undefined, group);

            // Register event for file changes if enabled
            this.registerEvent(
                this.app.workspace.on('file-open', (file) => {
                    if (this.settings.refreshOnFileChange) {
                        this.refreshActiveView();
                    }
                })
            );

            // Register event for layout changes to detect mode switches
            this.registerEvent(
                this.app.workspace.on('layout-change', () => {
                    this.checkForModeChange();
                })
            );

            // Add settings tab
            this.settingTab = new TagverseSettingTab(this.app, this);
            this.addSettingTab(this.settingTab);
            logPluginInit('Settings tab added', undefined, group);

            // Add command to refresh current view
            this.addCommand({
                id: 'refresh-dynamic-tags',
                name: 'Refresh tagverses in current note',
                callback: () => {
                    logUserAction('Refresh tagverses command executed');
                    this.refreshActiveView();
                    new Notice('Tagverses refreshed');
                }
            });

            // Add command to clear script cache
            this.addCommand({
                id: 'clear-script-cache',
                name: 'Clear script cache',
                callback: () => {
                    logUserAction('Clear script cache command executed');
                    this.scriptLoader.clearCache();
                    new Notice('Script cache cleared');
                }
            });

            logPluginInit('Plugin loaded successfully', undefined, group);
        });
    }

    onunload() {
        TagversePluginInstance = null;
        this.scriptLoader.clearCache();
        logPluginInit('Plugin unloaded successfully');
    }

    /**
     * Initialize all services with proper dependency injection
     */
    private initializeServices(): void {
        // Create service instances
        this.scriptLoader = new ScriptLoaderService();
        this.tagMapping = new TagMappingService();
        this.settingsService = new SettingsService(this);
        this.rendererFactory = new RendererFactoryService(this.scriptLoader, this.app);
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
    private onSettingsChanged(): void {
        const settings = this.settings;

        // Update tag mappings
        this.tagMapping.rebuildMappings(settings.tagMappings);

        // Clear script cache when settings change
        this.scriptLoader.clearCache();

        // Refresh active view
        this.refreshActiveView();

        logPluginInit('Settings changed, services updated');
    }

    /**
     * Check if the active view's mode has changed and refresh if needed
     */
    private checkForModeChange(): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const currentMode = activeView.getMode();

            // Check if mode changed
            if (this.lastActiveViewMode !== null && this.lastActiveViewMode !== currentMode) {
                logPluginInit(`View mode changed from ${this.lastActiveViewMode} to ${currentMode}, refreshing`);
                this.refreshActiveView();
            }

            // Update last known mode
            this.lastActiveViewMode = currentMode;
        }
    }

    private refreshActiveView() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            const currentMode = view.getMode();
            if (currentMode === 'preview') {
                // Force re-render in reading mode
                view.previewMode.rerender(true);
            } else if (currentMode === 'source') {
                // Force complete live preview decoration rebuild
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
                        logPluginInit('Live preview decorations invalidated with forced update');
                    }
                } catch (error) {
                    // If not live preview or CodeMirror not accessible, ignore
                    logPluginInit('Could not invalidate live preview decorations', error);
                }
            }
        }
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
            logger.debug('COMMUNITY', 'Update check failed', error);
        }
    }
}
