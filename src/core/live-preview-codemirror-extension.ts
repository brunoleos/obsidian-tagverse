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

                // Extract tag name early (before full parsing) for group creation
                const tagNameMatch = fullMatch.match(/^#([a-zA-Z0-9_-]+)/);
                const tagName = tagNameMatch ? tagNameMatch[1] : 'unknown';

                const tagLength = fullMatch.length;
                const cursor = view.state.selection.main.head;
                const isLivePreview = view.state.field(editorLivePreviewField as unknown as StateField<boolean>);
                const cursorInside = cursor > pos - 1 && cursor < pos + tagLength + 1;

                // Start tag processing group BEFORE parsing (so parser logs appear inside)
                const groupId = logger.startTagProcessingGroup(tagName, pos, 'live-preview', {
                    cursorInside
                });

                // Now parse (TAG_PARSER logs will appear inside the group)
                const parsed = TagParser.parseTag(fullMatch);
                const tag = parsed.tag;
                const args = parsed.args;

                const context: MatchContext = {
                    tag,
                    args,
                    isLivePreview: isLivePreview as boolean,
                    cursorInside,
                    position: pos,
                    cursor,
                    groupId  // Pass groupId through context
                };

                let decoration = null;
                try {
                    if (this.tagMatchingService.shouldCreateWidget(context)) {
                        decoration = this.tagMatchingService.createWidgetDecoration(tag, args, context);
                    }
                } finally {
                    // End tag processing group
                    // Note: For async rendering, the group will be reopened in the renderer
                    logger.endTagProcessingGroup(groupId);
                }

                return decoration;
            }
        });
    }
}
