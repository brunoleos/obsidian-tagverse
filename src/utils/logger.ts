// ========== LOGGER UTILITY ==========
import { Notice } from 'obsidian';

export interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

export interface LoggerOptions {
    showNoticeOnError?: boolean;
    showNoticeOnWarning?: boolean;
}

export class Logger {
    private prefix = '[TAGVERSE]';
    private logLevel: 'debug' | 'info' | 'warning' | 'error' = 'error';
    private groupStack: string[] = [];
    private inLoopGroup = false; // Track if we're currently in a loop group
    private activeTagGroups = new Map<string, boolean>(); // Track active tag processing groups
    private options: LoggerOptions = {
        showNoticeOnError: true,
        showNoticeOnWarning: false
    };

    private formatMessageLazily(component: string, event: string, data?: any): string {
        const timestamp = new Date().toISOString().split('T')[1];
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `${this.prefix} ${timestamp} | ${component} | ${event}${dataStr}`;
    }

    private formatUserMessage(component: string, event: string): string {
        // Create a user-friendly message from component and event
        const componentMap: Record<string, string> = {
            'COMMUNITY': 'Community Scripts',
            'SCRIPT-EXEC': 'Script Execution',
            'SCRIPT-CACHE': 'Script Cache',
            'SCRIPT-LOADER': 'Script Loader',
            'RENDER-PIPELINE': 'Rendering',
            'WIDGET': 'Widget',
            'PLUGIN-INIT': 'Plugin',
            'TAG-MATCH': 'Tag Matching',
            'ERROR-HANDLING': 'Error Handler'
        };

        const friendlyComponent = componentMap[component] || component;
        const friendlyEvent = event.replace(/_/g, ' ').toLowerCase();

        return `${friendlyComponent}: ${friendlyEvent}`;
    }

    setLogLevel(level: 'debug' | 'info' | 'warning' | 'error') {
        this.logLevel = level;
    }

    setOptions(options: Partial<LoggerOptions>) {
        this.options = { ...this.options, ...options };
    }

    private shouldLog(level: 'debug' | 'info' | 'warning' | 'error'): boolean {
        const levels = ['debug', 'info', 'warning', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private log(level: 'debug' | 'info' | 'warning' | 'error', component: string, event: string, data?: any) {
        if (!this.shouldLog(level)) return;

        const message = this.formatMessageLazily(component, event, data);
        switch (level) {
            case 'debug':
                console.log(message);
                break;
            case 'info':
                console.info(message);
                break;
            case 'warning':
                console.warn(message);
                if (this.options.showNoticeOnWarning) {
                    const userMessage = this.formatUserMessage(component, event);
                    new Notice(`⚠️ ${userMessage}\nCheck console for details.`, 5000);
                }
                break;
            case 'error':
                console.error(message);
                if (this.options.showNoticeOnError) {
                    const userMessage = this.formatUserMessage(component, event);
                    new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
                }
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
    startGroup(component: string, event: string, data?: any, collapsed: boolean = true) {
        if (this.shouldLog('debug') && !this.inLoopGroup) {
            const message = this.formatMessageLazily(component, event, data);
            if (collapsed) {
                console.groupCollapsed(message);
            } else {
                console.group(message);
            }
            this.groupStack.push(`${component}:${event}`);
        }
    }

    endGroup() {
        if (this.groupStack.length > 0 && this.shouldLog('debug') && !this.inLoopGroup) {
            console.groupEnd();
            this.groupStack.pop();
        }
    }

    // Loop-specific group methods - prevent nested groups during iteration
    startLoopGroup(component: string, event: string, data?: any) {
        if (!this.shouldLog('debug')) return;

        // Only create the group if we're not already in a loop
        if (!this.inLoopGroup) {
            const message = this.formatMessageLazily(component, event, data);
            console.groupCollapsed(message);
            this.inLoopGroup = true;
            this.groupStack.push(`LOOP:${component}:${event}`);
        }
    }

    endLoopGroup() {
        if (this.inLoopGroup && this.shouldLog('debug')) {
            console.groupEnd();
            this.inLoopGroup = false;
            this.groupStack.pop();
        }
    }

    // Log within a loop without creating nested groups
    logLoopIteration(component: string, event: string, data?: any) {
        if (!this.shouldLog('debug')) return;

        const message = this.formatMessageLazily(component, event, data);
        console.log(message);
    }

    // Tag processing group methods - create a unique group per tag instance
    startTagProcessingGroup(tag: string, position: number, mode: 'live-preview' | 'reading', data?: any) {
        if (!this.shouldLog('debug')) return;

        const groupId = `${tag}:${position}:${mode}`;

        // Only create group if not already active
        if (!this.activeTagGroups.has(groupId)) {
            const modeLabel = mode === 'live-preview' ? '🔴 Live' : '📄 Reading';
            const timestamp = new Date().toISOString().split('T')[1];
            const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
            const message = `${this.prefix} ${timestamp} | ${modeLabel} Processing #${tag} at pos:${position}${dataStr}`;

            console.groupCollapsed(message);
            this.activeTagGroups.set(groupId, true);
            this.groupStack.push(groupId);
        }

        return groupId;
    }

    endTagProcessingGroup(groupId?: string) {
        if (!this.shouldLog('debug')) return;

        if (groupId && this.activeTagGroups.has(groupId)) {
            console.groupEnd();
            this.activeTagGroups.delete(groupId);

            // Remove from stack
            const index = this.groupStack.indexOf(groupId);
            if (index > -1) {
                this.groupStack.splice(index, 1);
            }
        }
    }

    // Check if a tag group is active
    isTagGroupActive(groupId: string): boolean {
        return this.activeTagGroups.has(groupId);
    }

    // Isolated group logging - creates self-contained groups that complete immediately
    logGroup(component: string, event: string, data?: any, logs?: Array<{event: string, data?: any}>) {
        if (!this.shouldLog('debug')) return;

        const message = this.formatMessageLazily(component, event, data);
        console.groupCollapsed(message);

        // Log all inner messages if provided
        if (logs && logs.length > 0) {
            logs.forEach(log => {
                const timestamp = new Date().toISOString().split('T')[1];
                const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
                console.log(`${this.prefix} ${timestamp} | ${log.event}${dataStr}`);
            });
        }

        console.groupEnd();
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

    logErrorHandling(event: string, error?: any) {
        this.error('ERROR-HANDLING', event, error);
    }
}

export const logger = new Logger();
// ========================================
