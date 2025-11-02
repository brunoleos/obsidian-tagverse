import { logger, LogGroup } from './logger';

/**
 * Tagverse-specific convenience methods for the logger.
 * These methods provide component-specific logging patterns for the Tagverse plugin.
 */

// ========== Convenience Methods for Tagverse Components ==========

/**
 * Plugin initialization logging
 */
export function logPluginInit(event: string, data?: any, group?: LogGroup) {
    logger.info('PLUGIN-INIT', event, data);
}

/**
 * Widget lifecycle logging
 */
export function logWidgetLifecycle(event: string, data?: any, group?: LogGroup) {
    logger.debug('WIDGET', event, data);
}

/**
 * Render pipeline logging
 */
export function logRenderPipeline(event: string, data?: any, group?: LogGroup) {
    logger.debug('RENDER-PIPELINE', event, data);
}

/**
 * Script execution logging
 */
export function logScriptExecution(event: string, data?: any, group?: LogGroup) {
    logger.debug('SCRIPT-EXEC', event, data);
}

/**
 * Cache operation logging
 */
export function logCacheOperation(event: string, data?: any, group?: LogGroup) {
    logger.debug('SCRIPT-CACHE', event, data);
}

/**
 * Tag matching logging
 */
export function logTagMatching(event: string, data?: any, group?: LogGroup) {
    logger.debug('TAG-MATCH', event, data);
}

/**
 * User action logging
 */
export function logUserAction(event: string, data?: any, group?: LogGroup) {
    logger.info('USER-ACTION', event, data);
}

/**
 * Error handling logging
 */
export function logErrorHandling(event: string, error?: any, group?: LogGroup) {
    logger.error('ERROR-HANDLING', event, error);
}

// ========== Re-export logger for convenience ==========

export { logger } from './logger';
export type { LoggerOptions, LogEntry, LogGroup } from './logger';
