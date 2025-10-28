import { logger } from '../utils/logger';
import { TagScriptMapping } from '../types/interfaces';
import { ITagMappingProvider } from './interfaces';

/**
 * Service responsible for managing tag-to-script mappings.
 * Implements Single Responsibility Principle by focusing only on tag mapping logic.
 */
export class TagMappingService implements ITagMappingProvider {
    private normalizedTagMap = new Map<string, TagScriptMapping>();

    /**
     * Get mapping for a tag (case-insensitive)
     */
    getMapping(tag: string): TagScriptMapping | undefined {
        return this.normalizedTagMap.get(tag.toLowerCase());
    }

    /**
     * Rebuild the tag mapping from settings
     */
    rebuildMappings(mappings: TagScriptMapping[]): void {
        this.normalizedTagMap.clear();

        mappings.forEach((mapping) => {
            if (mapping.enabled) {
                this.normalizedTagMap.set(mapping.tag.toLowerCase(), { ...mapping });
            }
        });

        logger.logPluginInit('Tag mappings rebuilt', {
            totalMappings: mappings.length,
            enabledMappings: this.normalizedTagMap.size
        });
    }

    /**
     * Get all current mappings
     */
    getAllMappings(): ReadonlyMap<string, TagScriptMapping> {
        return this.normalizedTagMap;
    }
}
