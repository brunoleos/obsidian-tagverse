import { App, MarkdownPostProcessorContext } from 'obsidian';
import { TagRenderer } from '../base/renderer';
import { TagScriptMapping } from '../../1-domain/types/interfaces';
import { IScriptLoader, ITagMappingProvider } from '../../3-services/interfaces';
import { RendererFactoryService } from '../factory/renderer-factory.service';
import { logger } from '../../2-foundation/logging/logger';
import { TagParser } from '../../2-foundation/parsing/tag-parser';
import { REGEX_PATTERNS } from '../../1-domain/constants';

declare global {
    function createSpan(attrs?: Record<string, unknown>): HTMLSpanElement;
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
        private args: Record<string, unknown> = {}
    ) {
        super(scriptLoader, app, tag, mapping, sourcePath);
        this.targetElement = targetElement;
    }

    getMode(): 'reading' {
        return 'reading';
    }

    /**
     * Render the tag in reading mode by replacing the target element and cleaning up arguments text
     */
    async render(frontmatter: Record<string, unknown>): Promise<void> {
        try {
            await this.renderSuccessfully(frontmatter);
            this.rendered = true;
        } catch (error) {
            this.handleRenderError(error);
        }
    }

    /**
     * Execute successful rendering pipeline: script → DOM replacement → cleanup
     */
    private async renderSuccessfully(frontmatter: Record<string, unknown>): Promise<void> {
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
    private handleRenderError(error: unknown): void {
        logger.error('RENDER-READING', 'Render failed', { tag: this.tag, error: (error as Error).message });
        const errorEl = this.handleError(error as Error);
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
    private static extractTagInfoFromElement(tagElement: HTMLElement): { tag: string, args: Record<string, unknown> } {
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
    protected processScriptResult(result: unknown): HTMLElement {
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
            // BREAKING CHANGE: Switched from innerHTML to textContent for security
            // Scripts returning HTML strings should return HTMLElement instead
            stringEl.textContent = result;
            logger.logRenderPipeline('Output rendered as text string', {
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

        // Process all tags in parallel
        await Promise.all(
            tagElements.map(tagElement =>
                this.processTagElement(tagElement, tagMapping, rendererFactory, context)
            )
        );

        logger.logRenderPipeline('Markdown processing completed', { sourcePath: context.sourcePath });
    }

    /**
     * Process a single tag element: extract info, find mapping, and render
     */
    private static async processTagElement(
        tagElement: HTMLElement,
        tagMapping: ITagMappingProvider,
        rendererFactory: RendererFactoryService,
        context: MarkdownPostProcessorContext
    ): Promise<void> {
        // Extract tag name and arguments using helper method
        const { tag, args } = this.extractTagInfoFromElement(tagElement);
        if (!tag) return;

        logger.startGroup('TAG-PROCESSING', 'Processing individual tag', {
            tag,
            hasArgs: Object.keys(args).length > 0,
            sourcePath: context.sourcePath
        });

        // Find matching script mapping
        const mapping = tagMapping.getMapping(tag);

        if (mapping) {
            logger.logTagMatching('Mapping found, rendering tag', {
                tag,
                script: mapping.scriptPath,
                hasArgs: Object.keys(args).length > 0
            });

            // Create and render the tag
            const renderer = rendererFactory.createReadingModeRenderer(
                mapping.tag,
                mapping,
                context.sourcePath,
                tagElement,
                args
            );

            await renderer.render(context.frontmatter);
        } else {
            logger.logTagMatching('No mapping found, skipping tag', { tag });
        }

        logger.endGroup();
    }
}
