import { App } from 'obsidian';
import { TagScriptMapping } from '../types/interfaces';
import { IScriptLoader } from './interfaces';
import { LivePreviewRenderer } from '../core/live-preview-renderer';
import { ReadingModeRenderer } from '../core/reading-mode-renderer';

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
        frontmatter: any
    ): LivePreviewRenderer {
        return new LivePreviewRenderer(
            this.scriptLoader,
            this.app,
            tag,
            mapping,
            sourcePath,
            frontmatter
        );
    }

    /**
     * Create a reading mode renderer instance
     */
    createReadingModeRenderer(
        tag: string,
        mapping: TagScriptMapping,
        sourcePath: string,
        targetElement: HTMLElement
    ): ReadingModeRenderer {
        return new ReadingModeRenderer(
            this.scriptLoader,
            this.app,
            tag,
            mapping,
            sourcePath,
            targetElement
        );
    }
}
