import { App, MarkdownPostProcessorContext } from 'obsidian';
import { TagRenderer } from './renderer';
import { TagScriptMapping } from '../types/interfaces';
import { IScriptLoader, ITagMappingProvider } from '../services/interfaces';
import { RendererFactoryService } from '../services/renderer-factory.service';
import { logger } from '../utils/logger';

declare global {
    function createSpan(attrs?: any): HTMLSpanElement;
}

/**
 * Renderer for reading mode (static preview).
 * Handles direct DOM replacement of tag elements with rendered content.
 * Uses dependency injection for services.
 */
export class ReadingModeRenderer extends TagRenderer {
    private targetElement: HTMLElement;

    constructor(
        scriptLoader: IScriptLoader,
        app: App,
        tag: string,
        mapping: TagScriptMapping,
        sourcePath: string,
        targetElement: HTMLElement
    ) {
        super(scriptLoader, app, tag, mapping, sourcePath);
        this.targetElement = targetElement;
    }

    getMode(): 'reading' {
        return 'reading';
    }

    /**
     * Render the tag in reading mode by replacing the target element
     */
    async render(frontmatter: any): Promise<void> {
        try {
            // Create wrapper element
            const wrapper = createSpan();
            
            // Execute script and get result
            const result = await this.executeScript(frontmatter);
            
            // Process the result into an HTMLElement
            const contentElement = this.processScriptResult(result);
            
            // Add content to wrapper
            wrapper.appendChild(contentElement);
            
            // Replace original tag element with rendered content
            this.targetElement.replaceWith(wrapper);
            this.rendered = true;
        } catch (error) {
            // Handle error and replace with error element
            const errorEl = this.handleError(error);
            this.targetElement.replaceWith(errorEl);
        }
    }

    /**
     * Process script result into an HTMLElement
     */
    protected processScriptResult(result: any): HTMLElement {
        if (result === null || result === undefined) {
            const fallback = createSpan();
            logger.logRenderPipeline('Output fallback to original tag', {
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
            // Direct append for reading mode
            logger.logRenderPipeline('Output wrapped in container', {
                tag: this.tag,
                elementType: result.tagName
            });
            return result;
        }

        // Invalid output type
        const errorEl = createSpan({
            cls: 'tagverse-error',
            text: `[Invalid output for #${this.tag}]`
        });
        logger.warn('RENDER-READING', 'Invalid output type', {
            tag: this.tag,
            type: typeof result
        });
        return errorEl;
    }

    /**
     * Process markdown post-processor context for reading mode
     */
    static async processMarkdown(
        tagMapping: ITagMappingProvider,
        rendererFactory: RendererFactoryService,
        element: HTMLElement,
        context: MarkdownPostProcessorContext
    ): Promise<void> {
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
            const mapping = tagMapping.getMapping(tagText);

            if (mapping) {
                logger.logTagMatching('Mapping found, rendering tag', { tag: tagText, script: mapping.scriptPath });
                
                // Create renderer using factory and render the tag
                const renderer = rendererFactory.createReadingModeRenderer(
                    mapping.tag,
                    mapping,
                    context.sourcePath,
                    tagEl
                );

                await renderer.render(context.frontmatter);
            } else {
                logger.logTagMatching('No mapping found, skipping tag', { tag: tagText });
            }

            logger.endGroup();
        }

        logger.logRenderPipeline('Markdown processing completed', { sourcePath: context.sourcePath });
    }
}
