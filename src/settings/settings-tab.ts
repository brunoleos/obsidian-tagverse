import { App, PluginSettingTab, Setting } from 'obsidian';
import TagversePlugin from '../core/plugin';
import { TagverseSettings, TagScriptMapping } from '../types/interfaces';

export class TagverseSettingTab extends PluginSettingTab {
    plugin: TagversePlugin;

    constructor(app: App, plugin: TagversePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Tagverse Settings' });

        // General settings
        new Setting(containerEl)
            .setName('Refresh on file change')
            .setDesc('Automatically refresh tagverses when opening a file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.refreshOnFileChange)
                .onChange(async (value) => {
                    const settings = this.plugin.settings;
                    settings.refreshOnFileChange = value;
                    await this.plugin.saveSettings(settings);
                })
            );

        new Setting(containerEl)
            .setName('Log Level')
            .setDesc('Set the verbosity of logging. Default is Error.')
            .addDropdown(dropdown => dropdown
                .addOption('debug', 'Debug')
                .addOption('info', 'Info')
                .addOption('warning', 'Warning')
                .addOption('error', 'Error')
                .setValue(this.plugin.settings.logLevel)
                .onChange(async (value) => {
                    const settings = this.plugin.settings;
                    settings.logLevel = value as 'debug' | 'info' | 'warning' | 'error';
                    await this.plugin.saveSettings(settings);
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
                    const settings = this.plugin.settings;
                    settings.tagMappings.push({
                        tag: '',
                        scriptPath: '',
                        enabled: true
                    });
                    await this.plugin.saveSettings(settings);
                    this.display();
                })
            );

        // Display existing mappings
        this.plugin.settings.tagMappings.forEach((mapping: TagScriptMapping, index: number) => {
            const setting = new Setting(containerEl)
                .setClass('dynamic-tag-mapping')
                .addText(text => text
                    .setPlaceholder('Tag name (without #)')
                    .setValue(mapping.tag)
                    .onChange(async (value) => {
                        const settings = this.plugin.settings;
                        mapping.tag = value;
                        await this.plugin.saveSettings(settings);
                    })
                )
                .addText(text => text
                    .setPlaceholder('Script path (e.g., scripts/myRenderer.js)')
                    .setValue(mapping.scriptPath)
                    .onChange(async (value) => {
                        const settings = this.plugin.settings;
                        mapping.scriptPath = value;
                        await this.plugin.saveSettings(settings);
                    })
                )
                .addToggle(toggle => toggle
                    .setTooltip('Enable/disable this mapping')
                    .setValue(mapping.enabled)
                    .onChange(async (value) => {
                        const settings = this.plugin.settings;
                        mapping.enabled = value;
                        await this.plugin.saveSettings(settings);
                    })
                )
                .addButton(button => button
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(async () => {
                        const settings = this.plugin.settings;
                        settings.tagMappings.splice(index, 1);
                        await this.plugin.saveSettings(settings);
                        this.display();
                    })
                );

            setting.infoEl.remove(); // Remove the default name/desc area
        });
    }
}
