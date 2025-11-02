// ========== REFACTORED LOGGER SYSTEM WITH CONSTRUCTOR INJECTION ==========
import { Notice } from 'obsidian';

// ========== Types ==========

export type LogCategory = 'debug' | 'info' | 'warning' | 'error';

export interface LoggerOptions {
    showNoticeOnError?: boolean;
    showNoticeOnWarning?: boolean;
}

export interface LogEntry {
    type: LogCategory;
    component: string;
    event: string;
    data?: any;
    timestamp: Date;
}

// ========== InstantLogger - Immediate Console Logging ==========

/**
 * InstantLogger - Logs immediately to console without buffering.
 * Use for user-facing operations, services, and real-time feedback.
 */
export class InstantLogger {
    constructor(
        private readonly prefix: string = '[TAGVERSE]',
        private logLevel: LogCategory = 'debug',
        private options: LoggerOptions = {}
    ) {}

    // ========== Configuration ==========

    setLogLevel(level: LogCategory): void {
        this.logLevel = level;
    }

    setOptions(options: Partial<LoggerOptions>): void {
        this.options = { ...this.options, ...options };
    }

    // ========== Logging Methods ==========

    debug(component: string, event: string, data?: any): void {
        if (this.shouldLog('debug')) {
            this.flushImmediate('debug', component, event, data);
        }
    }

    info(component: string, event: string, data?: any): void {
        if (this.shouldLog('info')) {
            this.flushImmediate('info', component, event, data);
        }
    }

    warn(component: string, event: string, data?: any): void {
        if (this.shouldLog('warning')) {
            this.flushImmediate('warning', component, event, data);

            if (this.options.showNoticeOnWarning) {
                const userMessage = this.formatUserMessage(component, event);
                new Notice(`⚠️ ${userMessage}\nCheck console for details.`, 5000);
            }
        }
    }

    error(component: string, event: string, error: Error | any): void {
        if (this.shouldLog('error')) {
            this.flushImmediate('error', component, event, {
                error: error instanceof Error ? error.message : error
            });

            if (this.options.showNoticeOnError) {
                const userMessage = this.formatUserMessage(component, event);
                new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
            }
        }
    }

    // ========== Private Methods ==========

    private shouldLog(level: LogCategory): boolean {
        const levels: LogCategory[] = ['debug', 'info', 'warning', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private flushImmediate(type: LogCategory, component: string, event: string, data?: any): void {
        const message = `${this.prefix} ${component} | ${event}`;

        switch (type) {
            case 'error':
                console.error(message, data || '');
                break;
            case 'warning':
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

// ========== LogScope - Buffered Log Container ==========

/**
 * LogScope - Hierarchical container for buffered logs.
 * Aggregates log entries and child scopes, flushes to console in tree structure.
 */
export class LogScope {
    private entries: Array<LogEntry | LogScope> = [];
    private readonly createdAt: Date = new Date();

    constructor(
        private readonly label: string,
        readonly parent: LogScope | null = null
    ) {}

    get level(): number {
        return this.parent ? this.parent.level + 1 : 0;
    }

    /**
     * Add a log entry to this scope
     */
    addEntry(type: LogCategory, component: string, event: string, data?: any): void {
        this.entries.push({
            type,
            component,
            event,
            data,
            timestamp: new Date()
        });
    }

    /**
     * Add a child scope to this scope
     */
    addChildScope(childScope: LogScope): void {
        this.entries.push(childScope);
    }

    /**
     * Flush this scope and all children to console recursively
     */
    flush(): void {
        console.groupCollapsed(this.formatLabel());

        try {
            for (const entry of this.entries) {
                try {
                    if (entry instanceof LogScope) {
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

        console.groupEnd();
    }

    // ========== Private Methods ==========

    private formatLabel(): string {
        const time = this.createdAt.toISOString().split('T')[1].slice(0, 12);
        return `[TAGVERSE] ${time} | ${this.label}`;
    }

    private flushLogEntry(entry: LogEntry): void {
        const message = `${entry.component} | ${entry.event}`;
        const data = entry.data;

        switch (entry.type) {
            case 'error':
                console.error(message, data || '');
                break;
            case 'warning':
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
}

// ========== ScopedLogger - Buffered Logger with Auto-Flush ==========

/**
 * ScopedLogger - Buffered logger that aggregates logs into hierarchical scopes.
 * Logs are buffered and flushed at the end of the root scope.
 * Use for operations that benefit from grouped console output.
 */
export class ScopedLogger {
    constructor(private readonly scope: LogScope) {}

    // ========== Logging Methods ==========

    debug(component: string, event: string, data?: any): void {
        this.scope.addEntry('debug', component, event, data);
    }

    info(component: string, event: string, data?: any): void {
        this.scope.addEntry('info', component, event, data);
    }

    warn(component: string, event: string, data?: any): void {
        this.scope.addEntry('warning', component, event, data);
    }

    error(component: string, event: string, error: Error | any): void {
        this.scope.addEntry('error', component, event, error);
    }

    // ========== Scope Management ==========

    /**
     * Create a nested logger with a child scope.
     * The child scope is automatically added to the parent.
     */
    createNested(label: string): ScopedLogger {
        const childScope = new LogScope(label, this.scope);
        this.scope.addChildScope(childScope);
        return new ScopedLogger(childScope);
    }

    /**
     * Execute a function with a nested scope.
     * Auto-flushes if this is the root scope.
     */
    async withScope<T>(
        label: string,
        fn: (logger: ScopedLogger) => T | Promise<T>
    ): Promise<T> {
        const nestedLogger = this.createNested(label);

        try {
            return await fn(nestedLogger);
        } finally {
            // Auto-flush only if root scope (no parent)
            if (!this.scope.parent) {
                this.scope.flush();
            }
        }
    }

    /**
     * Manually flush this logger's scope (only for root loggers)
     */
    flush(): void {
        if (!this.scope.parent) {
            this.scope.flush();
        }
    }
}

// ========== LoggerFactory - Creates Logger Instances ==========

/**
 * LoggerFactory - Factory for creating logger instances.
 * Inject this into classes that need to create operation-specific loggers.
 */
export class LoggerFactory {
    private instantLogger: InstantLogger | null = null;

    constructor(
        private logLevel: LogCategory = 'debug',
        private options: LoggerOptions = {}
    ) {}

    /**
     * Create a root scoped logger for an operation
     */
    createScoped(label: string): ScopedLogger {
        const rootScope = new LogScope(label, null);
        return new ScopedLogger(rootScope);
    }

    /**
     * Create an instant logger for immediate console output (singleton)
     */
    createInstant(): InstantLogger {
        if (!this.instantLogger) {
            this.instantLogger = new InstantLogger('[TAGVERSE]', this.logLevel, this.options);
        }
        return this.instantLogger;
    }

    /**
     * Update log level for future logger instances and existing instant logger
     */
    setLogLevel(level: LogCategory): void {
        this.logLevel = level;
        if (this.instantLogger) {
            this.instantLogger.setLogLevel(level);
        }
    }

    /**
     * Update options for future logger instances and existing instant logger
     */
    setOptions(options: LoggerOptions): void {
        this.options = { ...this.options, ...options };
        if (this.instantLogger) {
            this.instantLogger.setOptions(options);
        }
    }
}

// ========================================
