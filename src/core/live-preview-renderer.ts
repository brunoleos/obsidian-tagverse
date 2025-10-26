import { 
    Decoration, 
    DecorationSet, 
    EditorView, 
    ViewPlugin, 
    ViewUpdate, 
    MatchDecorator,
    WidgetType
} from '@codemirror/view';
import { App, editorLivePreviewField } from 'obsidian';
import { StateField } from '@codemirror/state';
import { logger } from '../utils/logger';
import { TagScriptMapping } from '../types/interfaces';
import { IScriptLoader, ITagMappingProvider } from '../services/interfaces';
import { TagRenderer } from './renderer';
import { RendererFactoryService } from '../services/renderer-factory.service';

declare global {
    function createSpan(attrs?: any): HTMLSpanElement;
}

/**
 * Renderer for live preview mode.
 * Extends WidgetType for direct CodeMirror integration.
 * Uses dependency injection for services.
 */
export class LivePreviewRenderer extends TagRenderer {
    private _widgetType: TagverseWidgetType;

    constructor(
        scriptLoader: IScriptLoader,
        app: App,
        tag: string,
        mapping: TagScriptMapping,
        sourcePath: string,
        private frontmatter: any
    ) {
        super(scriptLoader, app, tag, mapping, sourcePath);
        
        // Create container immediately
        this.container = createSpan({ cls: 'tagverse-widget-container' });
        
        // Create widget type wrapper
        this._widgetType = new TagverseWidgetType(this);
        
        // Start async loading
        this.render(frontmatter);
    }

    getMode(): 'live-preview' {
        return 'live-preview';
    }

    /**
     * Get the WidgetType for CodeMirror decoration
     */
    getWidgetType(): WidgetType {
        return this._widgetType;
    }

    /**
     * Get the DOM element for this renderer
     */
    getElement(): HTMLElement {
        return this.container!;
    }

    /**
     * Render the tag in live preview mode
     */
    async render(frontmatter: any): Promise<void> {
        if (this.rendered) return;
        this.rendered = true;

        // Show loading state initially
        this.container!.textContent = `Loading #${this.tag}...`;

        try {
            // Execute script and get result
            const result = await this.executeScript(frontmatter);
            
            // Process the result into an HTMLElement
            const contentElement = this.processScriptResult(result);
            
            // Update container with rendered content
            this.container!.innerHTML = '';
            this.container!.appendChild(contentElement);
        } catch (error) {
            // Handle error
            const errorEl = this.handleError(error);
            this.container!.innerHTML = '';
            this.container!.appendChild(errorEl);
        }
    }

    /**
     * Register the live preview CodeMirror extension
     */
    static registerLivePreviewExtension(
        app: App,
        tagMapping: ITagMappingProvider,
        rendererFactory: RendererFactoryService
    ) {
        // Helper function to check if editor is in live preview mode
        const isEditorInLivePreviewMode = (view: EditorView) =>
            view.state.field(editorLivePreviewField as unknown as StateField<boolean>);

        // Helper functions for cursor position detection
        const isCursorInsideTag = (view: EditorView, start: number, length: number) => {
            const cursor = view.state.selection.main.head;
            return (cursor > start - 1 && cursor < start + length + 1);
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

                // Check if this tag has a mapping (optimized O(1) lookup)
                const mapping = tagMapping.getMapping(tag);

                // For unmapped tags: immediately exit
                if (!mapping) {
                    logger.logTagMatching('Decision made', { tag, decision: 'NULL', reason: 'no mapping found', pos });
                    logger.endGroup();
                    return null; // Let Obsidian handle natively
                }

                // For mapped tags: check cursor/mode conditions
                const isLivePreview = isEditorInLivePreviewMode(view);
                logger.debug('MATCH', 'Mode check', { tag, isLivePreview });

                // Check cursor position
                const cursorInside = isCursorInsideTag(view, pos, tagLength);
                logger.debug('MATCH', 'Cursor check', { tag, cursorInside, cursor, start: pos, end: pos + tagLength });

                // When cursor is inside tag (in live preview), show natively for editing
                if (isLivePreview && cursorInside) {
                    logger.logTagMatching('Decision made', { tag, decision: 'NULL', reason: 'cursor inside (show natively)', pos, cursor });
                    logger.endGroup();
                    return null; // Let Obsidian handle natively - no decoration
                }

                // In live preview, show widgets for mapped tags when cursor is outside
                logger.logTagMatching('Decision made', { tag, decision: 'REPLACE', reason: 'widget', pos, script: mapping.scriptPath });

                // Get frontmatter from the current file
                const file = app.workspace.getActiveFile();
                let frontmatter = {};
                if (file) {
                    const cache = app.metadataCache.getFileCache(file);
                    frontmatter = cache?.frontmatter || {};
                }

                logger.endGroup();
                
                // Create renderer using factory and return decoration
                const renderer = rendererFactory.createLivePreviewRenderer(
                    tag,
                    mapping,
                    file?.path || '',
                    frontmatter
                );
                
                return Decoration.replace({
                    widget: renderer.getWidgetType(),
                });
            }
        });

        // Create ViewPlugin for live preview
        const livePreviewPlugin = ViewPlugin.fromClass(class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                logger.debug('VIEWPLUGIN', 'Constructor', { });
                const isLivePreview = isEditorInLivePreviewMode(view);
                // Only create decorations in live preview mode
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
                    // Only create decorations in live preview mode
                    this.decorations = isLivePreview ? tagMatchDecorator.createDeco(update.view) : Decoration.none;
                }
            }

            destroy() {
                logger.debug('VIEWPLUGIN', 'Destroyed', {});
            }
        }, {
            decorations: v => v.decorations
        });

        return livePreviewPlugin;
    }
}

/**
 * Minimal WidgetType wrapper for CodeMirror.
 * Delegates all logic to LivePreviewRenderer.
 */
class TagverseWidgetType extends WidgetType {
    constructor(private renderer: LivePreviewRenderer) {
        super();
        
        logger.logWidgetLifecycle('Widget created', {
            tag: renderer['tag'],
            script: renderer['mapping'].scriptPath,
            source: renderer['sourcePath']
        });
    }

    eq(other: TagverseWidgetType): boolean {
        return other.renderer['tag'] === this.renderer['tag'] && 
               other.renderer['sourcePath'] === this.renderer['sourcePath'];
    }

    toDOM(): HTMLElement {
        logger.logWidgetLifecycle('DOM requested', {
            tag: this.renderer['tag'],
            rendered: this.renderer['rendered']
        });
        return this.renderer.getElement();
    }
}
