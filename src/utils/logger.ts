// ========== LOGGER SYSTEM ==========
import { Notice } from 'obsidian';
import { AsyncLocalStorage } from 'async_hooks';

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

// ========== LoggerConfig - Shared Configuration for All Loggers ==========

/**
 * LoggerConfig - Shared configuration for both InstantLogger and ScopedLogger.
 * Ensures consistent behavior and settings across all logging.
 */
export class LoggerConfig {
    constructor(
        public logLevel: LogCategory = 'debug',
        public options: LoggerOptions = {}
    ) {}

    setLogLevel(level: LogCategory): void {
        this.logLevel = level;
    }

    setOptions(options: Partial<LoggerOptions>): void {
        this.options = { ...this.options, ...options };
    }

    shouldLog(level: LogCategory): boolean {
        const levels: LogCategory[] = ['debug', 'info', 'warning', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    formatUserMessage(component: string, event: string): string {
        const friendlyComponent = component.replace(/-/g, ' ').toLowerCase();
        const friendlyEvent = event.replace(/_/g, ' ').toLowerCase();
        return `${friendlyComponent}: ${friendlyEvent}`;
    }

    /**
     * Log to console immediately (used as fallback when no async context)
     */
    logToConsole(level: LogCategory, component: string, event: string, data?: any): void {
        const message = `[TAGVERSE] ${component} | ${event}`;

        switch (level) {
            case 'error':
                console.error(message, data || '');
                if (this.options.showNoticeOnError) {
                    const userMessage = this.formatUserMessage(component, event);
                    new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
                }
                break;
            case 'warning':
                console.warn(message, data || '');
                if (this.options.showNoticeOnWarning) {
                    const userMessage = this.formatUserMessage(component, event);
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

/**
 * 🔮 THE MAGIC: AsyncLocalStorage instance that tracks logging context
 * across async boundaries. This enables automatic scope inheritance.
 */
const asyncLogContext = new AsyncLocalStorage<LogContext>();

/**
 * Get the current log context from AsyncLocalStorage.
 * Returns undefined if no context is active (outside withLogScope).
 */
function getCurrentLogContext(): LogContext | undefined {
    return asyncLogContext.getStore();
}

// ========== InstantLogger - Immediate Console Logging ==========

/**
 * InstantLogger - Logs immediately to console without buffering.
 * Use for user-facing operations, services, and real-time feedback.
 */
export class InstantLogger {
    constructor(
        private readonly prefix: string = '[TAGVERSE]',
        private readonly config: LoggerConfig
    ) {}

    // ========== Logging Methods ==========

    debug(component: string, event: string, data?: any): void {
        if (this.config.shouldLog('debug')) {
            this.flushImmediate('debug', component, event, data);
        }
    }

    info(component: string, event: string, data?: any): void {
        if (this.config.shouldLog('info')) {
            this.flushImmediate('info', component, event, data);
        }
    }

    warn(component: string, event: string, data?: any): void {
        if (this.config.shouldLog('warning')) {
            this.flushImmediate('warning', component, event, data);

            if (this.config.options.showNoticeOnWarning) {
                const userMessage = this.config.formatUserMessage(component, event);
                new Notice(`⚠️ ${userMessage}\nCheck console for details.`, 5000);
            }
        }
    }

    error(component: string, event: string, error: Error | any): void {
        if (this.config.shouldLog('error')) {
            this.flushImmediate('error', component, event, {
                error: error instanceof Error ? error.message : error
            });

            if (this.config.options.showNoticeOnError) {
                const userMessage = this.config.formatUserMessage(component, event);
                new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
            }
        }
    }

    // ========== Private Methods ==========

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
        readonly parent: LogScope | null = null,
        private readonly config?: LoggerConfig
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
     * Create a child scope under this scope
     */
    createChild(label: string): LogScope {
        const childScope = new LogScope(label, this, this.config);
        this.addChildScope(childScope);
        return childScope;
    }

    /**
     * Check if this scope has any entries (including child scopes).
     * Returns false if scope is empty (all logs filtered by log level or no logs).
     * Recursively checks child scopes.
     */
    hasEntries(): boolean {
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

    /**
     * Flush this scope and all children to console recursively.
     * Skips empty scopes (no entries after log level filtering).
     */
    flush(): void {
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
                if (this.config?.options.showNoticeOnError) {
                    const userMessage = this.config.formatUserMessage(entry.component, entry.event);
                    new Notice(`❌ ${userMessage}\nCheck console (Ctrl+Shift+I) for details.`, 7000);
                }
                break;
            case 'warning':
                console.warn(message, data || '');
                if (this.config?.options.showNoticeOnWarning) {
                    const userMessage = this.config.formatUserMessage(entry.component, entry.event);
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
}

// ========== ScopedLogger - REMOVED (Use withLogScope() instead) ==========
// The ScopedLogger class has been replaced by the AsyncLocalStorage-based
// withLogScope() and emit() APIs for automatic scope inheritance.

// ========== Async-Context-Aware APIs (NEW!) ==========

/**
 * 🔮 THE MAGIC: Create a scoped logging context using AsyncLocalStorage.
 *
 * Any function called within the callback (including nested calls) can access
 * the current scope via emit() or getCurrentScopedLogger() without explicit
 * logger passing.
 *
 * Root scopes (depth 0) auto-flush on completion.
 * Nested scopes inherit parent context and add as child.
 *
 * @example
 * await withLogScope('Operation', async () => {
 *     emit('info', 'component', 'event', data);
 *     await innerFunction(); // Can emit without passing logger!
 * });
 */
export async function withLogScope<T>(
    label: string,
    fn: () => T | Promise<T>
): Promise<T> {
    // Get parent context (if any)
    const parentContext = asyncLogContext.getStore();

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
        scope = new LogScope(label, null, loggerConfig);
        rootScope = scope;
    }

    // Create new context
    const context: LogContext = {
        scope,
        depth,
        rootScope
    };

    // 🔮 MAGIC: Run function with this context in AsyncLocalStorage
    return asyncLogContext.run(context, async () => {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            // Context still available in error handling
            emit('error', 'ERROR', 'Uncaught error in scope', {
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

/**
 * 🔮 THE MAGIC: Emit a log to the current ambient scope from AsyncLocalStorage.
 *
 * If inside a withLogScope(), logs are added to that scope.
 * If outside any scope, falls back to instant console logging.
 *
 * @example
 * function validateUser(user: User) {
 *     emit('debug', 'validation', 'checking-email', { email: user.email });
 *     // No logger parameter needed!
 * }
 */
export function emit(
    level: LogCategory,
    component: string,
    event: string,
    data?: any
): void {
    // Check if logging should happen
    if (!loggerConfig.shouldLog(level)) {
        return;
    }

    // 🔮 MAGIC: Get current context from AsyncLocalStorage
    const context = getCurrentLogContext();

    if (context) {
        // We're inside a withLogScope - add to that scope
        context.scope.addEntry(level, component, event, data);
    } else {
        // No scope context - fall back to instant logging
        loggerConfig.logToConsole(level, component, event, data);
    }
}

/**
 * Scoped logger API for convenient method-based logging
 */
export interface ScopedLoggerAPI {
    debug(component: string, event: string, data?: any): void;
    info(component: string, event: string, data?: any): void;
    warn(component: string, event: string, data?: any): void;
    error(component: string, event: string, data?: any): void;
    withScope<T>(label: string, fn: () => T | Promise<T>): Promise<T>;
}

/**
 * Get a scoped logger API from the current ambient context.
 * Returns null if outside any withLogScope().
 *
 * @example
 * const logger = getCurrentScopedLogger();
 * if (logger) {
 *     logger.debug('component', 'event', data);
 * }
 */
export function getCurrentScopedLogger(): ScopedLoggerAPI | null {
    const context = getCurrentLogContext();

    if (!context) return null;

    // Return object with convenient methods
    return {
        debug: (component: string, event: string, data?: any) =>
            emit('debug', component, event, data),
        info: (component: string, event: string, data?: any) =>
            emit('info', component, event, data),
        warn: (component: string, event: string, data?: any) =>
            emit('warning', component, event, data),
        error: (component: string, event: string, data?: any) =>
            emit('error', component, event, data),

        // Create nested scope
        withScope: <T>(label: string, fn: () => T | Promise<T>) =>
            withLogScope(label, fn)
    };
}

// ========== Shared Logger Configuration ==========

/**
 * Shared logger configuration instance used by all loggers.
 * Ensures consistent behavior across InstantLogger and ScopedLogger.
 */
export const loggerConfig = new LoggerConfig('debug', {
    showNoticeOnError: true,
    showNoticeOnWarning: false
});



// ========== Configuration Functions ==========

/**
 * Set the default log level for all loggers
 */
export function setDefaultLogLevel(level: LogCategory): void {
    loggerConfig.setLogLevel(level);
}

/**
 * Set the default logger options for all loggers
 */
export function setDefaultLoggerOptions(options: LoggerOptions): void {
    loggerConfig.setOptions(options);
}

// createScopedLogger REMOVED - Use withLogScope() instead

// ========== Default Logger Instance ==========

/**
 * Default logger instance for direct import and use.
 * Eliminates need for dependency injection in simple cases.
 */
export const logger = new InstantLogger('[TAGVERSE]', loggerConfig);

// ========================================
