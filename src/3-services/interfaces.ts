import { App } from 'obsidian';
import { TagScriptMapping, TagverseSettings, ScriptContext } from '../1-domain/types/interfaces';

/**
 * Type for a tag render function
 * Takes a ScriptContext and returns a result (HTMLElement, string, or other value)
 */
export type TagRenderFunction = (context: ScriptContext) => unknown;

/**
 * Interface for script loading and caching service.
 * Manages the lifecycle of script loading and execution.
 */
export interface IScriptLoader {
    /**
     * Load a script from file or cache
     * @param scriptPath Path to the script file
     * @param app Obsidian app instance for vault access
     * @returns A function that can be executed with context
     */
    loadScript(scriptPath: string, app: App): Promise<TagRenderFunction>;

    /**
     * Clear the script cache
     */
    clearCache(): void;

    /**
     * Check if a script is cached
     * @param scriptPath Path to the script file
     */
    isCached(scriptPath: string): boolean;
}

/**
 * Interface for tag mapping provider service.
 * Manages tag-to-script mappings with optimized lookup.
 */
export interface ITagMappingProvider {
    /**
     * Get mapping for a tag (case-insensitive)
     * @param tag The tag name to look up
     * @returns The mapping if found, undefined otherwise
     */
    getMapping(tag: string): TagScriptMapping | undefined;

    /**
     * Rebuild the tag mapping from settings
     * @param mappings Array of tag script mappings
     */
    rebuildMappings(mappings: TagScriptMapping[]): void;

    /**
     * Get all current mappings
     */
    getAllMappings(): ReadonlyMap<string, TagScriptMapping>;
}

/**
 * Interface for settings management service.
 * Handles loading, saving, and providing access to plugin settings.
 */
export interface ISettingsService {
    /**
     * Get current settings
     */
    getSettings(): TagverseSettings;

    /**
     * Save settings
     * @param settings Settings to save
     */
    saveSettings(settings: TagverseSettings): Promise<void>;

    /**
     * Load settings from storage
     */
    loadSettings(): Promise<void>;

    /**
     * Register a callback for settings changes
     * @param callback Function to call when settings change
     */
    onSettingsChanged(callback: (settings: TagverseSettings) => void): void;
}
