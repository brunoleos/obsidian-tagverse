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

// ========== LOGGING UTILITY ==========
class Logger {
    private prefix = '[DTR]';
    private enabled = true;

    private formatMessage(component: string, event: string, data?: any): string {
        const timestamp = new Date().toISOString().split('T')[1];
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `${this.prefix} ${timestamp} | ${component} | ${event}${dataStr}`;
    }

    init(message: string, data?: any) {
        if (this.enabled) console.log(this.formatMessage('INIT', message, data));
    }

    debug(component: string, event: string, data?: any) {
        if (this.enabled) console.log(this.formatMessage(component, event, data));
    }

    info(component: string, event: string, data?: any) {
        if (this.enabled) console.info(this.formatMessage(component, event, data));
    }

    warn(component: string, event: string, data?: any) {
        if (this.enabled) console.warn(this.formatMessage(component, event, data));
    }

    error(component: string, event: string, error: any) {
        if (this.enabled) console.error(this.formatMessage(component, event, { error: error.message || error }));
    }

    logModeChange(from: string, to: string) {
        this.info('MODE', 'Changed', { from, to });
    }

    logTagDecision(tag: string, decision: string, reason: string, details?: any) {
        this.debug('MATCH', 'Decision', { tag, decision, reason, ...details });
    }

    logUserAction(action: string, details?: any) {
        this.info('USER', action, details);
    }

    logSettings(mappings: TagScriptMapping[]) {
        this.init('Settings loaded', { mappingCount: mappings.length });
        mappings.forEach((m, i) => {
            this.init(`Mapping[${i}]`, { tag: m.tag, script: m.scriptPath, enabled: m.enabled });
        });
    }
}

const logger = new Logger();
// ========================================

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
}

const DEFAULT_SETTINGS: TagverseSettings = {
    tagMappings: [],
    refreshOnFileChange: true
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
        logger.debug('WIDGET', 'Created', { tag: this.tag, script: this.mapping.scriptPath, source: this.sourcePath });

        // Create container immediately and start async loading
        this.container = createSpan({ cls: 'dtr-widget-container' });
        this.startLoading();
    }

    eq(other: TagverseWidget): boolean {
        return other.tag === this.tag && other.sourcePath === this.sourcePath;
    }

    toDOM(): HTMLElement {
        logger.debug('WIDGET', 'toDOM called', { tag: this.tag, rendered: this.rendered });
        return this.container;
    }

    private startLoading() {
        if (this.rendered) return;
        this.rendered = true;

        // Show loading state initially
        this.container.textContent = `Loading #${this.tag}...`;

        // Start async content loading
        this.renderContent().catch(error => {
            logger.error('WIDGET', 'Loading failed', error);
            this.container.textContent = `[Error: #${this.mapping.tag}]`;
        });
    }

    private async renderContent() {
        // Loading already started in startLoading(), no need to check rendered again
        console.group(`👁️ [DTR] Live Preview: #${this.tag}`);

        try {
            logger.debug('LIVE-MODE', 'Starting render', {
                tag: this.tag,
                script: this.mapping.scriptPath,
                sourcePath: this.sourcePath
            });

            const renderFunction = await this.plugin.loadScript(this.mapping.scriptPath);
            logger.debug('LIVE-MODE', 'Script loaded', { tag: this.tag });

            // Create a temporary container for the script to render into (not added to DOM)
            const tempContainer = createSpan();

            const scriptContext: ScriptContext = {
                app: this.plugin.app,
                tag: this.mapping.tag,
                element: tempContainer,
                sourcePath: this.sourcePath,
                frontmatter: this.frontmatter,
                Notice: Notice
            };

            const result = await renderFunction(scriptContext);

            // Log script return value with full HTML
            if (result instanceof HTMLElement) {
                const resultStyle = window.getComputedStyle(result);
                logger.debug('LIVE-SCRIPT', 'Return value (HTMLElement)', {
                    tag: this.tag,
                    tagName: result.tagName,
                    className: result.className,
                    display: resultStyle.display,
                    position: resultStyle.position
                });
                console.log('📦 Script return innerHTML:', result.innerHTML);
                console.log('📦 Script return outerHTML:', result.outerHTML);
            } else {
                logger.debug('LIVE-SCRIPT', 'Return value', {
                    tag: this.tag,
                    type: typeof result,
                    isNull: result === null || result === undefined
                });
            }

            // Output validation and fallback - update container directly
            let contentElement: HTMLElement;

            if (result === null || result === undefined) {
                // Show plain tag if script returns nothing
                contentElement = createSpan({ text: `#${this.tag}` });
                logger.debug('LIVE-MODE', 'Output: null/undefined - showing plain tag', { tag: this.tag });
            } else if (typeof result === 'string') {
                // For string results, create a span and set innerHTML
                contentElement = createSpan();
                contentElement.innerHTML = result;
                logger.debug('LIVE-MODE', 'Output: string HTML - direct return', { tag: this.tag, length: result.length });
                console.log('📝 String content:', result);
            } else if (result instanceof HTMLElement) {
                // Use inline-block wrapper to contain block content in editor line
                const wrapper = createSpan({ cls: 'dtr-inline-wrapper' });
                wrapper.style.display = 'inline-block';
                wrapper.style.verticalAlign = 'top';
                wrapper.style.maxWidth = '100%';
                wrapper.style.overflow = 'visible';
                wrapper.appendChild(result);
                contentElement = wrapper;
                logger.debug('LIVE-MODE', 'Output: HTMLElement - inline wrapper for block content', { tag: this.tag, element: result.tagName });
            } else {
                // Show error if output type is invalid
                contentElement = createSpan({
                    cls: 'dynamic-tag-error',
                    text: `[Invalid output for #${this.mapping.tag}]`
                });
                logger.warn('LIVE-MODE', 'Invalid output type', { tag: this.tag, type: typeof result });
            }

            // Update the widget container
            this.container.innerHTML = '';
            this.container.appendChild(contentElement);

            logger.debug('LIVE-MODE', 'Render complete', { tag: this.tag });

        } catch (error) {
            logger.error('LIVE-MODE', 'Rendering failed', error);
            this.plugin.app.workspace.onLayoutReady(() => {
                new Notice(`Error rendering tag #${this.mapping.tag}: ${error.message}`);
            });
            // Update container with error message
            this.container.innerHTML = '';
            this.container.appendChild(createSpan({
                cls: 'dynamic-tag-error',
                text: `[Error: #${this.mapping.tag}]`
            }));
        } finally {
            console.groupEnd();
        }
    }
}

export let TagversePluginInstance: TagversePlugin | null = null;

export default class TagversePlugin extends Plugin {
    settings: TagverseSettings;
    private scriptCache: Map<string, Function> = new Map();

    async onload() {
        logger.init('Plugin loading...');
        TagversePluginInstance = this;
        await this.loadSettings();

        // Register markdown post processor for reading mode
        this.registerMarkdownPostProcessor(this.processMarkdown.bind(this));
        logger.debug('INIT', 'Registered markdown post processor');

        // Register live preview processor (source mode will show plain text)
        this.registerLivePreviewProcessor();
        logger.debug('INIT', 'Registered live preview processor');

        // Register event for file changes if enabled
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                logger.info('WORKSPACE', 'File opened', { path: file?.path });
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
                    logger.info('WORKSPACE', 'Active leaf changed', { 
                        viewType: view.getViewType(), 
                        mode: mode 
                    });
                    
                    // Inspect DOM when view changes
                    this.inspectDOMState(mode);
                }
            })
        );

        // Register workspace event for layout changes
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                logger.info('WORKSPACE', 'Layout changed');
                
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

        // Add command to refresh current view
        this.addCommand({
            id: 'refresh-dynamic-tags',
            name: 'Refresh tagverses in current note',
            callback: () => {
                logger.logUserAction('Command: Refresh tagverses');
                this.refreshActiveView();
                new Notice('Tagverses refreshed');
            }
        });

        // Add command to clear script cache
        this.addCommand({
            id: 'clear-script-cache',
            name: 'Clear script cache',
            callback: () => {
                logger.logUserAction('Command: Clear script cache');
                this.scriptCache.clear();
                new Notice('Script cache cleared');
            }
        });

        logger.init('Plugin loaded successfully');
    }

    onunload() {
        TagversePluginInstance = null;
        this.scriptCache.clear();
        // Plugin unloaded successfully
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        logger.logSettings(this.settings.tagMappings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.scriptCache.clear(); // Clear cache when settings change
        this.refreshActiveView();
    }

    private async processMarkdown(
        element: HTMLElement,
        context: MarkdownPostProcessorContext
    ) {
        logger.debug('READING', 'Processing markdown', { sourcePath: context.sourcePath });
        
        // Find all tag elements in the markdown
        const tagElements = element.findAll('a.tag');
        logger.debug('READING', 'Tags found', { count: tagElements.length });
        
        for (const tagEl of tagElements) {
            const tagText = tagEl.getAttribute('data-tag-name') || tagEl.textContent?.replace('#', '');
            if (!tagText) continue;
            
            logger.debug('READING', 'Processing tag', { tag: tagText });
            
            // Case-insensitive tag matching
            const mapping = this.settings.tagMappings.find(
                m => m.enabled && m.tag.toLowerCase() === tagText.toLowerCase()
            );

            if (mapping) {
                logger.debug('READING', 'Mapping found', { tag: tagText, script: mapping.scriptPath });
                await this.renderDynamicTag(tagEl, mapping, context);
            } else {
                logger.debug('READING', 'No mapping found', { tag: tagText });
            }
        }
    }

    private async renderDynamicTag(
        tagEl: HTMLElement,
        mapping: TagScriptMapping,
        context: MarkdownPostProcessorContext
    ) {
        console.group(`📖 [DTR] Reading Mode: #${mapping.tag}`);

        try {
            logger.debug('READING-MODE', 'Starting render', {
                tag: mapping.tag,
                script: mapping.scriptPath,
                sourcePath: context.sourcePath
            });

            // Load and execute the script
            const renderFunction = await this.loadScript(mapping.scriptPath);
            logger.debug('READING-MODE', 'Script loaded', { tag: mapping.tag });

            // Create a temporary container for the script to render into (not added to DOM)
            const tempContainer = createSpan();

            // Prepare context for the script
            const scriptContext: ScriptContext = {
                app: this.app,
                tag: mapping.tag,
                element: tempContainer,
                sourcePath: context.sourcePath,
                frontmatter: context.frontmatter,
                Notice: Notice
            };

            // Execute the render function
            const result = await renderFunction(scriptContext);

            // Log script return value with full HTML
            if (result instanceof HTMLElement) {
                const resultStyle = window.getComputedStyle(result);
                logger.debug('READING-SCRIPT', 'Return value (HTMLElement)', {
                    tag: mapping.tag,
                    tagName: result.tagName,
                    className: result.className,
                    display: resultStyle.display,
                    position: resultStyle.position
                });
                console.log('📦 Script return innerHTML:', result.innerHTML);
                console.log('📦 Script return outerHTML:', result.outerHTML);
            } else {
                logger.debug('READING-SCRIPT', 'Return value', {
                    tag: mapping.tag,
                    type: typeof result,
                    isNull: result === null || result === undefined
                });
            }

            // Output validation and fallback - invisible wrapper
            const wrapper = createSpan(); // Completely transparent inline wrapper

            if (result === null || result === undefined) {
                // Show original tag if script returns nothing
                wrapper.appendChild(tagEl.cloneNode(true));
                logger.debug('READING-MODE', 'Output: null/undefined - showing original tag', { tag: mapping.tag });
            } else if (typeof result === 'string') {
                // For string results, create a span and set innerHTML
                const stringEl = createSpan();
                stringEl.innerHTML = result;
                wrapper.appendChild(stringEl);
                logger.debug('READING-MODE', 'Output: string HTML - wrapped', { tag: mapping.tag, length: result.length });
                console.log('📝 String content:', result);
            } else if (result instanceof HTMLElement) {
                // Wrap script output in transparent container for editor compatibility
                wrapper.appendChild(result);
                logger.debug('READING-MODE', 'Output: HTMLElement - wrapped', { tag: mapping.tag, element: result.tagName });
            } else {
                // Show error if output type is invalid
                const errorEl = createSpan({
                    cls: 'dynamic-tag-error',
                    text: `[Invalid output for #${mapping.tag}]`
                });
                wrapper.appendChild(errorEl);
                logger.warn('READING-MODE', 'Invalid output type', { tag: mapping.tag, type: typeof result });
            }

            tagEl.replaceWith(wrapper);

            logger.debug('READING-MODE', 'Render complete', { tag: mapping.tag });

        } catch (error) {
            logger.error('READING-MODE', 'Rendering failed', error);
            // Use Notice for user feedback instead of console.error
            new Notice(`Error rendering tag #${mapping.tag}: ${error.message}`);
            const errorEl = createSpan({
                cls: 'dynamic-tag-error',
                text: `[Error: #${mapping.tag}]`
            });
            tagEl.replaceWith(errorEl);
        } finally {
            console.groupEnd();
        }
    }

    async loadScript(scriptPath: string): Promise<Function> {
        // Check cache first
        if (this.scriptCache.has(scriptPath)) {
            return this.scriptCache.get(scriptPath)!;
        }

        // Load the script file
        const file = this.app.vault.getAbstractFileByPath(scriptPath);

        if (!file || !(file instanceof TFile)) {
            throw new Error(`Script file not found or not a file: ${scriptPath}`);
        }

        const scriptContent = await this.app.vault.read(file);

        // Create a function from the script content
        // The script should export a render function
        try {
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

            // Cache the function
            this.scriptCache.set(scriptPath, scriptFunction);

            return scriptFunction;
        } catch (error) {
            // Provide more detailed error information
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

                logger.debug('MATCH', 'Tag found', { tag, pos, length: tagLength, cursor });

                // Check mode
                const isLivePreview = isEditorInLivePreviewMode(view);
                logger.debug('MATCH', 'Mode check', { tag, isLivePreview });

                // Check cursor position
                const cursorInside = isCursorInsideTag(view, pos, tagLength);
                const selectionContains = isSelectionContainsTag(view, pos, tagLength);
                logger.debug('MATCH', 'Cursor check', { tag, cursorInside, selectionContains, cursor, start: pos, end: pos + tagLength });

                // Check if this tag has a mapping
                const mapping = this.settings.tagMappings.find(
                    m => m.enabled && m.tag.toLowerCase() === tag.toLowerCase()
                );

                // When cursor is inside tag (in live preview), show natively for editing
                if (isLivePreview && cursorInside) {
                    logger.logTagDecision(tag, 'NULL', 'cursor inside (show natively)', { pos, cursor });
                    return null; // Let Obsidian handle natively - no decoration
                }

                // In live preview, always show widgets for mapped tags when cursor is outside
                if (mapping) {
                    logger.logTagDecision(tag, 'REPLACE', 'widget', { pos, script: mapping.scriptPath });
                    
                    // Get frontmatter from the current file
                    const file = this.app.workspace.getActiveFile();
                    let frontmatter = {};
                    if (file) {
                        const cache = this.app.metadataCache.getFileCache(file);
                        frontmatter = cache?.frontmatter || {};
                    }

                    return Decoration.replace({
                        widget: new TagverseWidget(this, tag, mapping, file?.path || '', frontmatter),
                    });
                }

                // Unmapped tags in live preview: return null for native styling
                logger.logTagDecision(tag, 'NULL', 'no mapping found', { pos });
                return null;
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
                this.logDecorationState(view, 'Constructor');
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
                    
                    // Log BEFORE rebuild
                    this.logDecorationState(update.view, 'Before rebuild');
                    
                    const isLivePreview = isEditorInLivePreviewMode(update.view);
                    // Only create decorations in live preview mode to avoid double-rendering with native hashtags
                    this.decorations = isLivePreview ? tagMatchDecorator.createDeco(update.view) : Decoration.none;
                    
                    // Log AFTER rebuild
                    this.logDecorationState(update.view, 'After rebuild');
                }
            }

            logDecorationState(view: EditorView, context: string) {
                // Log decoration set size
                logger.debug('DECO-STATE', context, {
                    size: this.decorations.size,
                    isEmpty: this.decorations.size === 0
                });

                // Log DOM state - check for script elements (no longer using containers)
                const scriptElements = view.dom.querySelectorAll('[class*="stress-"], [class*="dynamic-tag-error"]');
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
        console.group(`🔍 [DTR] DOM Inspection - ${mode.toUpperCase()} mode`);

        try {
            // Find all script-generated elements (no longer using wrapper containers)
            const scriptElements = document.querySelectorAll('[class*="stress-"], [class*="dynamic-tag-error"]');
            logger.info('DOM-INSPECT', 'Script elements found', { mode, count: scriptElements.length });

            // Log theme and CSS information
            console.log('🎨 Active theme:', this.getActiveTheme());
            console.log('🎨 Applied stylesheets:', Array.from(document.styleSheets).map((sheet, i) => ({
                index: i,
                href: sheet.href || 'inline',
                title: sheet.title || 'no-title',
                rules: sheet.cssRules?.length || 0
            })));

            scriptElements.forEach((element, index) => {
                const htmlElement = element as HTMLElement;
                const computedStyle = window.getComputedStyle(htmlElement);

                // Get the tag name from the content
                const contentPreview = htmlElement.textContent?.substring(0, 50) || '';

                logger.debug('DOM-INSPECT', `Element[${index}]`, {
                    mode,
                    tagName: htmlElement.tagName,
                    className: htmlElement.className,
                    display: computedStyle.display,
                    position: computedStyle.position,
                    width: computedStyle.width,
                    height: computedStyle.height,
                    float: computedStyle.float,
                    verticalAlign: computedStyle.verticalAlign,
                    margin: computedStyle.margin,
                    padding: computedStyle.padding,
                    lineHeight: computedStyle.lineHeight,
                    fontSize: computedStyle.fontSize,
                    whiteSpace: computedStyle.whiteSpace,
                    wordWrap: computedStyle.wordWrap,
                    overflow: computedStyle.overflow,
                    contentPreview
                });

                console.log(`📦 Element[${index}] innerHTML:`, htmlElement.innerHTML);
                console.log(`📦 Element[${index}] outerHTML:`, htmlElement.outerHTML);

                // Log computed styles for all elements in the hierarchy
                this.logElementStyles(htmlElement, index, mode);

                // Log parent chain with detailed styles
                let parent = htmlElement.parentElement;
                let level = 1;
                const parentChain: string[] = [];
                while (parent && level <= 5) { // Increased depth
                    const parentStyle = window.getComputedStyle(parent);
                    parentChain.push(`${parent.tagName}.${parent.className || '(no class)'}`);
                    logger.debug('DOM-INSPECT', `Element[${index}] Parent[${level}]`, {
                        tag: parent.tagName,
                        className: parent.className,
                        display: parentStyle.display,
                        position: parentStyle.position,
                        width: parentStyle.width,
                        height: parentStyle.height,
                        margin: parentStyle.margin,
                        padding: parentStyle.padding,
                        lineHeight: parentStyle.lineHeight,
                        fontSize: parentStyle.fontSize
                    });
                    parent = parent.parentElement;
                    level++;
                }
                console.log(`🔗 Element[${index}] Parent chain:`, parentChain.join(' → '));
            });

            if (scriptElements.length === 0) {
                logger.warn('DOM-INSPECT', 'No script elements found', { mode });
            }

        } catch (error) {
            logger.error('DOM-INSPECT', 'Inspection failed', error);
        } finally {
            console.groupEnd();
        }
    }

    private getActiveTheme(): string {
        // Try to detect the active theme
        const bodyClasses = document.body.className;
        if (bodyClasses.includes('theme-dark')) return 'Dark';
        if (bodyClasses.includes('theme-light')) return 'Light';
        return 'Unknown';
    }

    private logElementStyles(element: HTMLElement, containerIndex: number, mode: string) {
        console.group(`🎨 Container[${containerIndex}] Style Analysis`);

        try {
            // Log all child elements and their computed styles
            const allElements = element.querySelectorAll('*');
            const elements = [element, ...Array.from(allElements)];

            elements.forEach((el, elIndex) => {
                const htmlEl = el as HTMLElement;
                const style = window.getComputedStyle(htmlEl);

                // Only log elements that might affect layout
                if (elIndex === 0 || style.display !== 'inline' || htmlEl.children.length > 0) {
                    console.log(`  ${elIndex === 0 ? '📦 Container' : `  ${htmlEl.tagName}.${htmlEl.className || '(no class)'}`}:`, {
                        display: style.display,
                        position: style.position,
                        width: style.width,
                        height: style.height,
                        margin: style.margin,
                        padding: style.padding,
                        lineHeight: style.lineHeight,
                        fontSize: style.fontSize,
                        whiteSpace: style.whiteSpace,
                        wordWrap: style.wordWrap,
                        overflow: style.overflow,
                        flexDirection: style.flexDirection,
                        alignItems: style.alignItems,
                        justifyContent: style.justifyContent
                    });
                }
            });

        } catch (error) {
            console.error('Style analysis failed:', error);
        } finally {
            console.groupEnd();
        }
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
