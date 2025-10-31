import { App, Setting, Modal, Notice } from 'obsidian';
import TagversePlugin from '../core/plugin';
import { CommunityScriptMetadata } from '../types/interfaces';
import { CommunityScriptService } from '../services/community-script.service';

export class CommunityScriptsTab {
    private searchQuery = '';
    private selectedLabels: string[] = [];
    private allLabels: string[] = [];

    constructor(
        private app: App,
        private plugin: TagversePlugin,
        private communityService: CommunityScriptService
    ) {}

    async render(containerEl: HTMLElement): Promise<void> {
        containerEl.empty();

        // Header
        containerEl.createEl('h2', { text: '📚 Community Scripts' });
        containerEl.createDiv({
            text: 'Browse and install scripts created by the community',
            cls: 'setting-item-description'
        });

        // Fetch registry
        const loadingEl = containerEl.createDiv({ text: 'Loading scripts...' });

        try {
            const registry = await this.communityService.fetchRegistry();
            loadingEl.remove();

            // Extract all unique labels
            this.allLabels = [...new Set(registry.scripts.flatMap(s => s.labels))].sort();

            // Search and filter controls
            this.renderControls(containerEl);

            // Script grid
            this.renderScriptGrid(containerEl);

        } catch (error) {
            loadingEl.setText('Failed to load community scripts. Check your internet connection.');
        }
    }

    private renderControls(containerEl: HTMLElement): void {
        const controlsContainer = containerEl.createDiv({ cls: 'community-scripts-controls' });

        // Search box
        new Setting(controlsContainer)
            .setName('Search')
            .addText(text => text
                .setPlaceholder('Search by name, description, author...')
                .setValue(this.searchQuery)
                .onChange(value => {
                    this.searchQuery = value;
                    this.renderScriptGrid(containerEl);
                })
            );

        // Label filters
        const filterContainer = controlsContainer.createDiv({ cls: 'label-filters' });
        filterContainer.createEl('span', { text: 'Filter by label: ', cls: 'filter-label' });

        this.allLabels.forEach(label => {
            const labelBtn = filterContainer.createEl('button', {
                text: label,
                cls: this.selectedLabels.includes(label) ? 'label-filter active' : 'label-filter'
            });

            labelBtn.addEventListener('click', () => {
                if (this.selectedLabels.includes(label)) {
                    this.selectedLabels = this.selectedLabels.filter(l => l !== label);
                } else {
                    this.selectedLabels.push(label);
                }
                this.renderControls(containerEl);
                this.renderScriptGrid(containerEl);
            });
        });

        // Clear filters button
        if (this.searchQuery || this.selectedLabels.length > 0) {
            new Setting(controlsContainer)
                .addButton(btn => btn
                    .setButtonText('Clear filters')
                    .onClick(() => {
                        this.searchQuery = '';
                        this.selectedLabels = [];
                        this.render(containerEl.parentElement!);
                    })
                );
        }
    }

    private renderScriptGrid(containerEl: HTMLElement): void {
        // Remove existing grid
        const existingGrid = containerEl.querySelector('.scripts-grid');
        if (existingGrid) existingGrid.remove();

        // Search scripts
        const scripts = this.communityService.searchScripts(this.searchQuery, this.selectedLabels);

        // Create grid
        const grid = containerEl.createDiv({ cls: 'scripts-grid' });

        if (scripts.length === 0) {
            grid.createDiv({
                text: 'No scripts found matching your filters',
                cls: 'no-scripts-message'
            });
            return;
        }

        // Sort: featured first, then by downloads
        scripts.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.downloads - a.downloads;
        });

        scripts.forEach(script => {
            this.renderScriptCard(grid, script);
        });
    }

    private renderScriptCard(container: HTMLElement, script: CommunityScriptMetadata): void {
        const card = container.createDiv({ cls: 'script-card' });

        // Featured badge
        if (script.featured) {
            card.createDiv({ text: '⭐ Featured', cls: 'featured-badge' });
        }

        // Name and author
        const header = card.createDiv({ cls: 'script-header' });
        header.createEl('h3', { text: script.name });
        header.createEl('div', {
            text: `by ${script.author.name}`,
            cls: 'script-author'
        });

        // Description
        card.createDiv({ text: script.description, cls: 'script-description' });

        // Labels
        const labelsContainer = card.createDiv({ cls: 'script-labels' });
        script.labels.forEach(label => {
            labelsContainer.createEl('span', { text: label, cls: 'script-label' });
        });

        // Stats
        const stats = card.createDiv({ cls: 'script-stats' });
        stats.createEl('span', { text: `${script.downloads} downloads` });
        stats.createEl('span', { text: `v${script.version}` });

        // Actions
        const actions = card.createDiv({ cls: 'script-actions' });

        const installed = this.plugin.settings.installedCommunityScripts.find(
            s => s.scriptId === script.id
        );

        if (installed) {
            // Already installed - show update/uninstall
            actions.createEl('span', { text: '✓ Installed', cls: 'installed-badge' });

            // Check if update available
            if (installed.version !== script.version) {
                const updateBtn = actions.createEl('button', {
                    text: `Update to v${script.version}`,
                    cls: 'mod-cta'
                });
                updateBtn.addEventListener('click', async () => {
                    await this.handleUpdate(script.id);
                });
            }

            const uninstallBtn = actions.createEl('button', {
                text: 'Uninstall',
                cls: 'mod-warning'
            });
            uninstallBtn.addEventListener('click', async () => {
                await this.handleUninstall(script.id);
            });
        } else {
            // Not installed - show install button
            const installBtn = actions.createEl('button', {
                text: 'Install',
                cls: 'mod-cta'
            });
            installBtn.addEventListener('click', () => {
                this.showInstallModal(script);
            });
        }

        // View details button
        const detailsBtn = actions.createEl('button', { text: 'Details' });
        detailsBtn.addEventListener('click', () => {
            window.open(script.urls.readme, '_blank');
        });
    }

    private showInstallModal(script: CommunityScriptMetadata): void {
        const modal = new ScriptInstallModal(
            this.app,
            script,
            async (customTag: string) => {
                await this.handleInstall(script.id, customTag);
            }
        );
        modal.open();
    }

    private async handleInstall(scriptId: string, customTag: string): Promise<void> {
        try {
            await this.communityService.installScript(scriptId, customTag);
            await this.plugin.saveSettings(this.plugin.settings);

            // Re-render to show updated state
            const container = document.querySelector('.community-scripts-container') as HTMLElement;
            if (container) {
                await this.render(container);
            }
        } catch (error) {
            new Notice(`Installation failed: ${error.message}`);
        }
    }

    private async handleUpdate(scriptId: string): Promise<void> {
        try {
            await this.communityService.updateScript(scriptId);
            await this.plugin.saveSettings(this.plugin.settings);

            // Re-render
            const container = document.querySelector('.community-scripts-container') as HTMLElement;
            if (container) {
                await this.render(container);
            }
        } catch (error) {
            new Notice(`Update failed: ${error.message}`);
        }
    }

    private async handleUninstall(scriptId: string): Promise<void> {
        try {
            await this.communityService.uninstallScript(scriptId);
            await this.plugin.saveSettings(this.plugin.settings);

            // Re-render
            const container = document.querySelector('.community-scripts-container') as HTMLElement;
            if (container) {
                await this.render(container);
            }
        } catch (error) {
            new Notice(`Uninstall failed: ${error.message}`);
        }
    }
}

class ScriptInstallModal extends Modal {
    private customTag: string;

    constructor(
        app: App,
        private script: CommunityScriptMetadata,
        private onInstall: (customTag: string) => Promise<void>
    ) {
        super(app);
        this.customTag = script.suggestedTag;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: `Install ${this.script.name}` });
        contentEl.createDiv({ text: this.script.description, cls: 'modal-description' });

        // Tag input
        new Setting(contentEl)
            .setName('Tag name')
            .setDesc('Choose which tag this script will render (without #)')
            .addText(text => text
                .setValue(this.customTag)
                .onChange(value => this.customTag = value)
            );

        // Arguments info
        if (this.script.arguments && this.script.arguments.length > 0) {
            contentEl.createEl('h3', { text: 'Available arguments:' });
            const argsList = contentEl.createEl('ul', { cls: 'arguments-list' });
            this.script.arguments.forEach(arg => {
                const li = argsList.createEl('li');
                li.innerHTML = `<code>${arg.name}</code> (${arg.type}): ${arg.description}`;
                if (arg.default !== undefined) {
                    li.innerHTML += ` <em>Default: ${JSON.stringify(arg.default)}</em>`;
                }
            });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const installBtn = buttonContainer.createEl('button', {
            text: 'Install',
            cls: 'mod-cta'
        });
        installBtn.addEventListener('click', async () => {
            if (!this.customTag.trim()) {
                new Notice('Please enter a tag name');
                return;
            }
            await this.onInstall(this.customTag);
            this.close();
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
