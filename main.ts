import {
    App,
    Plugin,
    PluginSettingTab,
    Setting,
    MarkdownView,
    MarkdownPostProcessorContext,
    EditorView,
    Notice
} from 'obsidian';

interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

interface DynamicTagRendererSettings {
    tagMappings: TagScriptMapping[];
    refreshOnFileChange: boolean;
}

const DEFAULT_SETTINGS: DynamicTagRendererSettings = {
    tagMappings: [],
    refreshOnFileChange: true
};

export default class DynamicTagRendererPlugin extends Plugin {
    settings: DynamicTagRendererSettings;
    private scriptCache: Map<string, Function> = new Map();

    async onload() {
        await this.loadSettings();

        // Register markdown post processor to render tags
        this.registerMarkdownPostProcessor(this.processMarkdown.bind(this));

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

            // Find matching mapping for this tag
            const mapping = this.settings.tagMappings.find(
                m => m.enabled && m.tag === tagText
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
            
            // Create a container for the rendered content
            const container = createDiv({ cls: 'dynamic-tag-container' });
            
            // Prepare context for the script
            const scriptContext = {
                app: this.app,
                tag: mapping.tag,
                element: container,
                sourcePath: context.sourcePath,
                frontmatter: context.frontmatter
            };

            // Execute the render function
            const result = await renderFunction(scriptContext);

            // If the function returns an element or string, render it
            if (result) {
                if (typeof result === 'string') {
                    container.innerHTML = result;
                } else if (result instanceof HTMLElement) {
                    container.appendChild(result);
                }
            }

            // Replace the original tag with the rendered content
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

    private async loadScript(scriptPath: string): Promise<Function> {
        // Check cache first
        if (this.scriptCache.has(scriptPath)) {
            return this.scriptCache.get(scriptPath)!;
        }

        // Load the script file
        const file = this.app.vault.getAbstractFileByPath(scriptPath);
        
        if (!file || file.children) {
            throw new Error(`Script file not found: ${scriptPath}`);
        }

        const scriptContent = await this.app.vault.read(file);

        // Create a function from the script content
        // The script should export a render function
        try {
            // Wrap in async function to support await
            const wrappedScript = `
                return (async function(context) {
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

    private refreshActiveView() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            // Force re-render by switching modes
            const currentMode = view.getMode();
            if (currentMode === 'preview' || currentMode === 'reading') {
                view.previewMode.rerender(true);
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