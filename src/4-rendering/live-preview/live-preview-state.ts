import { StateField, StateEffect } from '@codemirror/state';

/**
 * Manages state effects and fields for live preview tag mapping updates
 */
export class TagMappingStateManager {
    /**
     * Effect that signals tag mapping changes with a timestamp
     */
    static readonly UpdateEffect = StateEffect.define<number>();

    /**
     * State field that tracks tag mapping version changes
     */
    static readonly VersionField = StateField.define<number>({
        create: () => 0,
        update: (value, tr) => {
            for (let effect of tr.effects) {
                if (effect.is(TagMappingStateManager.UpdateEffect)) {
                    return effect.value;
                }
            }
            return value;
        },
    });

    /**
     * Create an effect that triggers live preview decoration rebuild
     */
    static createInvalidateEffect(): StateEffect<number> {
        return TagMappingStateManager.UpdateEffect.of(Date.now());
    }
}
