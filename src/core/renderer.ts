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
    abstract render(frontmatter: Record<string, unknown>): Promise<void>;

    protected async loadScript(scriptPath: string): Promise<Function> {
        return this.scriptLoader.loadScript(scriptPath, this.app);
    }

    protected createScriptContext(frontmatter: Record<string, unknown>, args: Record<string, unknown> = {}): ScriptContext {
        return {
            app: this.app,
            tag: this.tag,
            args,
            element: createSpan(),
            sourcePath: this.sourcePath,
            frontmatter,
            Notice
        };
    }

    protected logScriptResult(result: unknown) {
        if (result instanceof HTMLElement) {
            logger.logScriptExecution('Script returned HTMLElement', {
                tag: this.tag,
                elementType: result.tagName,
                hasContent: result.hasChildNodes(),
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
    protected async executeScript(frontmatter: Record<string, unknown>, args: Record<string, unknown> = {}): Promise<unknown> {
        const groupName = this.getMode() === 'live-preview' ? 'RENDER-LIVE' : 'RENDER-READING';
        const modeName = this.getMode() === 'live-preview' ? 'Widget' : 'Reading';

        logger.startGroup(groupName, `${modeName} render started`, {
            tag: this.tag,
            script: this.mapping.scriptPath,
            hasArgs: Object.keys(args).length > 0
        });

        try {
            logger.logRenderPipeline('Script loading started', { 
                tag: this.mapping.tag, 
                script: this.mapping.scriptPath, 
                sourcePath: this.sourcePath 
            });
            
            const renderFunction = await this.loadScript(this.mapping.scriptPath);
            logger.logCacheOperation('Script loaded from cache or file', { tag: this.mapping.tag });

            const scriptContext = this.createScriptContext(frontmatter, args);

            logger.logScriptExecution('Script execution started', { 
                tag: this.mapping.tag,
                args: Object.keys(args).length > 0 ? args : undefined
            });
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
    protected abstract processScriptResult(result: unknown): HTMLElement;

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
