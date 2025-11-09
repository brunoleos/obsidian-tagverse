import { App, PluginSettingTab, Setting, TFile, setIcon } from 'obsidian';
import { Logger } from '../utils/logger';
import TagversePlugin from '../core/plugin';
import { TagScriptMapping } from '../types/interfaces';
import { CommunityScriptsTab } from './community-scripts-tab';
import { ScriptSubmissionModal } from './script-submission-modal';
import { LogCategory } from '../utils/logger';

export class TagverseSettingTab extends PluginSettingTab {
    plugin: TagversePlugin;

    constructor(app: App, plugin: TagversePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setHeading().setName('Tagverse settings');

        // Create tabs with proper ARIA attributes
        const tabsContainer = containerEl.createDiv({
            cls: 'tagverse-tabs',
            attr: {
                role: 'tablist',
                'aria-orientation': 'horizontal'
            }
        });

        const generalTab = tabsContainer.createEl('button', {
            type: 'button',
            cls: 'tagverse-tab',
            attr: {
                role: 'tab',
                'aria-selected': 'true',
                'aria-controls': 'tagverse-content-general',
                'id': 'tagverse-tab-general',
                'data-state': 'active'
            }
        });
        generalTab.createSpan({ text: 'General', cls: 'tagverse-tab-title' });

        const communityTab = tabsContainer.createEl('button', {
            type: 'button',
            cls: 'tagverse-tab',
            attr: {
                role: 'tab',
                'aria-selected': 'false',
                'aria-controls': 'tagverse-content-community',
                'id': 'tagverse-tab-community',
                'data-state': 'inactive'
            }
        });
        communityTab.createSpan({ text: 'Community Scripts', cls: 'tagverse-tab-title' });

        const submitTab = tabsContainer.createEl('button', {
            type: 'button',
            cls: 'tagverse-tab',
            attr: {
                role: 'tab',
                'aria-selected': 'false',
                'aria-controls': 'tagverse-content-submit',
                'id': 'tagverse-tab-submit',
                'data-state': 'inactive'
            }
        });
        submitTab.createSpan({ text: 'Submit Script', cls: 'tagverse-tab-title' });

        // Content containers with proper ARIA attributes
        const generalContent = containerEl.createDiv({
            cls: 'tagverse-tab-content active',
            attr: {
                role: 'tabpanel',
                'aria-labelledby': 'tagverse-tab-general',
                'id': 'tagverse-content-general',
                'data-state': 'active'
            }
        });
        const communityContent = containerEl.createDiv({
            cls: 'tagverse-tab-content community-scripts-container',
            attr: {
                role: 'tabpanel',
                'aria-labelledby': 'tagverse-tab-community',
                'id': 'tagverse-content-community',
                'data-state': 'inactive'
            }
        });
        const submitContent = containerEl.createDiv({
            cls: 'tagverse-tab-content',
            attr: {
                role: 'tabpanel',
                'aria-labelledby': 'tagverse-tab-submit',
                'id': 'tagverse-content-submit',
                'data-state': 'inactive'
            }
        });

        // Tab switching
        generalTab.addEventListener('click', async () => {
            await Logger.withScope('📑 Switch to General', async () => {
                Logger.debug( 'SETTINGS-UI', 'General tab clicked');
                await Logger.withScope('🔄 Tab Switch', async () => {
                    this.switchTab(generalTab, generalContent, [communityTab, submitTab], [communityContent, submitContent]);
                    Logger.debug( 'SETTINGS-UI', 'Tab switched to general');
                });
                // Re-render general settings to reflect any changes from community scripts
                await Logger.withScope('🔄 Re-render Settings', async () => {
                    this.renderGeneralSettings(generalContent);
                    Logger.debug( 'SETTINGS-UI', 'General settings re-rendered');
                });
            });
        });

        communityTab.addEventListener('click', async () => {
            await Logger.withScope('📑 Switch to Community', async () => {
                Logger.debug( 'SETTINGS-UI', 'Community tab clicked');
                await Logger.withScope('🔄 Tab Switch', async () => {
                    this.switchTab(communityTab, communityContent, [generalTab, submitTab], [generalContent, submitContent]);
                    Logger.debug( 'SETTINGS-UI', 'Tab switched to community');
                });

                // Render community scripts
                await Logger.withScope('📚 Render Community Scripts', async () => {
                    const communityTabInstance = new CommunityScriptsTab(
                        this.app,
                        this.plugin,
                        this.plugin.communityService
                    );
                    await communityTabInstance.render(communityContent);
                    Logger.debug( 'SETTINGS-UI', 'Community scripts rendered');
                });
            });
        });

        submitTab.addEventListener('click', async () => {
            await Logger.withScope('📑 Switch to Submit', async () => {
                Logger.debug( 'SETTINGS-UI', 'Submit tab clicked');
                await Logger.withScope('🔄 Tab Switch', async () => {
                    this.switchTab(submitTab, submitContent, [generalTab, communityTab], [generalContent, communityContent]);
                    Logger.debug( 'SETTINGS-UI', 'Tab switched to submit');
                });
                await Logger.withScope('📝 Render Submit Tab', async () => {
                    this.renderSubmitTab(submitContent);
                    Logger.debug( 'SETTINGS-UI', 'Submit tab rendered');
                });
            });
        });

        // Render general settings
        this.renderGeneralSettings(generalContent);
    }

    private switchTab(
        activeTab: HTMLElement,
        activeContent: HTMLElement,
        inactiveTabs: HTMLElement[],
        inactiveContents: HTMLElement[]
    ): void {
        // Update active tab
        activeTab.addClass('active');
        activeTab.setAttribute('aria-selected', 'true');
        activeTab.setAttribute('data-state', 'active');

        // Update active content
        activeContent.addClass('active');
        activeContent.setAttribute('data-state', 'active');

        // Update inactive tabs
        inactiveTabs.forEach(tab => {
            tab.removeClass('active');
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('data-state', 'inactive');
        });

        // Update inactive contents
        inactiveContents.forEach(content => {
            content.removeClass('active');
            content.setAttribute('data-state', 'inactive');
        });
    }

    renderGeneralSettings(containerEl: HTMLElement): void {
        containerEl.empty();

        // General settings
        new Setting(containerEl)
            .setName('Refresh on file change')
            .setDesc('Automatically refresh tagverses when opening a file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.refreshOnFileChange)
                .onChange(async (value) => {
                    await Logger.withScope('🔄 Toggle Refresh Setting', async () => {
                        Logger.debug( 'SETTINGS-UI', 'Refresh on file change toggled', { value });
                        await Logger.withScope('💾 Save Settings', async () => {
                            const settings = this.plugin.settings;
                            settings.refreshOnFileChange = value;
                            void this.plugin.saveSettings(settings);
                            Logger.debug( 'SETTINGS-UI', 'Settings saved');
                        });
                    });
                })
            );

        new Setting(containerEl)
            .setName('Log level')
            .setDesc('Set the verbosity of logging. Default is error.')
            .addDropdown(dropdown => dropdown
                .addOption('debug', 'Debug')
                .addOption('warning', 'Warning')
                .addOption('error', 'Error')
                .setValue(this.plugin.settings.logLevel)
                .onChange(async (value) => {
                    await Logger.withScope('🔄 Change Log Level', async () => {
                        Logger.debug( 'SETTINGS-UI', 'Log level changed', { value });
                        await Logger.withScope('💾 Save Settings', async () => {
                            const settings = this.plugin.settings;
                            settings.logLevel = value as LogCategory;
                            void this.plugin.saveSettings(settings);
                            Logger.debug( 'SETTINGS-UI', 'Settings saved');
                        });
                    });
                })
            );

        // Tag mappings section
        new Setting(containerEl).setHeading().setName('Tag-script mappings');

        const desc = containerEl.createDiv({ cls: 'setting-item-description' });

        // First paragraph
        const p1 = desc.createEl('p');
        p1.textContent = 'Define which tags should be dynamically rendered and which scripts should render them.';

        // Second paragraph with formatting
        const p2 = desc.createEl('p');
        const strong = p2.createEl('strong');
        strong.textContent = 'Script format:';
        p2.appendText(' Each script must export a render function that accepts a context parameter. The context provides:');

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
                    await Logger.withScope('➕ Add Mapping', async () => {
                        Logger.debug( 'SETTINGS-UI', 'Add mapping button clicked');
                        await Logger.withScope('📝 Create Mapping', async () => {
                            const settings = this.plugin.settings;
                            settings.tagMappings.push({
                                tag: '',
                                scriptPath: '',
                                enabled: true
                            });
                            Logger.debug( 'SETTINGS-UI', 'New mapping added to settings');
                        });
                        await Logger.withScope('💾 Save Settings', async () => {
                            await this.plugin.saveSettings(this.plugin.settings);
                            Logger.debug( 'SETTINGS-UI', 'Settings saved');
                        });
                        await Logger.withScope('🔄 Re-render UI', async () => {
                            this.display();
                            Logger.debug( 'SETTINGS-UI', 'Settings UI re-rendered');
                        });
                    });
                })
            );

        // Get all JavaScript files in the vault for the dropdown
        const jsFiles = this.app.vault.getAllLoadedFiles()
            .filter(file => file instanceof TFile && file.extension === 'js')
            .map(file => file.path)
            .sort();

        // Get community scripts
        const communityScripts = this.plugin.settings.installedCommunityScripts || [];

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
                await Logger.withScope('✏️ Edit Tag Name', async () => {
                    const newValue = (e.target as HTMLInputElement).value;
                    Logger.debug( 'SETTINGS-UI', 'Tag name changed', { index, oldValue: mapping.tag, newValue });
                    await Logger.withScope('💾 Save Settings', async () => {
                        const settings = this.plugin.settings;
                        mapping.tag = newValue;
                        void this.plugin.saveSettings(settings);
                        Logger.debug( 'SETTINGS-UI', 'Settings saved');
                    });
                });
            });

            // Script dropdown - flexible width
            const scriptDropdownContainer = controlsContainer.createDiv({ cls: 'setting-item-control' });
            const scriptSelect = scriptDropdownContainer.createEl('select', { cls: 'script-dropdown' });
            scriptSelect.createEl('option', { text: 'Select script file...', value: '' });

            // Add community scripts section
            if (communityScripts.length > 0) {
                const communityGroup = scriptSelect.createEl('optgroup', { attr: { label: 'Community Scripts' } });
                communityScripts.forEach(script => {
                    communityGroup.createEl('option', {
                        text: `📦 ${script.scriptId}`,
                        value: `community:${script.scriptId}`
                    });
                });
            }

            // Add vault scripts section
            if (jsFiles.length > 0) {
                const vaultGroup = scriptSelect.createEl('optgroup', { attr: { label: 'Vault Scripts' } });
                jsFiles.forEach(path => {
                    vaultGroup.createEl('option', { text: path, value: path });
                });
            }

            scriptSelect.value = mapping.scriptPath;
            scriptSelect.addEventListener('change', async (e) => {
                await Logger.withScope('🔧 Change Script Path', async () => {
                    const newValue = (e.target as HTMLSelectElement).value;
                    Logger.debug( 'SETTINGS-UI', 'Script path changed', { index, oldValue: mapping.scriptPath, newValue });
                    await Logger.withScope('💾 Save Settings', async () => {
                        const settings = this.plugin.settings;
                        mapping.scriptPath = newValue;
                        void this.plugin.saveSettings(settings);
                        Logger.debug( 'SETTINGS-UI', 'Settings saved');
                    });
                });
            });

            // Enable toggle - using Obsidian's native checkbox styling
            const toggleContainer = controlsContainer.createDiv({ cls: 'setting-item-control tagverse-setting-fixed-width' });
            const checkboxWrapper = toggleContainer.createDiv({
                cls: 'checkbox-container' + (mapping.enabled ? ' is-enabled' : '')
            });

            // Make the entire container clickable like Obsidian does
            checkboxWrapper.addEventListener('click', async (e) => {
                await Logger.withScope('🔄 Toggle Mapping', async () => {
                    e.preventDefault();
                    const newValue = !mapping.enabled;
                    Logger.debug( 'SETTINGS-UI', 'Mapping enabled toggled', { index, oldValue: mapping.enabled, newValue });
                    await Logger.withScope('💾 Save Settings', async () => {
                        mapping.enabled = newValue;
                        checkboxWrapper.className = 'checkbox-container' + (newValue ? ' is-enabled' : '');
                        const settings = this.plugin.settings;
                        void this.plugin.saveSettings(settings);
                        Logger.debug( 'SETTINGS-UI', 'Settings saved');
                    });
                });
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
                await Logger.withScope('🗑️ Delete Mapping', async () => {
                    Logger.debug( 'SETTINGS-UI', 'Delete mapping button clicked', { index, tag: mapping.tag });
                    await Logger.withScope('🗑️ Remove Mapping', async () => {
                        const settings = this.plugin.settings;
                        settings.tagMappings.splice(index, 1);
                        Logger.debug( 'SETTINGS-UI', 'Mapping removed from settings');
                    });
                    await Logger.withScope('💾 Save Settings', async () => {
                        void this.plugin.saveSettings(this.plugin.settings).then(() => {
                        Logger.debug( 'SETTINGS-UI', 'Settings saved');
                    });
                    await Logger.withScope('🔄 Re-render UI', async () => {
                            this.display();
                        Logger.debug( 'SETTINGS-UI', 'Settings UI re-rendered');
                    });
                });
                });
            });
        });
    }

    private renderSubmitTab(container: HTMLElement): void {
        container.empty();

        new Setting(container).setHeading().setName('Submit your script');
        container.createDiv({
            text: 'Share your creations with the Tagverse community!',
            cls: 'setting-item-description'
        });

        new Setting(container)
            .setName('Submit a script')
            .setDesc('Click to open the submission wizard')
            .addButton(btn => btn
                .setButtonText('Start submission')
                .setCta()
                .onClick(async () => {
                    await Logger.withScope('🚀 Open Submission Modal', async () => {
                        Logger.debug( 'SETTINGS-UI', 'Submit script button clicked');
                        let modal: ScriptSubmissionModal;
                        await Logger.withScope('📝 Create Modal', async () => {
                            modal = new ScriptSubmissionModal(this.app, this.plugin);
                            Logger.debug( 'SETTINGS-UI', 'Submission modal created');
                        });
                        await Logger.withScope('🔄 Open Modal', async () => {
                            modal!.open();
                            Logger.debug( 'SETTINGS-UI', 'Submission modal opened');
                        });
                    });
                })
            );

        // Add guidelines
        const guidelines = container.createDiv({ cls: 'submission-guidelines' });
        guidelines.innerHTML = `
            <h3>Submission Guidelines</h3>
            <ul>
                <li>Scripts must have a clear, useful purpose</li>
                <li>Code should be clean and well-commented</li>
                <li>No malicious code (eval, unsafe network requests, etc.)</li>
                <li>Include a good description and suggested tag</li>
                <li>Test your script thoroughly before submitting</li>
            </ul>
            <p>After submission, your script will be reviewed by maintainers.
            This typically takes 1-3 days. You'll be notified via GitHub.</p>
        `;
    }
}
