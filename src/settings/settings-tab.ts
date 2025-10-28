import { App, PluginSettingTab, Setting, TFile } from 'obsidian';
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
                <li><code>context.tag</code> - The tag name (without #)</li>
                <li><code>context.element</code> - The container element for your rendered content</li>
                <li><code>context.sourcePath</code> - The path of the current note</li>
                <li><code>context.frontmatter</code> - The note's frontmatter data</li>
                <li><code>context.Notice</code> - The Obsidian Notice constructor</li>
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

            // Create the trash SVG icon using innerHTML since createEl doesn't support SVG
            deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

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
