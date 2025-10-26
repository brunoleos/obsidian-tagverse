import {
    App,
    Plugin,
    PluginSettingTab,
    Setting,
    MarkdownView,
    MarkdownPostProcessorContext,
    Notice,
    TFile
} from 'obsidian';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType, MatchDecorator } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { logger } from 'logger';

interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

interface ScriptContext {
    app: App;
    tag: string;
    element: HTMLElement;
    sourcePath: string;
    frontmatter: any;
    Notice: typeof Notice;
}

interface TagverseSettings {
    tagMappings: TagScriptMapping[];
    refreshOnFileChange: boolean;
    logLevel: 'debug' | 'info' | 'warning' | 'error';
}

const DEFAULT_SETTINGS: TagverseSettings = {
    tagMappings: [],
    refreshOnFileChange: true,
    logLevel: 'error'
};

class TagverseWidget extends WidgetType {
    private container: HTMLElement;
    private rendered = false;

    constructor(
        private plugin: TagversePlugin,
        private tag: string,
        private mapping: TagScriptMapping,
        private sourcePath: string,
        private frontmatter: any
    ) {
        super();
        logger.logWidgetLifecycle('Created', { tag: this.tag, script: this.mapping.scriptPath, source: this.sourcePath });

        // Create container immediately and start async loading
        this.container = createSpan({ cls: 'tagverse-widget-container' });
        this.startLoading();
    }

    eq(other: TagverseWidget): boolean {
        return other.tag === this.tag && other.sourcePath === this.sourcePath;
    }

    toDOM(): HTMLElement {
        logger.logWidgetLifecycle('DOM requested', { tag: this.tag, rendered: this.rendered });
        return this.container;
    }

    private startLoading() {
        if (this.rendered) return;
        this.rendered = true;

        // Show loading state initially
        this.container.textContent = `Loading #${this.tag}...`;

        // Start async content loading
        this.renderContent().catch(error => {
            logger.logErrorHandling('Widget loading failed', error);
            this.container.textContent = `[Error: #${this.mapping.tag}]`;
        });
    }

    private async renderContent() {
        logger.startGroup('RENDER-LIVE', 'Live preview render started', { tag: this.tag, script: this.mapping.scriptPath });

        try {
            await this.plugin.executeTagScript(
                this.mapping,
                this.sourcePath,
                this.frontmatter,
                contentElement => {
                    this.container.innerHTML = '';
                    this.container.appendChild(contentElement);
                    logger.logRenderPipeline('Render completed successfully', { tag: this.tag });
                },
                'RENDER-LIVE',
                'Widget'
            );
        } catch (error) {
            logger.logErrorHandling('Live preview rendering failed', error);

            this.plugin.app.workspace.onLayoutReady(() => {
                new Notice(`Error rendering tag #${this.mapping.tag}: ${error.message}`);
            });
            // Update container with error message
            this.container.innerHTML = '';
            this.container.appendChild(createSpan({
                cls: 'tagverse-error',
                text: `[Error: #${this.mapping.tag}]`
            }));
        } finally {
            logger.endGroup();
        }
    }
}

export let TagversePluginInstance: TagversePlugin | null = null;

export default class TagversePlugin extends Plugin {
    settings: TagverseSettings;
    private scriptCache: Map<string, Function> = new Map();
    private normalizedTagMap = new Map<string, TagScriptMapping>();

    async onload() {
        logger.logPluginInit('Plugin initialization started');

        TagversePluginInstance = this;
        await this.loadSettings();
        logger.logPluginInit('Settings loaded', { refreshOnFileChange: this.settings.refreshOnFileChange, logLevel: this.settings.logLevel });

        // Register markdown post processor for reading mode
        this.registerMarkdownPostProcessor(this.processMarkdown.bind(this));
        logger.logPluginInit('Markdown post processor registered');

        // Register live preview processor (source mode will show plain text)
        this.registerLivePreviewProcessor();
        logger.logPluginInit('Live preview processor registered');

        // Register event for file changes if enabled
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                if (this.settings.refreshOnFileChange) {
                    this.refreshActiveView();
                }
            })
        );

        // Register workspace event for active leaf changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf && leaf.view.getViewType() === 'markdown') {
                    const view = leaf.view as MarkdownView;
                    const mode = view.getMode();

                    // Inspect DOM when view changes
                    this.inspectDOMState(mode);
                }
            })
        );

        // Register workspace event for layout changes
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                // Inspect DOM state after layout change
                setTimeout(() => {
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        const mode = view.getMode();
                        this.inspectDOMState(mode);
                    }
                }, 50); // Small delay to ensure DOM is updated
            })
        );

        // Add settings tab
        this.addSettingTab(new TagverseSettingTab(this.app, this));
        logger.logPluginInit('Settings tab added');

        // Add command to refresh current view
        this.addCommand({
            id: 'refresh-dynamic-tags',
            name: 'Refresh tagverses in current note',
            callback: () => {
                logger.logUserAction('Refresh tagverses command executed');
                this.refreshActiveView();
                new Notice('Tagverses refreshed');
            }
        });

        // Add command to clear script cache
        this.addCommand({
            id: 'clear-script-cache',
            name: 'Clear script cache',
            callback: () => {
                logger.logUserAction('Clear script cache command executed');
                this.scriptCache.clear();
                new Notice('Script cache cleared');
            }
        });

        logger.logPluginInit('Plugin loaded successfully');
    }

    onunload() {
        TagversePluginInstance = null;
        this.scriptCache.clear();
        // Plugin unloaded successfully
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        logger.setLogLevel(this.settings.logLevel);
        logger.logPluginInit('Settings loaded', { mappingCount: this.settings.tagMappings.length });
        this.settings.tagMappings.forEach((m, i) => {
            logger.logPluginInit(`Mapping configured`, { index: i, tag: m.tag, script: m.scriptPath, enabled: m.enabled });
        });
        this.rebuildTagMap();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        logger.setLogLevel(this.settings.logLevel);
        this.rebuildTagMap();
        this.scriptCache.clear(); // Clear cache when settings change
        this.refreshActiveView();
    }

    private rebuildTagMap() {
        this.normalizedTagMap.clear();
        this.settings.tagMappings.forEach((mapping) => {
            if (mapping.enabled) {
                this.normalizedTagMap.set(mapping.tag.toLowerCase(), mapping);
            }
        });
    }

    private async processMarkdown(
        element: HTMLElement,
        context: MarkdownPostProcessorContext
    ) {
        logger.logRenderPipeline('Markdown processing started', { sourcePath: context.sourcePath });

        // Find all tag elements in the markdown
        const tagElements = element.findAll('a.tag');
        logger.logRenderPipeline('Tags discovered in markdown', { count: tagElements.length, sourcePath: context.sourcePath });

        for (const tagEl of tagElements) {
            const tagText = tagEl.getAttribute('data-tag-name') || tagEl.textContent?.replace('#', '');
            if (!tagText) continue;

            logger.startGroup('TAG-PROCESSING', 'Processing individual tag', { tag: tagText, sourcePath: context.sourcePath });
            logger.logTagMatching('Tag processing started', { tag: tagText, sourcePath: context.sourcePath });

            // Case-insensitive tag matching using optimized map lookup
            const mapping = this.normalizedTagMap.get(tagText.toLowerCase());

            if (mapping) {
                logger.logTagMatching('Mapping found, rendering tag', { tag: tagText, script: mapping.scriptPath });
                await this.renderDynamicTag(tagEl, mapping, context);
            } else {
                logger.logTagMatching('No mapping found, skipping tag', { tag: tagText });
            }

            logger.endGroup();
        }

        logger.logRenderPipeline('Markdown processing completed', { sourcePath: context.sourcePath });
    }

    private async renderDynamicTag(
        tagEl: HTMLElement,
        mapping: TagScriptMapping,
        context: MarkdownPostProcessorContext
    ) {
        logger.startGroup('RENDER-READING', 'Reading mode render started', { tag: mapping.tag, script: mapping.scriptPath });

        try {
            const wrapper = createSpan();
            await this.executeTagScript(
                mapping,
                context.sourcePath,
                context.frontmatter,
                contentElement => {
                    wrapper.appendChild(contentElement);
                    tagEl.replaceWith(wrapper);
                    logger.logRenderPipeline('Render completed successfully', { tag: mapping.tag });
                },
                'RENDER-READING',
                'Reading'
            );
        } catch (error) {
            logger.logErrorHandling('Reading mode rendering failed', error);

            // Use Notice for user feedback instead of console.error
            new Notice(`Error rendering tag #${mapping.tag}: ${error.message}`);
            const errorEl = createSpan({
                cls: 'tagverse-error',
                text: `[Error: #${mapping.tag}]`
            });
            tagEl.replaceWith(errorEl);
        } finally {
            logger.endGroup();
        }
    }

    // ========== REFACTORED HELPERS ==========
    
    private createScriptContext(
        tag: string,
        sourcePath: string,
        frontmatter: any
    ): ScriptContext {
        return {
            app: this.app,
            tag,
            element: createSpan(),
            sourcePath,
            frontmatter,
            Notice
        };
    }

    private logScriptResult(result: any, tag: string) {
        if (result instanceof HTMLElement) {
            logger.logScriptExecution('Script returned HTMLElement', {
                tag,
                elementType: result.tagName,
                hasContent: result.innerHTML.length > 0,
                classes: result.className
            });
        } else if (typeof result === 'string') {
            logger.logScriptExecution('Script returned string', {
                tag,
                length: result.length,
                preview: result.substring(0, 100)
            });
        } else {
            logger.logScriptExecution('Script returned value', {
                tag,
                type: typeof result,
                isNull: result === null || result === undefined
            });
        }
    }

    private processScriptResult(result: any, tag: string, isLivePreview: boolean): HTMLElement {
        if (result === null || result === undefined) {
            const fallback = isLivePreview 
                ? createSpan({ text: `#${tag}` })
                : createSpan();
            logger.logRenderPipeline(
                isLivePreview ? 'Output fallback to plain tag' : 'Output fallback to original tag',
                { tag, reason: 'null/undefined result' }
            );
            return fallback;
        }

        if (typeof result === 'string') {
            const stringEl = createSpan();
            stringEl.innerHTML = result;
            logger.logRenderPipeline('Output rendered as HTML string', { tag, length: result.length });
            return stringEl;
        }

        if (result instanceof HTMLElement) {
            if (isLivePreview) {
                // Use inline-block wrapper for live preview
                const wrapper = createSpan({ cls: 'tagverse-inline-wrapper' });
                wrapper.style.display = 'inline-block';
                wrapper.style.verticalAlign = 'top';
                wrapper.style.maxWidth = '100%';
                wrapper.style.overflow = 'visible';
                wrapper.appendChild(result);
                logger.logRenderPipeline('Output wrapped in inline container', { tag, elementType: result.tagName });
                return wrapper;
            } else {
                // Direct append for reading mode
                logger.logRenderPipeline('Output wrapped in container', { tag, elementType: result.tagName });
                return result;
            }
        }

        // Invalid output type
        const errorEl = createSpan({
            cls: 'tagverse-error',
            text: `[Invalid output for #${tag}]`
        });
        logger.warn(isLivePreview ? 'RENDER-LIVE' : 'RENDER-READING', 'Invalid output type', { tag, type: typeof result });
        return errorEl;
    }

    async executeTagScript(
        mapping: TagScriptMapping,
        sourcePath: string,
        frontmatter: any,
        onReady: (element: HTMLElement) => void,
        groupName: string,
        mode: string
    ) {
        logger.logRenderPipeline('Script loading started', { tag: mapping.tag, script: mapping.scriptPath, sourcePath });
        const renderFunction = await this.loadScript(mapping.scriptPath);
        logger.logCacheOperation('Script loaded from cache or file', { tag: mapping.tag });

        const scriptContext = this.createScriptContext(mapping.tag, sourcePath, frontmatter);

        logger.logScriptExecution('Script execution started', { tag: mapping.tag });
        const result = await renderFunction(scriptContext);

        this.logScriptResult(result, mapping.tag);

        const isLivePreview = groupName === 'RENDER-LIVE';
        const contentElement = this.processScriptResult(result, mapping.tag, isLivePreview);

        onReady(contentElement);
    }

    async loadScript(scriptPath: string): Promise<Function> {
        // Check cache first
        if (this.scriptCache.has(scriptPath)) {
            logger.logCacheOperation('Cache hit', { script: scriptPath });
            return this.scriptCache.get(scriptPath)!;
        }

        logger.logCacheOperation('Cache miss, loading from file', { script: scriptPath });

        // Load the script file
        const file = this.app.vault.getAbstractFileByPath(scriptPath);

        if (!file || !(file instanceof TFile)) {
            logger.logErrorHandling('Script file not found', { script: scriptPath, fileType: typeof file });
            throw new Error(`Script file not found or not a file: ${scriptPath}`);
        }

        try {
            const scriptContent = await this.app.vault.read(file);
            logger.logCacheOperation('Script file read successfully', { script: scriptPath, contentLength: scriptContent.length });

            // Wrap in async function to support await
            const wrappedScript = `
                return (async function(context) {
                    const Notice = context.Notice;
                    ${scriptContent}

                    // If render function is defined, call it
                    if (typeof render === 'function') {
                        return await render(context);
                    }

                    throw new Error('No render() function found in script');
                });
            `;

            const scriptFunction = new Function(wrappedScript)();
            logger.logCacheOperation('Script function created', { script: scriptPath });

            // Cache the function
            this.scriptCache.set(scriptPath, scriptFunction);
            logger.logCacheOperation('Script cached', { script: scriptPath });

            return scriptFunction;
        } catch (error) {
            logger.logErrorHandling('Script loading failed', error);
            throw new Error(`Failed to load script "${scriptPath}": ${error.message}`);
        }
    }

    private registerLivePreviewProcessor() {
        // Helper function to check if editor is in live preview mode (EXACT Jira plugin pattern)
        const isEditorInLivePreviewMode = (view: EditorView) => 
            view.state.field(editorLivePreviewField as unknown as StateField<boolean>);

        // Helper functions for cursor position detection (EXACT Jira plugin pattern)
        const isCursorInsideTag = (view: EditorView, start: number, length: number) => {
            const cursor = view.state.selection.main.head;
            return (cursor > start - 1 && cursor < start + length + 1);
        };

        const isSelectionContainsTag = (view: EditorView, start: number, length: number) => {
            const selectionBegin = view.state.selection.main.from;
            const selectionEnd = view.state.selection.main.to;
            return (selectionEnd > start - 1 && selectionBegin < start + length + 1);
        };

        // Create MatchDecorator for live preview hashtag replacement
        const tagMatchDecorator = new MatchDecorator({
            regexp: /#([a-zA-Z0-9_-]+)/g,
            decoration: (match: RegExpExecArray, view: EditorView, pos: number) => {
                const tag = match[1];
                const tagLength = match[0].length;
                const cursor = view.state.selection.main.head;

                logger.startGroup(`MATCH-${tag}`, 'Tag match processing', { tag, pos, cursor });

                logger.debug('MATCH', 'Tag found', { tag, pos, length: tagLength, cursor });

                // First priority: Check if this tag has a mapping (optimized O(1) lookup)
                const mapping = this.normalizedTagMap.get(tag.toLowerCase());

                // For unmapped tags: immediately exit (most common case - optimize for this!)
                if (!mapping) {
                    logger.logTagMatching('Decision made', { tag, decision: 'NULL', reason: 'no mapping found', pos });
                    logger.endGroup();
                    return null; // Let Obsidian handle natively
                }

                // For mapped tags only: check expensive cursor/mode conditions
                const isLivePreview = isEditorInLivePreviewMode(view);
                logger.debug('MATCH', 'Mode check', { tag, isLivePreview });

                // Check cursor position
                const cursorInside = isCursorInsideTag(view, pos, tagLength);
                const selectionContains = isSelectionContainsTag(view, pos, tagLength);
                logger.debug('MATCH', 'Cursor check', { tag, cursorInside, selectionContains, cursor, start: pos, end: pos + tagLength });

                // When cursor is inside tag (in live preview), show natively for editing
                if (isLivePreview && cursorInside) {
                    logger.logTagMatching('Decision made', { tag, decision: 'NULL', reason: 'cursor inside (show natively)', pos, cursor });
                    logger.endGroup();
                    return null; // Let Obsidian handle natively - no decoration
                }

                // In live preview, always show widgets for mapped tags when cursor is outside
                logger.logTagMatching('Decision made', { tag, decision: 'REPLACE', reason: 'widget', pos, script: mapping.scriptPath });

                // Get frontmatter from the current file
                const file = this.app.workspace.getActiveFile();
                let frontmatter = {};
                if (file) {
                    const cache = this.app.metadataCache.getFileCache(file);
                    frontmatter = cache?.frontmatter || {};
                }

                logger.endGroup();
                return Decoration.replace({
                    widget: new TagverseWidget(this, tag, mapping, file?.path || '', frontmatter),
                });
            }
        });

        // Create ViewPlugin for live preview - only decorate in live preview mode
        const livePreviewPlugin = ViewPlugin.fromClass(class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                logger.debug('VIEWPLUGIN', 'Constructor', { });
                const isLivePreview = isEditorInLivePreviewMode(view);
                // Only create decorations in live preview mode to avoid interfering with native hashtag rendering
                this.decorations = isLivePreview ? tagMatchDecorator.createDeco(view) : Decoration.none;

            }

            update(update: ViewUpdate) {
                // Check if editor mode changed
                const editorModeChanged = update.startState.field(editorLivePreviewField as unknown as StateField<boolean>) !== 
                                         update.state.field(editorLivePreviewField as unknown as StateField<boolean>);
                
                const docChanged = update.docChanged;
                const selectionChanged = update.startState.selection.main !== update.state.selection.main;
                
                logger.debug('VIEWPLUGIN', 'Update called', { 
                    docChanged, 
                    selectionChanged, 
                    editorModeChanged,
                    cursor: update.state.selection.main.head 
                });
                
                // Update decorations if document changed, selection changed, or editor mode changed
                if (docChanged || selectionChanged || editorModeChanged) {
                    logger.debug('VIEWPLUGIN', 'Rebuilding decorations', { 
                        reason: docChanged ? 'doc changed' : selectionChanged ? 'selection changed' : 'mode changed' 
                    });

                    const isLivePreview = isEditorInLivePreviewMode(update.view);
                    // Only create decorations in live preview mode to avoid double-rendering with native hashtags
                    this.decorations = isLivePreview ? tagMatchDecorator.createDeco(update.view) : Decoration.none;
                }
            }

            logDecorationState(view: EditorView, context: string) {
                // Log decoration set size
                logger.debug('DECO-STATE', context, {
                    size: this.decorations.size,
                    isEmpty: this.decorations.size === 0
                });

                // Log DOM state - check for script elements (no longer using containers)
                const scriptElements = view.dom.querySelectorAll('[class*="stress-"], [class*="tagverse-error"]');
                logger.debug('DOM-STATE', context, {
                    scriptElementsFound: scriptElements.length,
                    editorClasses: view.dom.className
                });

                // Log parent element classes to understand context
                const editorParent = view.dom.closest('.cm-editor');
                if (editorParent) {
                    logger.debug('EDITOR-STATE', context, {
                        parentClasses: editorParent.className,
                        isSource: editorParent.classList.contains('mod-source'),
                        isLivePreview: editorParent.classList.contains('mod-live-preview')
                    });
                }

                // Iterate through decorations to see what's actually in the set
                let decoCount = 0;
                const decoTypes: string[] = [];
                this.decorations.between(0, view.state.doc.length, (from, to, deco) => {
                    decoCount++;
                    if (deco.spec.widget) {
                        decoTypes.push('widget');
                    } else if (deco.spec.mark) {
                        decoTypes.push('mark');
                    } else {
                        decoTypes.push('other');
                    }
                });
                logger.debug('DECO-DETAILS', context, {
                    iteratedCount: decoCount,
                    types: decoTypes
                });
            }

            destroy() {
                logger.debug('VIEWPLUGIN', 'Destroyed', {});
            }
        }, {
            decorations: v => v.decorations
        });

        // Register the live preview plugin
        this.registerEditorExtension(livePreviewPlugin);
    }

    private inspectDOMState(mode: string) {
        // DOM inspection - only find elements without logging
        const scriptElements = document.querySelectorAll('[class*="stress-"], [class*="tagverse-error"]');

        // No longer logging DOM inspection details - functionality remains internal
    }

    private refreshActiveView() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            const currentMode = view.getMode();
            if (currentMode === 'preview') {
                // Force re-render in preview mode
                view.previewMode.rerender(true);
            } else if (currentMode === 'source') {
                // In source mode, no decorations to refresh - it's plain text
                // The MatchDecorator will handle live preview mode automatically
                return;
            }
            // For live preview mode, the MatchDecorator will automatically update
        }
    }
}

class TagverseSettingTab extends PluginSettingTab {
    plugin: TagversePlugin;

    constructor(app: App, plugin: TagversePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Tagverse Settings' });

        // General settings
        new Setting(containerEl)
            .setName('Refresh on file change')
            .setDesc('Automatically refresh tagverses when opening a file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.refreshOnFileChange)
                .onChange(async (value) => {
                    this.plugin.settings.refreshOnFileChange = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Log Level')
            .setDesc('Set the verbosity of logging. Default is Error.')
            .addDropdown(dropdown => dropdown
                .addOption('debug', 'Debug')
                .addOption('info', 'Info')
                .addOption('warning', 'Warning')
                .addOption('error', 'Error')
                .setValue(this.plugin.settings.logLevel)
                .onChange(async (value) => {
                    this.plugin.settings.logLevel = value as 'debug' | 'info' | 'warning' | 'error';
                    await this.plugin.saveSettings();
                })
            );

        // Tag mappings section
        containerEl.createEl('h3', { text: 'Tag-Script Mappings' });
        
        const desc = containerEl.createDiv({ cls: 'setting-item-description' });
        desc.innerHTML = `
            <p>Define which tags should be dynamically rendered and which scripts should render them.</p>
            <p><strong>Script format:</strong> Each script should define a <code>render(context)</code> function that receives:</p>
            <ul>
                <li><code>context.app</code> - The Obsidian App instance</li>
                <li><code>context.tag</code> - The tag name</li>
                <li><code>context.element</code> - The container element</li>
                <li><code>context.sourcePath</code> - Path of the note</li>
                <li><code>context.frontmatter</code> - Note frontmatter</li>
            </ul>
        `;

        // Add new mapping button
        new Setting(containerEl)
            .setName('Add new mapping')
            .setDesc('Add a new tag-script mapping')
            .addButton(button => button
                .setButtonText('Add mapping')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.tagMappings.push({
                        tag: '',
                        scriptPath: '',
                        enabled: true
                    });
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        // Display existing mappings
        this.plugin.settings.tagMappings.forEach((mapping, index) => {
            const setting = new Setting(containerEl)
                .setClass('dynamic-tag-mapping')
                .addText(text => text
                    .setPlaceholder('Tag name (without #)')
                    .setValue(mapping.tag)
                    .onChange(async (value) => {
                        mapping.tag = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addText(text => text
                    .setPlaceholder('Script path (e.g., scripts/myRenderer.js)')
                    .setValue(mapping.scriptPath)
                    .onChange(async (value) => {
                        mapping.scriptPath = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addToggle(toggle => toggle
                    .setTooltip('Enable/disable this mapping')
                    .setValue(mapping.enabled)
                    .onChange(async (value) => {
                        mapping.enabled = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addButton(button => button
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings.tagMappings.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );

            setting.infoEl.remove(); // Remove the default name/desc area
        });
    }
}
