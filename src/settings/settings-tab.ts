import { App, PluginSettingTab, Setting, TFile, setIcon } from 'obsidian';
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

        // First paragraph
        const p1 = desc.createEl('p');
        p1.textContent = 'Define which tags should be dynamically rendered and which scripts should render them.';

        // Second paragraph with formatting
        const p2 = desc.createEl('p');
        const strong = p2.createEl('strong');
        strong.textContent = 'Script format:';
        p2.appendText(' Each script should define a ');
        const codeRender = p2.createEl('code');
        codeRender.textContent = 'render(context)';
        p2.appendText(' function that receives:');

        // List of context properties
        const ul = desc.createEl('ul');
        const contextItems = [
            { prop: 'context.app', desc: 'The Obsidian App instance' },
            { prop: 'context.tag', desc: 'The tag name (without #)' },
            { prop: 'context.element', desc: 'The container element for your rendered content' },
            { prop: 'context.sourcePath', desc: 'The path of the current note' },
            { prop: 'context.frontmatter', desc: "The note's frontmatter data" },
            { prop: 'context.Notice', desc: 'The Obsidian Notice constructor' }
        ];

        contextItems.forEach(item => {
            const li = ul.createEl('li');
            const code = li.createEl('code');
            code.textContent = item.prop;
            li.appendText(` - ${item.desc}`);
        });

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

        // Get all JavaScript files in the vault for the dropdown
        const jsFiles = this.app.vault.getAllLoadedFiles()
            .filter(file => file instanceof TFile && file.extension === 'js')
            .map(file => file.path)
            .sort();

        // Display existing mappings
        this.plugin.settings.tagMappings.forEach((mapping: TagScriptMapping, index: number) => {
            const mappingRow = containerEl.createDiv({ cls: 'tagverse-mapping-row' });
            const controlsContainer = mappingRow.createDiv({ cls: 'tagverse-mapping-controls' });

            // Tag input - flexible width
            const tagInputContainer = controlsContainer.createDiv({ cls: 'setting-item-control' });
            const tagInput = tagInputContainer.createEl('input', {
                type: 'text',
                placeholder: 'Tag name (without #)',
                value: mapping.tag,
                cls: 'tag-input',
            });
            tagInput.addEventListener('input', async (e) => {
                const settings = this.plugin.settings;
                mapping.tag = (e.target as HTMLInputElement).value;
                await this.plugin.saveSettings(settings);
            });

            // Script dropdown - flexible width
            const scriptDropdownContainer = controlsContainer.createDiv({ cls: 'setting-item-control' });
            const scriptSelect = scriptDropdownContainer.createEl('select', { cls: 'script-dropdown' });
            scriptSelect.createEl('option', { text: 'Select script file...', value: '' });
            jsFiles.forEach(path => {
                scriptSelect.createEl('option', { text: path, value: path });
            });
            scriptSelect.value = mapping.scriptPath;
            scriptSelect.addEventListener('change', async (e) => {
                const settings = this.plugin.settings;
                mapping.scriptPath = (e.target as HTMLSelectElement).value;
                await this.plugin.saveSettings(settings);
            });

            // Enable toggle - using Obsidian's native checkbox styling
            const toggleContainer = controlsContainer.createDiv({ cls: 'setting-item-control tagverse-setting-fixed-width' });
            const checkboxWrapper = toggleContainer.createDiv({
                cls: 'checkbox-container' + (mapping.enabled ? ' is-enabled' : '')
            });

            // Make the entire container clickable like Obsidian does
            checkboxWrapper.addEventListener('click', async (e) => {
                e.preventDefault();
                mapping.enabled = !mapping.enabled;
                checkboxWrapper.className = 'checkbox-container' + (mapping.enabled ? ' is-enabled' : '');
                const settings = this.plugin.settings;
                await this.plugin.saveSettings(settings);
            });

            // Delete button - fixed width, using trash icon style like other settings
            const buttonContainer = controlsContainer.createDiv({ cls: 'setting-item-control tagverse-setting-fixed-width' });
            const deleteButton = buttonContainer.createEl('div', {
                cls: 'clickable-icon extra-setting-button',
                attr: { 'aria-label': 'Delete mapping' },
            });

            // Use Obsidian's setIcon helper to add the trash icon
            setIcon(deleteButton, 'trash-2');

            // Add click event
            deleteButton.addEventListener('click', async () => {
                const settings = this.plugin.settings;
                settings.tagMappings.splice(index, 1);
                await this.plugin.saveSettings(settings);
                this.display();
            });
        });
    }
}
