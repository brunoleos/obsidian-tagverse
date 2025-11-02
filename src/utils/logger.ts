// ========== LOGGER UTILITY WITH STRICT SCOPED PATTERN ==========
import { Notice } from 'obsidian';

export interface LoggerOptions {
    showNoticeOnError?: boolean;
    showNoticeOnWarning?: boolean;
}

export interface LogEntry {
    type: 'debug' | 'info' | 'warn' | 'error';
    component: string;
    event: string;
    data?: any;
    timestamp: Date;
}

/**
 * LogGroup - Hierarchical container for buffered logs
 */
export class LogGroup {
    readonly id: string;
    readonly label: string;
    readonly level: number;
    parent: LogGroup | null;
    private entries: Array<LogEntry | LogGroup> = [];
    readonly createdAt: Date;
    flushedAt?: Date;

    constructor(label: string, parent: LogGroup | null) {
        this.id = `${label}:${Date.now()}:${Math.random()}`;
        this.label = label;
        this.parent = parent;
        this.level = parent ? parent.level + 1 : 0;
        this.createdAt = new Date();
    }

    /**
     * Add a log entry to this group
     */
    addEntry(type: LogEntry['type'], component: string, event: string, data?: any): void {
        const entry: LogEntry = {
            type,
            component,
            event,
            data,
            timestamp: new Date()
        };

        this.entries.push(entry)
    }

    /**
     * Create a nested group within this group
     * Supports both sync and async functions
     */
    async withGroup<T>(label: string, fn: (group: LogGroup) => T | Promise<T>): Promise<T> {
        const childGroup = new LogGroup(label, this);
        this.entries.push(childGroup);

        try {
            const result = await fn(childGroup);
            return result;
        } finally {
            childGroup.flush();
        }
    }

    /**
     * Flush this group and all children to console
     */
    flush(): void {

        // Open console group
        console.groupCollapsed(this.formatLabel());

        try {
            // Flush all entries in order
            for (const entry of this.entries) {
                try {
                    if (this.isLogGroup(entry)) {
                        entry.flush(); // Recursive flush
                    } else {
                        this.flushLogEntry(entry);
                    }
                } catch (err) {
                    console.error('[Logger] Failed to flush entry:', err);
                }
            }         
        } catch (err) {
            console.error('[Logger] Critical flush failure:', err);
        } 
        
        this.flushedAt = new Date();
        console.groupEnd();
    }

    // ========== Private Helper Methods ==========
    
    private isLogGroup(entry: LogEntry | LogGroup): entry is LogGroup {
        return entry instanceof LogGroup;
    }

    private formatLabel(): string {
        const timestamp = this.createdAt.toISOString().split('T')[1];
        return `[TAGVERSE] ${timestamp} | ${this.label}`;
    }

    private flushLogEntry(entry: LogEntry): void {
        const timestamp = entry.timestamp.toISOString().split('T')[1];
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
        const message = `[TAGVERSE] ${timestamp} | ${entry.component} | ${entry.event}${dataStr}`;

        switch (entry.type) {
            case 'debug':
                console.log(message);
                break;
            case 'info':
                console.info(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }
}

/**
 * Logger - Main logging class with strict scoped pattern
 */
export class Logger {
    private prefix = '[TAGVERSE]';
    private logLevel: 'debug' | 'info' | 'warning' | 'error' = 'error';

    private options: LoggerOptions = {
        showNoticeOnError: true,
        showNoticeOnWarning: false
    };

    // ========== Configuration ==========

    setLogLevel(level: 'debug' | 'info' | 'warning' | 'error') {
        this.logLevel = level;
    }

    setOptions(options: Partial<LoggerOptions>) {
        this.options = { ...this.options, ...options };
    }

    // ========== Group Management ==========

    /**
     * Scoped logging pattern: creates group, passes it to function, auto-flushes
     * For nested groups, use group.withGroup() instead
     * Supports both sync and async functions
     */
    async withGroup<T>(label: string, fn: (group: LogGroup) => T | Promise<T>): Promise<T> {
        const group = new LogGroup(label, null);

        try {
            const result = await fn(group);
            return result;
        } finally {
            group.flush();        
        }
    }

    // ========== Logging Methods ==========

    private shouldLog(level: 'debug' | 'info' | 'warning' | 'error'): boolean {
        const levels = ['debug', 'info', 'warning', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private addEntry(type: LogEntry['type'], component: string, event: string, data?: any): void {
        const entry: LogEntry = {
            type,
            component,
            event,
            data,
            timestamp: new Date()
        };

        this.flushLogEntryImmediate(entry);
    }

    private flushLogEntryImmediate(entry: LogEntry): void {
        const prefix = `${this.prefix} ${entry.component}`;
        const message = `${prefix} | ${entry.event}`;
        const data = entry.data;

        switch (entry.type) {
            case 'error':
                console.error(message, data || '');
                break;
            case 'warn':
                console.warn(message, data || '');
                break;
            case 'info':
                console.info(message, data || '');
                break;
            case 'debug':
            default:
                console.log(message, data || '');
                break;
        }
    }

    debug(component: string, event: string, data?: any) {
        if (!this.shouldLog('debug')) return;
        this.addEntry('debug', component, event, data);
    }

    info(component: string, event: string, data?: any) {
        if (!this.shouldLog('info')) return;
        this.addEntry('info', component, event, data);
    }

    warn(component: string, event: string, data?: any) {
        if (!this.shouldLog('warning')) return;
        this.addEntry('warn', component, event, data);

        if (this.options.showNoticeOnWarning) {
            const userMessage = this.formatUserMessage(component, event);
            new Notice(`⚠️ ${userMessage}\nCheck console for details.`, 5000);
        }
    }

    error(component: string, event: string, error: any) {
        this.addEntry('error', component, event, { error: error.message || error });

        if (this.options.showNoticeOnError) {
            const userMessage = this.formatUserMessage(component, event);
            new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
        }
    }

    // ========== Private Helpers ==========

    private formatUserMessage(component: string, event: string): string {
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
}

export const logger = new Logger();
// ========================================
