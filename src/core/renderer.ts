import { Notice, App } from 'obsidian';
import { ScopedLogger } from '../utils/logger';
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
        protected sourcePath: string,
        protected logger: ScopedLogger
    ) {
        this.logger.debug('WIDGET', 'TagRenderer created', {
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

    protected createScriptContext(frontmatter: any, args: any = {}): ScriptContext {
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

    protected logScriptResult(result: any) {
        if (result instanceof HTMLElement) {
            this.logger.debug('SCRIPT-EXEC', 'Script returned HTMLElement', {
                tag: this.tag,
                elementType: result.tagName,
                hasContent: result.innerHTML.length > 0,
                classes: result.className
            });
        } else if (typeof result === 'string') {
            this.logger.debug('SCRIPT-EXEC', 'Script returned string', {
                tag: this.tag,
                length: result.length,
                preview: result.substring(0, 100)
            });
        } else {
            this.logger.debug('SCRIPT-EXEC', 'Script returned value', {
                tag: this.tag,
                type: typeof result,
                isNull: result === null || result === undefined
            });
        }
    }

    /**
     * Execute the tag script and return the result
     */
    protected async executeScript(frontmatter: any, args: any = {}): Promise<any> {
        const groupName = this.getMode() === 'live-preview' ? 'RENDER-LIVE' : 'RENDER-READING';
        const modeName = this.getMode() === 'live-preview' ? 'Widget' : 'Reading';

        // Log render start
        this.logger.debug(groupName, `${modeName} render started`, {
            tag: this.tag,
            script: this.mapping.scriptPath,
            source: this.sourcePath,
            hasArgs: Object.keys(args).length > 0
        });

        try {
            // Script loading phase - use nested scope
            let renderFunction: Function;
            await this.logger.withScope('Load Script', async (loadLogger) => {
                loadLogger.debug('SCRIPT-LOAD', `Loading script for #${this.tag}`, {
                    script: this.mapping.scriptPath,
                    tag: this.tag
                });

                renderFunction = await this.loadScript(this.mapping.scriptPath);

                loadLogger.debug('SCRIPT-LOAD', `Script loaded for #${this.tag}`, {
                    script: this.mapping.scriptPath,
                    cached: true
                });
            });

            // Script execution phase - use nested scope
            let result: any;
            await this.logger.withScope('Execute Script', async (execLogger) => {
                const scriptContext = this.createScriptContext(frontmatter, args);

                execLogger.debug('SCRIPT-EXEC', `Executing script for #${this.tag}`, {
                    tag: this.tag,
                    script: this.mapping.scriptPath,
                    hasArgs: Object.keys(args).length > 0,
                    sourcePath: this.sourcePath
                });

                result = await renderFunction(scriptContext);

                // Output processing phase
                this.logScriptResult(result);

                execLogger.info('SCRIPT-EXEC', `Script executed successfully`, {
                    tag: this.tag,
                    resultType: result instanceof HTMLElement ? 'HTMLElement' : typeof result
                });
            });

            // Success summary
            this.logger.info(groupName, `${modeName} render complete`, {
                tag: this.tag,
                success: true,
                resultType: result instanceof HTMLElement ? 'HTMLElement' : typeof result
            });

            return result;
        } catch (error) {
            this.logger.error('RENDER-PIPELINE', `${modeName} rendering failed`, error as Error);
            throw error;
        }
    }

    /**
     * Process script result into an HTMLElement
     */
    protected abstract processScriptResult(result: any): HTMLElement;

    /**
     * Handle rendering errors
     */
    protected handleError(error: Error): HTMLElement {
        this.logger.error('ERROR-HANDLING', `${this.getMode()} rendering error`, error);

        // Don't show notice here - logger already handles it
        // Just create error element for inline display
        return createSpan({
            cls: 'tagverse-error',
            text: `[Error: #${this.mapping.tag}]`
        });
    }
}
