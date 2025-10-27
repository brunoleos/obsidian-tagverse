import { Notice, App } from 'obsidian';
import { logger } from '../utils/logger';
import { TagScriptMapping, ScriptContext } from '../types/interfaces';
import { IScriptLoader } from '../services/interfaces';

declare global {
    function createSpan(attrs?: any): HTMLSpanElement;
}

export abstract class TagRenderer {
    protected container: HTMLElement | null = null;
    protected rendered = false;

    constructor(
        protected scriptLoader: IScriptLoader,
        protected app: App,
        protected tag: string,
        protected mapping: TagScriptMapping,
        protected sourcePath: string
    ) {
        logger.logWidgetLifecycle('TagRenderer created', {
            tag: this.tag,
            script: this.mapping.scriptPath,
            source: this.sourcePath,
            mode: this.getMode()
        });
    }

    /**
     * Get the rendering mode (live-preview or reading)
     */
    abstract getMode(): 'live-preview' | 'reading';

    /**
     * Render the tag with the provided frontmatter
     */
    abstract render(frontmatter: any): Promise<void>;

    protected async loadScript(scriptPath: string): Promise<Function> {
        return this.scriptLoader.loadScript(scriptPath, this.app);
    }

    protected createScriptContext(frontmatter: any): ScriptContext {
        return {
            app: this.app,
            tag: this.tag,
            element: createSpan(),
            sourcePath: this.sourcePath,
            frontmatter,
            Notice
        };
    }

    protected logScriptResult(result: any) {
        if (result instanceof HTMLElement) {
            logger.logScriptExecution('Script returned HTMLElement', {
                tag: this.tag,
                elementType: result.tagName,
                hasContent: result.innerHTML.length > 0,
                classes: result.className
            });
        } else if (typeof result === 'string') {
            logger.logScriptExecution('Script returned string', {
                tag: this.tag,
                length: result.length,
                preview: result.substring(0, 100)
            });
        } else {
            logger.logScriptExecution('Script returned value', {
                tag: this.tag,
                type: typeof result,
                isNull: result === null || result === undefined
            });
        }
    }

    /**
     * Execute the tag script and return the result
     */
    protected async executeScript(frontmatter: any): Promise<any> {
        const groupName = this.getMode() === 'live-preview' ? 'RENDER-LIVE' : 'RENDER-READING';
        const modeName = this.getMode() === 'live-preview' ? 'Widget' : 'Reading';

        logger.startGroup(groupName, `${modeName} render started`, {
            tag: this.tag,
            script: this.mapping.scriptPath
        });

        try {
            logger.logRenderPipeline('Script loading started', { 
                tag: this.mapping.tag, 
                script: this.mapping.scriptPath, 
                sourcePath: this.sourcePath 
            });
            
            const renderFunction = await this.loadScript(this.mapping.scriptPath);
            logger.logCacheOperation('Script loaded from cache or file', { tag: this.mapping.tag });

            const scriptContext = this.createScriptContext(frontmatter);

            logger.logScriptExecution('Script execution started', { tag: this.mapping.tag });
            const result = await renderFunction(scriptContext);

            this.logScriptResult(result);

            return result;
        } catch (error) {
            logger.logErrorHandling(`${modeName} rendering failed`, error);
            throw error;
        } finally {
            logger.endGroup();
        }
    }

    /**
     * Process script result into an HTMLElement
     */
    protected processScriptResult(result: any): HTMLElement {
        const isLivePreview = this.getMode() === 'live-preview';

        if (result === null || result === undefined) {
            const fallback = isLivePreview
                ? createSpan({ text: `#${this.tag}` })
                : createSpan();
            logger.logRenderPipeline(
                isLivePreview ? 'Output fallback to plain tag' : 'Output fallback to original tag',
                { tag: this.tag, reason: 'null/undefined result' }
            );
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
            if (isLivePreview) {
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
            } else {
                // Direct append for reading mode
                logger.logRenderPipeline('Output wrapped in container', {
                    tag: this.tag,
                    elementType: result.tagName
                });
                return result;
            }
        }

        // Invalid output type
        const errorEl = createSpan({
            cls: 'tagverse-error',
            text: `[Invalid output for #${this.tag}]`
        });
        logger.warn(
            isLivePreview ? 'RENDER-LIVE' : 'RENDER-READING',
            'Invalid output type',
            { tag: this.tag, type: typeof result }
        );
        return errorEl;
    }

    /**
     * Handle rendering errors
     */
    protected handleError(error: Error): HTMLElement {
        logger.logErrorHandling(`${this.getMode()} rendering error`, error);

        this.app.workspace.onLayoutReady(() => {
            new Notice(`Error rendering tag #${this.mapping.tag}: ${error.message}`);
        });

        return createSpan({
            cls: 'tagverse-error',
            text: `[Error: #${this.mapping.tag}]`
        });
    }
}
