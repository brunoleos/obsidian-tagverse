import { App, MarkdownPostProcessorContext } from 'obsidian';
import { TagRenderer } from './renderer';
import { TagScriptMapping } from '../types/interfaces';
import { IScriptLoader, ITagMappingProvider } from '../services/interfaces';
import { RendererFactoryService } from '../services/renderer-factory.service';
import { ScopedLogger } from '../utils/logger';
import { TagParser } from '../utils/tag-parser';
import { REGEX_PATTERNS } from '../constants';

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
        targetElement: HTMLElement,
        private args: any = {},
        logger: ScopedLogger
    ) {
        super(scriptLoader, app, tag, mapping, sourcePath, logger);
        this.targetElement = targetElement;
    }

    getMode(): 'reading' {
        return 'reading';
    }

    /**
     * Render the tag in reading mode by replacing the target element and cleaning up arguments text
     */
    async render(frontmatter: any): Promise<void> {
        try {
            await this.renderSuccessfully(frontmatter);
            this.rendered = true;

            // Mark rendering as successful
            this.logger.info('RENDER-READING', 'Tag rendered successfully', {
                tag: this.tag
            });
        } catch (error) {
            this.handleRenderError(error);

            // Log error
            this.logger.error('RENDER-READING', 'Tag rendering failed', error as Error);
        } finally {
            // Auto-flush happens since this is root scope
            this.logger.flush();
        }
    }

    /**
     * Execute successful rendering pipeline: script → DOM replacement → cleanup
     */
    private async renderSuccessfully(frontmatter: any): Promise<void> {
        // Execute script and create content
        const result = await this.executeScript(frontmatter, this.args);
        const contentElement = this.processScriptResult(result);

        // Create wrapper and replace tag element
        const wrapper = createSpan();
        wrapper.appendChild(contentElement);
        this.targetElement.replaceWith(wrapper);

        // Clean up any arguments text (search next to wrapper now in DOM)
        this.performArgsCleanup(wrapper);
    }

    /**
     * Handle render errors with appropriate cleanup
     */
    private handleRenderError(error: any): void {
        const errorEl = this.handleError(error);
        this.targetElement.replaceWith(errorEl);

        // Clean up args text even on error (search next to error element in DOM)
        this.performArgsCleanup(errorEl);
    }

    /**
     * Perform cleanup of arguments text nodes next to the given element
     */
    private performArgsCleanup(elementInDom: HTMLElement): void {
        const argsTextNode = this.findArgsTextNode(elementInDom);
        if (argsTextNode) {
            this.cleanArgsTextNode(argsTextNode);
        }
    }

    /**
     * Find and validate arguments text node adjacent to the target element
     */
    private findArgsTextNode(targetElement: HTMLElement): Text | null {
        const nextSibling = targetElement.nextSibling;

        if (!nextSibling ||
            nextSibling.nodeType !== Node.TEXT_NODE ||
            !nextSibling.textContent) {
            return null;
        }

        const siblingText = nextSibling.textContent;
        const argsMatch = siblingText.match(REGEX_PATTERNS.ARGS_ONLY);

        if (!argsMatch) return null;

        // Validate the args match what we received
        const potentialArgs = argsMatch[0];
        const testTag = '#' + this.tag + potentialArgs;
        const parsedTest = TagParser.parseTag(testTag);

        // Only return if validation passes
        return (Object.keys(parsedTest.args).length > 0 &&
                JSON.stringify(parsedTest.args) === JSON.stringify(this.args))
            ? nextSibling as Text
            : null;
    }

    /**
     * Clean up arguments text node by removing the arguments portion while preserving trailing text
     */
    private cleanArgsTextNode(textNode: Text): void {
        if (!textNode.textContent) return;

        const originalText = textNode.textContent;
        const newText = originalText.replace(REGEX_PATTERNS.ARGS_ONLY, '');

        if (newText) {
            textNode.textContent = newText; // Update with remaining text
        } else {
            textNode.remove(); // Remove if only contained args
        }
    }

    /**
     * Extract tag name and arguments from a tag element
     */
    private static extractTagInfoFromElement(tagElement: HTMLElement): { tag: string, args: any } {
        // Get the tag name from the element
        let tagName = tagElement.textContent?.trim();
        if (!tagName) return { tag: '', args: {} };

        // Remove # prefix if present to get clean tag name
        if (tagName.startsWith('#')) {
            tagName = tagName.substring(1);
        }

        // Reconstruct full tag string: check next sibling for arguments
        let fullTagText = '#' + tagName;

        const nextSibling = tagElement.nextSibling;
        if (nextSibling &&
            nextSibling.nodeType === Node.TEXT_NODE &&
            nextSibling.textContent) {

            // Work with original text without trimming
            const siblingText = nextSibling.textContent;
            const argsMatch = siblingText.match(REGEX_PATTERNS.ARGS_ONLY);
            if (argsMatch) {
                fullTagText += argsMatch[0];
            }
        }

        // Use TagParser consistently (single source of truth)
        const parsed = TagParser.parseTag(fullTagText);
        return { tag: parsed.tag, args: parsed.args };
    }

    /**
     * Process script result into an HTMLElement
     */
    protected processScriptResult(result: any): HTMLElement {
        if (result === null || result === undefined) {
            const fallback = createSpan();
            this.logger.debug('RENDER-PIPELINE', 'Output fallback to original tag', {
                tag: this.tag,
                reason: 'null/undefined result'
            });
            return fallback;
        }

        if (typeof result === 'string') {
            const stringEl = createSpan();
            stringEl.innerHTML = result;
            this.logger.debug('RENDER-PIPELINE', 'Output rendered as HTML string', {
                tag: this.tag,
                length: result.length
            });
            return stringEl;
        }

        if (result instanceof HTMLElement) {
            // Direct append for reading mode
            this.logger.debug('RENDER-PIPELINE', 'Output wrapped in container', {
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
        this.logger.warn('RENDER-READING', 'Invalid output type', {
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
        // Find all tag elements in the markdown
        const tagElements = element.findAll('a.tag');

        // Process all tags in parallel - each gets its own scoped logger from factory
        await Promise.all(
            tagElements.map((tagElement, index) =>
                this.processTagElement(tagElement, tagMapping, rendererFactory, context, index)
            )
        );
    }

    /**
     * Process a single tag element: extract info, find mapping, and render
     */
    private static async processTagElement(
        tagElement: HTMLElement,
        tagMapping: ITagMappingProvider,
        rendererFactory: RendererFactoryService,
        context: MarkdownPostProcessorContext,
        index: number
    ): Promise<void> {
        // Extract tag name early for matching
        let tagName = tagElement.textContent?.trim();
        if (!tagName) return;
        if (tagName.startsWith('#')) {
            tagName = tagName.substring(1);
        }

        // Find matching script mapping
        const mapping = tagMapping.getMapping(tagName);

        if (mapping) {
            // Extract full tag info with arguments
            const { tag, args } = this.extractTagInfoFromElement(tagElement);

            // Create renderer with scoped logger (factory creates logger)
            const renderer = rendererFactory.createReadingModeRenderer(
                mapping.tag,
                mapping,
                context.sourcePath,
                tagElement,
                args,
                context.docId,
                index
            );

            // Render (renderer has its own scoped logger and will flush)
            await renderer.render(context.frontmatter);
        }
        // No mapping - silently skip (no logging needed for unmatched tags)
    }
}
