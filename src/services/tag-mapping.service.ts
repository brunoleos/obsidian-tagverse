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

        if (mappings.length > 0) {
            logger.startLoopGroup('TAG-MAPPING', 'Rebuilding tag mappings', {
                totalMappings: mappings.length
            });

            mappings.forEach((mapping) => {
                if (mapping.enabled) {
                    this.normalizedTagMap.set(mapping.tag.toLowerCase(), { ...mapping });
                    logger.logLoopIteration('TAG-MAPPING', 'Mapping enabled', {
                        tag: mapping.tag,
                        script: mapping.scriptPath
                    });
                } else {
                    logger.logLoopIteration('TAG-MAPPING', 'Mapping disabled (skipped)', {
                        tag: mapping.tag
                    });
                }
            });

            logger.endLoopGroup();
        }

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
