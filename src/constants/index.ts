// Constants for the Tagverse plugin

// Plugin metadata
export const PLUGIN_NAME = 'Tagverse';
export const PLUGIN_VERSION = '1.0.0';

// Log levels
export const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
} as const;

// CSS classes
export const CSS_CLASSES = {
    WIDGET_CONTAINER: 'tagverse-widget-container',
    ERROR: 'tagverse-error'
} as const;

// Regular expressions
export const REGEX_PATTERNS = {
    /** Matches tags with optional arguments: #tagname or #tagname{args} */
    TAG_ARGUMENT: /#([a-zA-Z0-9_-]+)(\{[^}]*\})?/g,
    /** Extracts just the arguments portion from text: {key: value} */
    ARGS_ONLY: /^\{[^}]*\}/
} as const;

// Default settings are defined in types/interfaces.ts
