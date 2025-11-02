import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    MatchDecorator
} from '@codemirror/view';
import { App, editorLivePreviewField } from 'obsidian';
import { StateField } from '@codemirror/state';
import { logger } from '../utils/logger';
import { TagMatchingService, MatchContext } from '../services/tag-matching.service';
import { TagMappingStateManager } from './live-preview-state';
import { TagParser } from '../utils/tag-parser';
import { REGEX_PATTERNS } from '../constants';

/**
 * Handles CodeMirror extension setup for live preview tag rendering
 */
export class LivePreviewCodeMirrorExtension {
    constructor(
        private tagMatchingService: TagMatchingService,
        private app: App
    ) {}

    /**
     * Creates the CodeMirror extension for live preview
     */
    createExtension(): [ViewPlugin<any>, any] {
        const matchDecorator = this.createMatchDecorator();

        const livePreviewPlugin = ViewPlugin.fromClass(class {
            decorations: DecorationSet;
            private needsInitialUpdate = true;
            private justInitialized = false;

            constructor(view: EditorView) {
                logger.debug('VIEWPLUGIN', 'Constructor', {});
                // Defer initial decoration creation to first update to prevent duplicate processing
                this.decorations = Decoration.none;
            }

            update(update: ViewUpdate) {
                // Handle initial decoration creation on first update
                if (this.needsInitialUpdate) {
                    this.needsInitialUpdate = false;
                    logger.debug('VIEWPLUGIN', 'Initial update - creating decorations', {});
                    this.decorations = this.shouldCreateDecorations(update.view) ? matchDecorator.createDeco(update.view) : Decoration.none;

                    // Debounce subsequent updates for 100ms to prevent rapid re-renders during initialization
                    this.justInitialized = true;
                    setTimeout(() => this.justInitialized = false, 100);
                    return;
                }

                // Skip updates during debounce period
                if (this.justInitialized) {
                    logger.debug('VIEWPLUGIN', 'Skipping update - debounce period', {});
                    return;
                }

                const reasons = {
                    docChanged: update.docChanged,
                    selectionChanged: update.startState.selection.main !== update.state.selection.main,
                    editorModeChanged: update.startState.field(editorLivePreviewField as unknown as StateField<boolean>) !==
                                       update.state.field(editorLivePreviewField as unknown as StateField<boolean>),
                    mappingVersionChanged: update.startState.field(TagMappingStateManager.VersionField) !==
                                          update.state.field(TagMappingStateManager.VersionField)
                };

                logger.debug('VIEWPLUGIN', 'Update called', {
                    ...reasons,
                    cursor: update.state.selection.main.head
                });

                if (Object.values(reasons).some(Boolean)) {
                    const reasonStr = Object.entries(reasons)
                        .filter(([_, value]) => value)
                        .map(([key]) => key.replace(/([A-Z])/g, ' $1').toLowerCase())
                        .join(', ');

                    logger.debug('VIEWPLUGIN', 'Rebuilding decorations', { reason: reasonStr });

                    this.decorations = this.shouldCreateDecorations(update.view) ? matchDecorator.createDeco(update.view) : Decoration.none;
                }
            }

            private shouldCreateDecorations(view: EditorView): boolean {
                return view.state.field(editorLivePreviewField as unknown as StateField<boolean>);
            }

            destroy() {
                logger.debug('VIEWPLUGIN', 'Destroyed', {});
            }
        }, {
            decorations: v => v.decorations
        });

        return [livePreviewPlugin, TagMappingStateManager.VersionField];
    }

    /**
     * Creates the match decorator for hashtag replacement
     * Supports both #tag and #tag{args} syntax
     */
    private createMatchDecorator(): MatchDecorator {
        return new MatchDecorator({
            regexp: REGEX_PATTERNS.TAG_ARGUMENT,
            decoration: (match: RegExpExecArray, view: EditorView, pos: number) => {
                const fullMatch = match[0];

                // Extract tag name early for logging
                const tagNameMatch = fullMatch.match(/^#([a-zA-Z0-9_-]+)/);
                const tagName = tagNameMatch ? tagNameMatch[1] : 'unknown';

                const tagLength = fullMatch.length;
                const cursor = view.state.selection.main.head;
                const isLivePreview = view.state.field(editorLivePreviewField as unknown as StateField<boolean>);
                const cursorInside = cursor > pos - 1 && cursor < pos + tagLength + 1;

                // Parse tag (logs go to active context if any)
                const parsed = TagParser.parseTag(fullMatch);
                const tag = parsed.tag;
                const args = parsed.args;

                logger.debug('TAG', 'Tag parsed in live preview', {
                    tag,
                    pos,
                    cursorInside
                });

                const context: MatchContext = {
                    tag,
                    args,
                    isLivePreview: isLivePreview as boolean,
                    cursorInside,
                    position: pos,
                    cursor
                };

                let decoration = null;
                if (this.tagMatchingService.shouldCreateWidget(context)) {
                    decoration = this.tagMatchingService.createWidgetDecoration(tag, args, context);
                }

                return decoration;
            }
        });
    }
}
