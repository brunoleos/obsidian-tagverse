import { WidgetType, ViewPlugin } from '@codemirror/view';
import { App } from 'obsidian';
import { StateEffect, StateField } from '@codemirror/state';
import { logger } from '../utils/logger';
import { TagScriptMapping } from '../types/interfaces';
import { IScriptLoader, ITagMappingProvider } from '../services/interfaces';
import { TagRenderer } from './renderer';
import { TagMappingStateManager } from './live-preview-state';
import { TagMatchingService } from '../services/tag-matching.service';
import { LivePreviewCodeMirrorExtension } from './live-preview-codemirror-extension';
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
     * Process script result into an HTMLElement
     */
    protected processScriptResult(result: any): HTMLElement {
        if (result === null || result === undefined) {
            const fallback = createSpan({ text: `#${this.tag}` });
            logger.logRenderPipeline('Output fallback to plain tag', {
                tag: this.tag,
                reason: 'null/undefined result'
            });
            return fallback;
        }

        if (typeof result === 'string') {
            const stringEl = createSpan();
            stringEl.innerHTML = result;
            logger.logRenderPipeline('Output rendered as HTML string', {
                tag: this.tag,
                length: result.length
            });
            return stringEl;
        }

        if (result instanceof HTMLElement) {
            // Use inline-block wrapper for live preview
            const wrapper = createSpan({ cls: 'tagverse-inline-wrapper' });
            wrapper.style.display = 'inline-block';
            wrapper.style.verticalAlign = 'top';
            wrapper.style.maxWidth = '100%';
            wrapper.style.overflow = 'visible';
            wrapper.appendChild(result);
            logger.logRenderPipeline('Output wrapped in inline container', {
                tag: this.tag,
                elementType: result.tagName
            });
            return wrapper;
        }

        // Invalid output type
        const errorEl = createSpan({
            cls: 'tagverse-error',
            text: `[Invalid output for #${this.tag}]`
        });
        logger.warn('RENDER-LIVE', 'Invalid output type', {
            tag: this.tag,
            type: typeof result
        });
        return errorEl;
    }

    /**
     * Register the live preview CodeMirror extension
     */
    static registerLivePreviewExtension(
        app: App,
        tagMapping: ITagMappingProvider,
        rendererFactory: RendererFactoryService
    ): [ViewPlugin<any>, StateField<number>] {
        const tagMatchingService = new TagMatchingService(tagMapping, rendererFactory, app);
        const extension = new LivePreviewCodeMirrorExtension(tagMatchingService, app);
        return extension.createExtension();
    }

    /**
     * Create an effect that triggers live preview decoration rebuild
     * This should be called when tag mappings change to force re-rendering
     */
    static createInvalidateEffect(): StateEffect<number> {
        return TagMappingStateManager.createInvalidateEffect();
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
        const tagEq = other.renderer['tag'] === this.renderer['tag'];
        const sourceEq = other.renderer['sourcePath'] === this.renderer['sourcePath'];
        const scriptEq = other.renderer['mapping'].scriptPath === this.renderer['mapping'].scriptPath;
        const result = tagEq && sourceEq && scriptEq;

        logger.logWidgetLifecycle('Widget eq check', {
            tag: this.renderer['tag'],
            tagEq,
            sourceEq,
            scriptEq,
            result,
            script: this.renderer['mapping'].scriptPath,
            otherScript: other.renderer['mapping'].scriptPath
        });

        return result;
    }

    toDOM(): HTMLElement {
        logger.logWidgetLifecycle('DOM requested', {
            tag: this.renderer['tag'],
            rendered: this.renderer['rendered']
        });
        return this.renderer.getElement();
    }
}
