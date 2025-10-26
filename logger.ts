// ========== LOGGER UTILITY ==========
export interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

export class Logger {
    private prefix = '[TAGVERSE]';
    private logLevel: 'debug' | 'info' | 'warning' | 'error' = 'error';
    private groupStack: string[] = [];

    private formatMessage(component: string, event: string, data?: any): string {
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

    private log(level: 'debug' | 'info' | 'warning' | 'error', component: string, event: string, data?: any) {
        if (!this.shouldLog(level)) return;

        const message = this.formatMessage(component, event, data);
        switch (level) {
            case 'debug':
                console.log(message);
                break;
            case 'info':
                console.info(message);
                break;
            case 'warning':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }

    debug(component: string, event: string, data?: any) {
        this.log('debug', component, event, data);
    }

    info(component: string, event: string, data?: any) {
        this.log('info', component, event, data);
    }

    warn(component: string, event: string, data?: any) {
        this.log('warning', component, event, data);
    }

    error(component: string, event: string, error: any) {
        this.log('error', component, event, { error: error.message || error });
    }

    // Grouped logging methods that respect log levels
    startGroup(component: string, event: string, data?: any) {
        if (this.shouldLog('debug')) {
            const message = this.formatMessage(component, event, data);
            console.group(message);
            this.groupStack.push(`${component}:${event}`);
        }
    }

    endGroup() {
        if (this.groupStack.length > 0 && this.shouldLog('debug')) {
            console.groupEnd();
            this.groupStack.pop();
        }
    }

    // Convenience methods for common logging patterns
    logPluginInit(event: string, data?: any) {
        this.info('PLUGIN-INIT', event, data);
    }

    logWidgetLifecycle(event: string, data?: any) {
        this.debug('WIDGET', event, data);
    }

    logRenderPipeline(event: string, data?: any) {
        this.debug('RENDER-PIPELINE', event, data);
    }

    logScriptExecution(event: string, data?: any) {
        this.debug('SCRIPT-EXEC', event, data);
    }

    logCacheOperation(event: string, data?: any) {
        this.debug('SCRIPT-CACHE', event, data);
    }

    logTagMatching(event: string, data?: any) {
        this.debug('TAG-MATCH', event, data);
    }



    logUserAction(event: string, data?: any) {
        this.info('USER-ACTION', event, data);
    }

    logErrorHandling(event: string, error: any) {
        this.error('ERROR-HANDLING', event, error);
    }

    logPerformance(event: string, duration: number, data?: any) {
        this.debug('PERFORMANCE', event, { duration: `${duration}ms`, ...data });
    }


}

export const logger = new Logger();
// ========================================
