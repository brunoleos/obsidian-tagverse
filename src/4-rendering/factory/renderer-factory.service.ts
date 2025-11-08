import { App } from 'obsidian';
import { TagScriptMapping } from '../../1-domain/types/interfaces';
import { IScriptLoader } from '../../3-services/interfaces';
import { LivePreviewRenderer } from '../live-preview/live-preview-renderer';
import { ReadingModeRenderer } from '../reading-mode/reading-mode-renderer';
import { TagArguments } from '../../2-foundation/parsing/tag-parser';

/**
 * Factory service for creating renderer instances.
 * Implements Dependency Inversion Principle by injecting dependencies into renderers.
 * Implements Open/Closed Principle by centralizing renderer creation.
 */
export class RendererFactoryService {
    constructor(
        private scriptLoader: IScriptLoader,
        private app: App
    ) {}

    /**
     * Create a live preview renderer instance
     */
    createLivePreviewRenderer(
        tag: string,
        mapping: TagScriptMapping,
        sourcePath: string,
        frontmatter: Record<string, unknown>,
        args: TagArguments = {}
    ): LivePreviewRenderer {
        return new LivePreviewRenderer(
            this.scriptLoader,
            this.app,
            tag,
            mapping,
            sourcePath,
            frontmatter,
            args
        );
    }

    /**
     * Create a reading mode renderer instance
     */
    createReadingModeRenderer(
        tag: string,
        mapping: TagScriptMapping,
        sourcePath: string,
        targetElement: HTMLElement,
        args: TagArguments = {}
    ): ReadingModeRenderer {
        return new ReadingModeRenderer(
            this.scriptLoader,
            this.app,
            tag,
            mapping,
            sourcePath,
            targetElement,
            args
        );
    }
}
