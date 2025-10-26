// Stress test script for Dynamic Tag Renderer
// Tests various layout scenarios to ensure identical rendering in reading and live preview modes

/**
 * Comprehensive stress test for layout consistency
 * @param {Object} context - The rendering context
 * @returns {HTMLElement} The test widget
 */
async function render(context) {

    // Create main container
    const container = context.element.createEl('div', {
        cls: 'stress-test-main'
    });

    // Test 1: Simple button (baseline - should work)
    const simpleBtn = container.createEl('button', {
        text: 'Simple',
        cls: 'stress-simple-btn'
    });
    simpleBtn.style.cssText = `
        padding: 6px 12px;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    `;

    // Test 2: Complex badge (the original problem)
    const badge = container.createEl('span', {
        cls: 'stress-badge'
    });
    badge.innerHTML = `
        <span style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 12px;
            background: linear-gradient(135deg, var(--interactive-accent), var(--interactive-accent-hover));
            color: var(--text-on-accent);
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        ">
            🧪 STRESS
            <span style="
                background: rgba(255,255,255,0.3);
                padding: 2px 8px;
                border-radius: 8px;
                font-size: 0.9em;
            ">TEST</span>
        </span>
    `;

    // Test 3: Multi-element horizontal layout
    const multiContainer = container.createEl('div', {
        cls: 'stress-multi'
    });
    multiContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        background: var(--background-modifier-hover);
        border: 2px solid var(--interactive-accent);
        border-radius: 8px;
    `;

    // Add multiple elements that should stay horizontal
    for (let i = 1; i <= 3; i++) {
        const item = multiContainer.createEl('span', {
            text: `Item${i}`,
            cls: `stress-item-${i}`
        });
        item.style.cssText = `
            padding: 4px 8px;
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
        `;
    }

    // Test 4: Long text that might wrap
    const longText = container.createEl('div', {
        text: 'This is a very long text that should not wrap in the middle of important content',
        cls: 'stress-long-text'
    });
    longText.style.cssText = `
        padding: 6px 12px;
        background: var(--background-modifier-error);
        color: var(--text-error);
        border-radius: 6px;
        font-size: 0.8em;
        border: 1px solid var(--text-error);
        max-width: 200px;
    `;

    // Test 5: Nested flex containers
    const nestedContainer = container.createEl('div', {
        cls: 'stress-nested'
    });
    nestedContainer.style.cssText = `
        display: inline-flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        background: var(--background-modifier-success);
        border: 1px solid var(--text-success);
        border-radius: 6px;
    `;

    // Add nested items
    for (let i = 1; i <= 2; i++) {
        const nestedItem = nestedContainer.createEl('span', {
            text: `Nested${i}`,
            cls: `stress-nested-${i}`
        });
        nestedItem.style.cssText = `
            padding: 2px 6px;
            background: var(--interactive-success);
            color: var(--text-on-accent);
            border-radius: 3px;
            font-size: 0.7em;
        `;
    }

    // Test 6: Mixed inline and block elements
    const mixedContainer = container.createEl('span', {
        cls: 'stress-mixed'
    });
    mixedContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: var(--background-modifier-warning);
        border: 1px solid var(--text-warning);
        border-radius: 4px;
    `;

    // Add mixed content
    mixedContainer.createEl('strong', { text: 'Bold' });
    mixedContainer.createEl('span', { text: 'Normal' });
    mixedContainer.createEl('em', { text: 'Italic' });

    return container;
}
