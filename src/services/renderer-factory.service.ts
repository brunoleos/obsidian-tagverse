import { App } from 'obsidian';
import { TagScriptMapping } from '../types/interfaces';
import { IScriptLoader } from './interfaces';
import { LivePreviewRenderer } from '../core/live-preview-renderer';
import { ReadingModeRenderer } from '../core/reading-mode-renderer';
import { LoggerFactory } from '../utils/logger';

/**
 * Factory service for creating renderer instances.
 * Implements Dependency Inversion Principle by injecting dependencies into renderers.
 * Implements Open/Closed Principle by centralizing renderer creation.
 */
export class RendererFactoryService {
    constructor(
        private scriptLoader: IScriptLoader,
        private app: App,
        private loggerFactory: LoggerFactory
    ) {}

    /**
     * Create a live preview renderer instance
     */
    createLivePreviewRenderer(
        tag: string,
        mapping: TagScriptMapping,
        sourcePath: string,
        frontmatter: any,
        args: any = {}
    ): LivePreviewRenderer {
        // Create operation-specific scoped logger
        const logger = this.loggerFactory.createScoped(`🎨 Rendering #${tag}`);

        return new LivePreviewRenderer(
            this.scriptLoader,
            this.app,
            tag,
            mapping,
            sourcePath,
            frontmatter,
            args,
            logger
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
        args: any = {},
        groupId?: string,
        position?: number
    ): ReadingModeRenderer {
        // Create operation-specific scoped logger with position info
        const label = position !== undefined
            ? `📖 Processing #${tag} at pos:${position}`
            : `📖 Processing #${tag}`;

        const logger = this.loggerFactory.createScoped(label);

        return new ReadingModeRenderer(
            this.scriptLoader,
            this.app,
            tag,
            mapping,
            sourcePath,
            targetElement,
            args,
            logger
        );
    }
}
