import { Decoration } from '@codemirror/view';
import { App } from 'obsidian';
import { TagScriptMapping } from '../types/interfaces';
import { ITagMappingProvider } from './interfaces';
import { RendererFactoryService } from './renderer-factory.service';
import { logger } from '../utils/logger';

export interface MatchContext {
    tag: string;
    args: any;
    isLivePreview: boolean;
    cursorInside: boolean;
    position: number;
    cursor: number;
    groupId?: string; // Optional logging group ID for tag processing
}

/**
 * Service responsible for tag matching logic and widget creation decisions
 */
export class TagMatchingService {
    constructor(
        private tagMapping: ITagMappingProvider,
        private rendererFactory: RendererFactoryService,
        private app: App
    ) {}

    /**
     * Determines if a tag should be replaced with a widget
     */
    shouldCreateWidget(context: MatchContext): boolean {
        const { tag, isLivePreview, cursorInside } = context;

        // Check if this tag has a mapping (optimized O(1) lookup)
        const mapping = this.tagMapping.getMapping(tag);

        // For unmapped tags: no widget
        if (!mapping) {
            logger.debug('TAG-MATCH', 'No mapping found, skipping', { tag, pos: context.position });
            return false;
        }

        // When cursor is inside tag (in live preview), show natively for editing
        if (isLivePreview && cursorInside) {
            logger.debug('TAG-MATCH', 'Cursor inside tag, showing natively', { tag, pos: context.position });
            return false;
        }

        // In live preview, show widgets for mapped tags when cursor is outside
        logger.debug('TAG-MATCH', 'Creating widget for tag', { tag, pos: context.position, script: mapping.scriptPath });
        return true;
    }

    /**
     * Creates a widget decoration for a tag
     */
    createWidgetDecoration(tag: string, args: any, context: MatchContext): Decoration {
        const mapping = this.tagMapping.getMapping(tag);
        if (!mapping) {
            throw new Error(`No mapping found for tag ${tag}`);
        }

        // Get frontmatter from the current file
        const file = this.app.workspace.getActiveFile();
        let frontmatter = {};
        if (file) {
            const cache = this.app.metadataCache.getFileCache(file);
            frontmatter = cache?.frontmatter || {};
        }

        // Create renderer using factory and return decoration
        const renderer = this.rendererFactory.createLivePreviewRenderer(
            tag,
            mapping,
            file?.path || '',
            frontmatter,
            args,
            context.groupId,  // Pass groupId for logging
            context.position  // Pass position for logging
        );

        return Decoration.replace({
            widget: renderer.getWidgetType(),
        });
    }
}
