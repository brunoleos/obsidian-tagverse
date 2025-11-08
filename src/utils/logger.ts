// ========== LOGGER UTILITY ==========
export class Logger {
    private prefix = '[TAGVERSE]';
    private logLevel: 'debug' | 'info' | 'warning' | 'error' = 'error';
    private groupStack: string[] = [];

    private formatMessageLazily(component: string, event: string, data?: unknown): string {
        const timestamp = new Date().toISOString().split('T')[1];
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `${this.prefix} ${timestamp} | ${component} | ${event}${dataStr}`;
    }

    setLogLevel(level: 'debug' | 'info' | 'warning' | 'error') {
        this.logLevel = level;
    }

    private shouldLog(level: 'debug' | 'info' | 'warning' | 'error'): boolean {
        const levels = ['debug', 'info', 'warning', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private log(level: 'debug' | 'info' | 'warning' | 'error', component: string, event: string, data?: unknown) {
        if (!this.shouldLog(level)) return;

        const message = this.formatMessageLazily(component, event, data);
        switch (level) {
            case 'debug':
                console.debug(message);
                break;
            case 'info':
                // Use console.debug for info level (only warn/error/debug allowed by Obsidian)
                console.debug(message);
                break;
            case 'warning':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }

    debug(component: string, event: string, data?: unknown) {
        this.log('debug', component, event, data);
    }

    info(component: string, event: string, data?: unknown) {
        this.log('info', component, event, data);
    }

    warn(component: string, event: string, data?: unknown) {
        this.log('warning', component, event, data);
    }

    error(component: string, event: string, error: unknown) {
        this.log('error', component, event, { error: (error as Error).message || error });
    }

    // Grouped logging methods that respect log levels
    // Note: Uses console.debug with indentation instead of console.group (not allowed by Obsidian)
    startGroup(component: string, event: string, data?: unknown) {
        if (this.shouldLog('debug')) {
            const indent = '  '.repeat(this.groupStack.length);
            const message = this.formatMessageLazily(component, event, data);
            console.debug(`${indent}▼ ${message}`);
            this.groupStack.push(`${component}:${event}`);
        }
    }

    endGroup() {
        if (this.groupStack.length > 0 && this.shouldLog('debug')) {
            this.groupStack.pop();
            const indent = '  '.repeat(this.groupStack.length);
            console.debug(`${indent}▲`);
        }
    }

    // Convenience methods for common logging patterns
    logPluginInit(event: string, data?: unknown) {
        this.info('PLUGIN-INIT', event, data);
    }

    logWidgetLifecycle(event: string, data?: unknown) {
        this.debug('WIDGET', event, data);
    }

    logRenderPipeline(event: string, data?: unknown) {
        this.debug('RENDER-PIPELINE', event, data);
    }

    logScriptExecution(event: string, data?: unknown) {
        this.debug('SCRIPT-EXEC', event, data);
    }

    logCacheOperation(event: string, data?: unknown) {
        this.debug('SCRIPT-CACHE', event, data);
    }

    logTagMatching(event: string, data?: unknown) {
        this.debug('TAG-MATCH', event, data);
    }

    logUserAction(event: string, data?: unknown) {
        this.info('USER-ACTION', event, data);
    }

    logErrorHandling(event: string, error?: unknown) {
        this.error('ERROR-HANDLING', event, error);
    }
}

export const logger = new Logger();
// ========================================
