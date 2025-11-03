// ========== LOGGER SYSTEM ==========
import { Notice } from 'obsidian';
import { AsyncLocalStorage } from 'async_hooks';

// ========== Types ==========

export type LogCategory = 'debug' | 'info' | 'warning' | 'error';

export interface LoggerOptions {
    showNoticeOnError?: boolean;
    showNoticeOnWarning?: boolean;
}

interface LogEntry {
    type: LogCategory;
    component: string;
    event: string;
    data?: any;
    timestamp: Date;
}

// ========== AsyncLocalStorage Context ==========
/**
 * LogContext - Stored in AsyncLocalStorage for each async execution context.
 * Contains the current scope, depth level, and root scope reference.
 */
interface LogContext {
    scope: LogScope;           // Current scope for collecting logs
    depth: number;             // 0 = root, 1+ = nested
    rootScope: LogScope;       // Reference to root for auto-flush
}

// ========== LoggerConfig and LoggerUtils - Static utility classes for logging and configuration ==========

/**
 * Static utility classes for logging operations and configuration.
 * Manages log level and options statically, and provides functions for log level checking, message formatting, and console output.
 */
export class LoggerConfig {
    private static _logLevel: LogCategory = 'debug';
    private static _options: LoggerOptions = {
        showNoticeOnError: true,
        showNoticeOnWarning: false
    };

    public static get logLevel(): LogCategory {
        return this._logLevel;
    }

    public static get options(): LoggerOptions {
        return this._options;
    }

    public static setOptions(options: Partial<LoggerOptions>): void {
        LoggerConfig._options = { ...LoggerConfig._options, ...options };
    }

    public static setLogLevel(level: LogCategory): void {
        LoggerConfig._logLevel = level;
    }
}

class LoggerUtils {
    /**
     * Unified console output method
     */
    public static outputToConsole(level: LogCategory, component: string, event: string, data: any): void {
        const message = `[TAGVERSE] ${component} | ${event}`;

        switch (level) {
            case 'error':
                console.error(message, data || '');
                if (LoggerConfig.options.showNoticeOnError) {
                    const userMessage = LoggerUtils.formatUserMessage(component, event);
                    new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
                }
                break;
            case 'warning':
                console.warn(message, data || '');
                if (LoggerConfig.options.showNoticeOnWarning) {
                    const userMessage = LoggerUtils.formatUserMessage(component, event);
                    new Notice(`⚠️ ${userMessage}\nCheck console for details.`, 5000);
                }
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

    /**
     * Format component and event into user-friendly message
     */
    private static formatUserMessage(component: string, event: string): string {
        const friendlyComponent = component.replace(/-/g, ' ').toLowerCase();
        const friendlyEvent = event.replace(/_/g, ' ').toLowerCase();
        return `${friendlyComponent}: ${friendlyEvent}`;
    }
}

// ========== LogScope - Buffered Log Container ==========

/**
 * LogScope - Hierarchical container for buffered logs.
 * Aggregates log entries and child scopes, flushes to console in tree structure.
 */
class LogScope {
    private entries: Array<LogEntry | LogScope> = [];
    private readonly createdAt: Date = new Date();

    constructor(
        private readonly label: string,
        readonly parent: LogScope | null = null
    ) {}

    /**
     * Add a log entry to this scope
     */
    public addEntry(type: LogCategory, component: string, event: string, data?: any): void {
        this.entries.push({
            type,
            component,
            event,
            data,
            timestamp: new Date()
        });
    }

    /**
     * Create a child scope under this scope
     */
    public createChild(label: string): LogScope {
        const childScope = new LogScope(label, this);
        this.addChildScope(childScope);
        return childScope;
    }

    /**
     * Flush this scope and all children to console recursively.
     * Skips empty scopes (no entries after log level filtering).
     */
    public flush(): void {
        // Skip empty scopes entirely - don't clutter console
        if (!this.hasEntries()) {
            return;
        }

        console.groupCollapsed(this.formatLabel());

        try {
            for (const entry of this.entries) {
                try {
                    if (entry instanceof LogScope) {
                        entry.flush(); // Recursive flush (child will check hasEntries)
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

    /**
     * Add a child scope to this scope
     */
    private addChildScope(childScope: LogScope): void {
        this.entries.push(childScope);
    }

    /**
     * Check if this scope has any entries (including child scopes).
     * Returns false if scope is empty (all logs filtered by log level or no logs).
     * Recursively checks child scopes.
     */
    private hasEntries(): boolean {
        for (const entry of this.entries) {
            if (entry instanceof LogScope) {
                // Recursively check child scope
                if (entry.hasEntries()) {
                    return true;
                }
            } else {
                // Found a log entry
                return true;
            }
        }
        return false; // No entries found
    }

    private formatLabel(): string {
        const time = this.createdAt.toISOString().split('T')[1].slice(0, 12);
        return `[TAGVERSE] ${time} | ${this.label}`;
    }

    private flushLogEntry(entry: LogEntry): void {
        // Use unified console output method
        LoggerUtils.outputToConsole(entry.type, entry.component, entry.event, entry.data);
    }
}

// ========== Async-Context-Aware APIs ==========

/**
 * Main Logger class - Static API for all logging operations.
 * Provides clean, encapsulated logging with scoped context support.
 */
export class Logger {
    // ========== Public Static API ==========

    /**
     * Log a debug message
     */
    public static debug(component: string, event: string, data?: any): void {
        Logger.emitLog('debug', component, event, data);
    }

    /**
     * Log an info message
     */
    public static info(component: string, event: string, data?: any): void {
        Logger.emitLog('info', component, event, data);
    }

    /**
     * Log a warning message
     */
    public static warn(component: string, event: string, data?: any): void {
        Logger.emitLog('warning', component, event, data);
    }

    /**
     * Log an error message
     */
    public static error(component: string, event: string, data?: any): void {
        Logger.emitLog('error', component, event, data);
    }

    /**
     * Create a scoped logging context
     */
    public static async withScope<T>(
        label: string,
        fn: () => T | Promise<T>
    ): Promise<T> {
        // Get parent context (if any)
        const parentContext = Logger.asyncLogContext.getStore();

        // Determine if this is root or nested scope
        const depth = parentContext ? parentContext.depth + 1 : 0;
        const isRoot = depth === 0;

        // Create scope
        let scope: LogScope;
        let rootScope: LogScope;

        if (parentContext) {
            // NESTED: Create child scope under parent
            scope = parentContext.scope.createChild(label);
            rootScope = parentContext.rootScope; // Share root reference
        } else {
            // ROOT: Create new root scope
            scope = new LogScope(label, null);
            rootScope = scope;
        }

        // Create new context
        const context: LogContext = {
            scope,
            depth,
            rootScope
        };

        // 🔮 MAGIC: Run function with this context in AsyncLocalStorage
        return Logger.asyncLogContext.run(context, async () => {
            try {
                const result = await fn();
                return result;
            } catch (error) {
                // Context still available in error handling
                Logger.error('ERROR', 'Uncaught error in async scope', {
                    label,
                    error: error instanceof Error ? error.message : String(error)
                });
                throw error;
            } finally {
                // Auto-flush only root scopes
                if (isRoot) {
                    rootScope.flush();
                }
            }
        });
    }
    
    // ========== AsyncLocalStorage Context ==========
    /**
     * 🔮 THE MAGIC: AsyncLocalStorage instance that tracks logging context
     * across async boundaries. This enables automatic scope inheritance.
     */
    private static asyncLogContext = new AsyncLocalStorage<LogContext>();

    /**
     * Core logged implementation - handles level filtering and context dispatch
     */
    private static emitLog(level: LogCategory, component: string, event: string, data?: any): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const context = Logger.asyncLogContext.getStore();

        if (context) {
            // We're inside a withLogScope - add to that scope
            context.scope.addEntry(level, component, event, data);
        } else {
            // No scope context - fall back to instant logging
            LoggerUtils.outputToConsole(level, component, event, data);
        }
    }

    /**
     * Check if a log level should be logged based on current config level
     */
    private static shouldLog(level: LogCategory): boolean {
        const levels: LogCategory[] = ['debug', 'info', 'warning', 'error'];
        return levels.indexOf(level) >= levels.indexOf(LoggerConfig.logLevel);
    }
}
