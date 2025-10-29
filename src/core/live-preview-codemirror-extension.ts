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
import { TagMatchingService, MatchContext } from '../services/tag-matching.service';
import { TagMappingStateManager } from './live-preview-state';
import { logger } from '../utils/logger';
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

            constructor(view: EditorView) {
                logger.debug('VIEWPLUGIN', 'Constructor', {});
                this.decorations = this.shouldCreateDecorations(view) ? matchDecorator.createDeco(view) : Decoration.none;
            }

            update(update: ViewUpdate) {
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
                const parsed = TagParser.parseTag(fullMatch);
                const tag = parsed.tag;
                const args = parsed.args;
                const tagLength = fullMatch.length;
                const cursor = view.state.selection.main.head;
                const isLivePreview = view.state.field(editorLivePreviewField as unknown as StateField<boolean>);
                const cursorInside = cursor > pos - 1 && cursor < pos + tagLength + 1;

                const context: MatchContext = {
                    tag,
                    args,
                    isLivePreview: isLivePreview as boolean,
                    cursorInside,
                    position: pos,
                    cursor
                };

                if (this.tagMatchingService.shouldCreateWidget(context)) {
                    return this.tagMatchingService.createWidgetDecoration(tag, args, context);
                }

                return null;
            }
        });
    }
}
