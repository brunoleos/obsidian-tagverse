import {
    App,
    Plugin,
    PluginSettingTab,
    Setting,
    MarkdownView,
    MarkdownPostProcessorContext,
    Notice,
    TFile
} from 'obsidian';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { RangeSetBuilder } from '@codemirror/state';

interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

interface ScriptContext {
    app: App;
    tag: string;
    element: HTMLElement;
    sourcePath: string;
    frontmatter: any;
    Notice: typeof Notice;
}

interface DynamicTagRendererSettings {
    tagMappings: TagScriptMapping[];
    refreshOnFileChange: boolean;
}

const DEFAULT_SETTINGS: DynamicTagRendererSettings = {
    tagMappings: [],
    refreshOnFileChange: true
};

class DynamicTagWidget extends WidgetType {
    private container: HTMLElement | null = null;
    private rendered = false;

    constructor(
        private plugin: DynamicTagRendererPlugin,
        private tag: string,
        private mapping: TagScriptMapping,
        private sourcePath: string,
        private frontmatter: any
    ) {
        super();
        this.container = createSpan({ cls: 'dynamic-tag-container' });
        this.container.innerHTML = `Loading #${this.tag}...`;
    }

    eq(other: DynamicTagWidget): boolean {
        return other.tag === this.tag && other.sourcePath === this.sourcePath;
    }

    toDOM(): HTMLElement {
        if (!this.rendered) {
            this.renderContent();
        }
        return this.container!;
    }

    private async renderContent() {
        if (this.rendered) return;
        this.rendered = true;

        try {
            const renderFunction = await this.plugin.loadScript(this.mapping.scriptPath);

            // Create a temporary container for the script to render into
            const tempContainer = createSpan();

            const scriptContext: ScriptContext = {
                app: this.plugin.app,
                tag: this.mapping.tag,
                element: tempContainer,
                sourcePath: this.sourcePath,
                frontmatter: this.frontmatter,
                Notice: Notice
            };

            const result = await renderFunction(scriptContext);

            // Clear any content added by the script
            this.container!.innerHTML = '';

            // Output validation and fallback
            if (result === null || result === undefined) {
                this.container!.innerHTML = `#${this.tag}`;
            } else if (typeof result === 'string') {
                this.container!.innerHTML = result;
            } else if (result instanceof HTMLElement) {
                this.container!.appendChild(result);
            } else {
                this.container!.innerHTML = `[Invalid output for #${this.mapping.tag}]`;
            }

            // Ensure the container displays inline and doesn't break the line
            this.container!.style.display = 'inline-block';
            this.container!.style.verticalAlign = 'baseline';
            this.container!.style.margin = '0 2px';

        } catch (error) {
            console.error(`Error rendering tag #${this.mapping.tag}:`, error);
            this.container!.innerHTML = `[Error rendering #${this.mapping.tag}]`;
        }
    }
}

export let DynamicTagRendererPluginInstance: DynamicTagRendererPlugin | null = null;

export default class DynamicTagRendererPlugin extends Plugin {
    settings: DynamicTagRendererSettings;
    private scriptCache: Map<string, Function> = new Map();
    private livePreviewObserver: MutationObserver | null = null;

    private dynamicTagPlugin = ViewPlugin.fromClass(class {
        decorations: DecorationSet;
        private plugin: DynamicTagRendererPlugin;

        constructor(view: EditorView) {
            this.plugin = this.getPluginInstance(view);
            this.decorations = this.buildDecorations(view);
        }

        private getPluginInstance(view: EditorView): DynamicTagRendererPlugin {
            // Use the global instance
            return DynamicTagRendererPluginInstance!;
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();

            if (!this.plugin || !this.plugin.settings) return builder.finish();

            const doc = view.state.doc;
            const text = doc.toString();

            // Find all #tag patterns
            const tagRegex = /#([a-zA-Z0-9_-]+)/g;
            let match;
            while ((match = tagRegex.exec(text)) !== null) {
                const tag = match[1];
                const mapping = this.plugin.settings.tagMappings.find(
                    m => m.enabled && m.tag.toLowerCase() === tag.toLowerCase()
                );

                if (mapping) {
                    const start = match.index;
                    const end = start + match[0].length;

                    // Get frontmatter from the file
                    const file = this.plugin.app.workspace.getActiveFile();
                    let frontmatter = {};
                    if (file) {
                        const cache = this.plugin.app.metadataCache.getFileCache(file);
                        frontmatter = cache?.frontmatter || {};
                    }

                    const decoration = Decoration.replace({
                        widget: new DynamicTagWidget(this.plugin, tag, mapping, file?.path || '', frontmatter),
                        block: false
                    });

                    builder.add(start, end, decoration);
                }
            }

            return builder.finish();
        }
    }, {
        decorations: v => v.decorations
    });

    async onload() {
        DynamicTagRendererPluginInstance = this;
        await this.loadSettings();

        // Register markdown post processor for reading mode
        this.registerMarkdownPostProcessor(this.processMarkdown.bind(this));

        // Register CodeMirror plugin for source mode
        this.registerEditorExtension(this.dynamicTagPlugin);

        // Register live preview processor
        this.registerLivePreviewProcessor();

        // Register event for file changes if enabled
        this.registerEvent(
            this.app.workspace.on('file-open', () => {
                if (this.settings.refreshOnFileChange) {
                    this.refreshActiveView();
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new DynamicTagRendererSettingTab(this.app, this));

        // Add command to refresh current view
        this.addCommand({
            id: 'refresh-dynamic-tags',
            name: 'Refresh dynamic tags in current note',
            callback: () => {
                this.refreshActiveView();
                new Notice('Dynamic tags refreshed');
            }
        });

        // Add command to clear script cache
        this.addCommand({
            id: 'clear-script-cache',
            name: 'Clear script cache',
            callback: () => {
                this.scriptCache.clear();
                new Notice('Script cache cleared');
            }
        });

        console.log('Dynamic Tag Renderer plugin loaded');
    }

    onunload() {
        DynamicTagRendererPluginInstance = null;
        if (this.livePreviewObserver) {
            this.livePreviewObserver.disconnect();
        }
        this.scriptCache.clear();
        console.log('Dynamic Tag Renderer plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.scriptCache.clear(); // Clear cache when settings change
        this.refreshActiveView();
    }

    private async processMarkdown(
        element: HTMLElement,
        context: MarkdownPostProcessorContext
    ) {
        // Find all tag elements in the markdown
        const tagElements = element.findAll('a.tag');
        for (const tagEl of tagElements) {
            const tagText = tagEl.getAttribute('data-tag-name') || tagEl.textContent?.replace('#', '');
            if (!tagText) continue;
            // Case-insensitive tag matching
            const mapping = this.settings.tagMappings.find(
                m => m.enabled && m.tag.toLowerCase() === tagText.toLowerCase()
            );

            if (mapping) {
                await this.renderDynamicTag(tagEl, mapping, context);
            }
        }
    }

    private async renderDynamicTag(
        tagEl: HTMLElement,
        mapping: TagScriptMapping,
        context: MarkdownPostProcessorContext
    ) {
        try {
            // Load and execute the script
            const renderFunction = await this.loadScript(mapping.scriptPath);

            // Create a span container for consistency with Live Preview
            const container = createSpan({ cls: 'dynamic-tag-container' });

            // Prepare context for the script
            const scriptContext: ScriptContext = {
                app: this.app,
                tag: mapping.tag,
                element: container,
                sourcePath: context.sourcePath,
                frontmatter: context.frontmatter,
                Notice: Notice
            };

            // Execute the render function
            const result = await renderFunction(scriptContext);

            // Clear any content added by the script
            container.innerHTML = '';

            // Output validation and fallback
            if (result === null || result === undefined) {
                // Show original tag if script returns nothing
                container.appendChild(tagEl.cloneNode(true));
            } else if (typeof result === 'string') {
                container.innerHTML = result;
            } else if (result instanceof HTMLElement) {
                container.appendChild(result);
            } else {
                // Show error if output type is invalid
                const errorEl = createSpan({
                    cls: 'dynamic-tag-error',
                    text: `[Invalid output for #${mapping.tag}]`
                });
                container.appendChild(errorEl);
            }

            // Ensure the container displays inline and doesn't break the line
            container.style.verticalAlign = 'baseline';
            container.style.margin = '0 2px';

            tagEl.replaceWith(container);

        } catch (error) {
            console.error(`Error rendering tag #${mapping.tag}:`, error);
            const errorEl = createSpan({
                cls: 'dynamic-tag-error',
                text: `[Error rendering #${mapping.tag}]`
            });
            tagEl.replaceWith(errorEl);
        }
    }

    async loadScript(scriptPath: string): Promise<Function> {
        // Check cache first
        if (this.scriptCache.has(scriptPath)) {
            return this.scriptCache.get(scriptPath)!;
        }

        // Load the script file
        const file = this.app.vault.getAbstractFileByPath(scriptPath);

        if (!file || !(file instanceof TFile)) {
            throw new Error(`Script file not found or not a file: ${scriptPath}`);
        }

        const scriptContent = await this.app.vault.read(file);

        // Create a function from the script content
        // The script should export a render function
        try {
            // Wrap in async function to support await
            const wrappedScript = `
                return (async function(context) {
                    const Notice = context.Notice;
                    ${scriptContent}

                    // If render function is defined, call it
                    if (typeof render === 'function') {
                        return await render(context);
                    }

                    throw new Error('No render() function found in script');
                });
            `;

            const scriptFunction = new Function(wrappedScript)();

            // Cache the function
            this.scriptCache.set(scriptPath, scriptFunction);

            return scriptFunction;
        } catch (error) {
            throw new Error(`Failed to load script ${scriptPath}: ${error.message}`);
        }
    }

    private registerLivePreviewProcessor() {
        // Use MutationObserver to watch for hashtag elements in Live Preview
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            this.processLivePreviewHashtags(element);
                        }
                    });
                }
            });
        });

        // Store reference for cleanup
        this.livePreviewObserver = observer;

        // Observe the entire workspace for changes
        const workspaceEl = this.app.workspace.containerEl;
        observer.observe(workspaceEl, {
            childList: true,
            subtree: true
        });

        // Also listen for active leaf changes to process new views
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf && leaf.view.getViewType() === 'markdown') {
                    // Small delay to ensure the view is fully rendered
                    setTimeout(() => {
                        this.processLivePreviewHashtags(leaf.view.containerEl);
                    }, 100);
                }
            })
        );
    }

    private processLivePreviewHashtags(element: HTMLElement) {
        // Find hashtag elements in Live Preview mode
        // Look for spans with cm-hashtag-end class which contains the actual tag text
        const hashtagElements = element.querySelectorAll('span.cm-hashtag-end:not([data-dynamic-tag-processed])');

        hashtagElements.forEach(async (hashtagEl) => {
            // Double-check if this element has already been processed (in case the attribute was added after the query)
            if (hashtagEl.hasAttribute('data-dynamic-tag-processed')) {
                return;
            }

            // Get the tag text from the element's text content
            const tagText = hashtagEl.textContent?.trim();
            if (!tagText) return;

            // Find matching tag mapping
            const mapping = this.settings.tagMappings.find(
                m => m.enabled && m.tag.toLowerCase() === tagText.toLowerCase()
            );

            if (mapping) {
                // Get frontmatter from the current file
                const file = this.app.workspace.getActiveFile();
                let frontmatter = {};
                if (file) {
                    const cache = this.app.metadataCache.getFileCache(file);
                    frontmatter = cache?.frontmatter || {};
                }

                // Mark as processed immediately to prevent duplicate processing
                hashtagEl.setAttribute('data-dynamic-tag-processed', 'true');

                // Render the dynamic tag
                await this.renderLivePreviewTag(hashtagEl as HTMLElement, tagText, mapping, frontmatter);
            }
        });
    }

    private async renderLivePreviewTag(
        hashtagEl: HTMLElement,
        tagText: string,
        mapping: TagScriptMapping,
        frontmatter: any
    ) {
        try {
            // Load and execute the script
            const renderFunction = await this.loadScript(mapping.scriptPath);

            // Create a span container for the script output
            const container = createSpan({ cls: 'dynamic-tag-container' });

            // Prepare context for the script
            const scriptContext: ScriptContext = {
                app: this.app,
                tag: mapping.tag,
                element: container,
                sourcePath: this.app.workspace.getActiveFile()?.path || '',
                frontmatter: frontmatter,
                Notice: Notice
            };

            // Execute the render function
            const result = await renderFunction(scriptContext);

            // Clear any content added by the script
            container.innerHTML = '';

            // Output validation and fallback
            if (result === null || result === undefined) {
                container.innerHTML = `#${tagText}`;
            } else if (typeof result === 'string') {
                container.innerHTML = result;
            } else if (result instanceof HTMLElement) {
                container.appendChild(result);
            } else {
                const errorEl = createSpan({
                    cls: 'dynamic-tag-error',
                    text: `[Invalid output for #${mapping.tag}]`
                });
                container.appendChild(errorEl);
            }

            // Find the complete hashtag structure and replace it
            const parentLine = hashtagEl.closest('.cm-line');
            if (parentLine) {
                // Find all hashtag-related spans for this specific tag
                const hashtagSpans = parentLine.querySelectorAll(`span.cm-hashtag-begin.cm-tag-${tagText}, span.cm-hashtag-end.cm-tag-${tagText}`);

                if (hashtagSpans.length >= 2) {
                    // Replace all hashtag spans with our container
                    const firstSpan = hashtagSpans[0];
                    const lastSpan = hashtagSpans[hashtagSpans.length - 1];

                    // Insert our container before the first span
                    parentLine.insertBefore(container, firstSpan);

                    // Remove all hashtag spans
                    hashtagSpans.forEach(span => span.remove());

                } else {
                    // Fallback: just replace the end span
                    hashtagEl.replaceWith(container);
                }
            }

            // Ensure the container displays inline and doesn't break the line
            container.style.verticalAlign = 'baseline';
            container.style.margin = '0 2px';

        } catch (error) {
            console.error(`Error rendering tag #${mapping.tag}:`, error);
            const errorEl = createSpan({
                cls: 'dynamic-tag-error',
                text: `[Error rendering #${mapping.tag}]`
            });

            // Fallback: just replace the end span with error
            hashtagEl.replaceWith(errorEl);
        }
    }

    private refreshActiveView() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            // Force re-render by switching modes
            const currentMode = view.getMode();
            if (currentMode === 'preview') {
                view.previewMode.rerender(true);
            } else if (currentMode === 'source') {
                // Force refresh of editor decorations
                const editor = view.editor;
                if (editor && (editor as any).cm) {
                    (editor as any).cm.dispatch();
                }
            }
        }
    }
}

class DynamicTagRendererSettingTab extends PluginSettingTab {
    plugin: DynamicTagRendererPlugin;

    constructor(app: App, plugin: DynamicTagRendererPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Dynamic Tag Renderer Settings' });

        // General settings
        new Setting(containerEl)
            .setName('Refresh on file change')
            .setDesc('Automatically refresh dynamic tags when opening a file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.refreshOnFileChange)
                .onChange(async (value) => {
                    this.plugin.settings.refreshOnFileChange = value;
                    await this.plugin.saveSettings();
                })
            );

        // Tag mappings section
        containerEl.createEl('h3', { text: 'Tag-Script Mappings' });
        
        const desc = containerEl.createDiv({ cls: 'setting-item-description' });
        desc.innerHTML = `
            <p>Define which tags should be dynamically rendered and which scripts should render them.</p>
            <p><strong>Script format:</strong> Each script should define a <code>render(context)</code> function that receives:</p>
            <ul>
                <li><code>context.app</code> - The Obsidian App instance</li>
                <li><code>context.tag</code> - The tag name</li>
                <li><code>context.element</code> - The container element</li>
                <li><code>context.sourcePath</code> - Path of the note</li>
                <li><code>context.frontmatter</code> - Note frontmatter</li>
            </ul>
        `;

        // Add new mapping button
        new Setting(containerEl)
            .setName('Add new mapping')
            .setDesc('Add a new tag-script mapping')
            .addButton(button => button
                .setButtonText('Add mapping')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.tagMappings.push({
                        tag: '',
                        scriptPath: '',
                        enabled: true
                    });
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        // Display existing mappings
        this.plugin.settings.tagMappings.forEach((mapping, index) => {
            const setting = new Setting(containerEl)
                .setClass('dynamic-tag-mapping')
                .addText(text => text
                    .setPlaceholder('Tag name (without #)')
                    .setValue(mapping.tag)
                    .onChange(async (value) => {
                        mapping.tag = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addText(text => text
                    .setPlaceholder('Script path (e.g., scripts/myRenderer.js)')
                    .setValue(mapping.scriptPath)
                    .onChange(async (value) => {
                        mapping.scriptPath = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addToggle(toggle => toggle
                    .setTooltip('Enable/disable this mapping')
                    .setValue(mapping.enabled)
                    .onChange(async (value) => {
                        mapping.enabled = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addButton(button => button
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings.tagMappings.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );

            setting.infoEl.remove(); // Remove the default name/desc area
        });
    }
}
