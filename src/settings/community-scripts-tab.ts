import { App, Notice, Setting } from 'obsidian';
import { withLogScope, emit } from '../utils/logger';
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
                .onChange(async (value) => {
                    await withLogScope('🔍 Search Scripts', async () => {
                        emit('debug', 'COMMUNITY-UI', 'Search query changed', { oldValue: this.searchQuery, newValue: value });
                        this.searchQuery = value;
                        await withLogScope('🔄 Update Results', async () => {
                            this.renderScriptGrid(containerEl);
                            emit('debug', 'COMMUNITY-UI', 'Script grid updated');
                        });
                    });
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

            labelBtn.addEventListener('click', async () => {
                await withLogScope('🏷️ Toggle Label Filter', async () => {
                    const wasSelected = this.selectedLabels.includes(label);
                    emit('debug', 'COMMUNITY-UI', 'Label filter toggled', { label, wasSelected, newState: !wasSelected });

                    if (wasSelected) {
                        this.selectedLabels = this.selectedLabels.filter(l => l !== label);
                    } else {
                        this.selectedLabels.push(label);
                    }

                    await withLogScope('🔄 Update UI', async () => {
                        this.renderControls(containerEl);
                        this.renderScriptGrid(containerEl);
                        emit('debug', 'COMMUNITY-UI', 'UI updated with new filters');
                    });
                });
            });
        });

        // Clear filters button
        if (this.searchQuery || this.selectedLabels.length > 0) {
            new Setting(controlsContainer)
                .addButton(btn => btn
                    .setButtonText('Clear filters')
                    .onClick(async () => {
                        await withLogScope('🧹 Clear Filters', async () => {
                            emit('debug', 'COMMUNITY-UI', 'Clear filters button clicked', {
                                hadSearch: !!this.searchQuery,
                                hadLabels: this.selectedLabels.length
                            });
                            this.searchQuery = '';
                            this.selectedLabels = [];
                            await withLogScope('🔄 Re-render Tab', async () => {
                                this.render(containerEl.parentElement!);
                                emit('debug', 'COMMUNITY-UI', 'Community tab re-rendered');
                            });
                        });
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
                    await withLogScope('⬆️ Update Script', async () => {
                        emit('debug', 'COMMUNITY-UI', 'Update button clicked', { scriptId: script.id, currentVersion: installed.version, targetVersion: script.version });
                        updateBtn.disabled = true;
                        updateBtn.setText('Updating...');
                        try {
                            await this.handleUpdate(script.id, updateBtn);
                            emit('info', 'COMMUNITY-UI', 'Script update completed', { scriptId: script.id });
                        } catch (error) {
                            updateBtn.disabled = false;
                            updateBtn.setText(`Update to v${script.version}`);
                            emit('error', 'COMMUNITY-UI', 'Script update failed', { scriptId: script.id, error: error.message });
                        }
                    });
                });
            }

            const uninstallBtn = actions.createEl('button', {
                text: 'Uninstall',
                cls: 'mod-warning'
            });
            uninstallBtn.addEventListener('click', async () => {
                await withLogScope('🗑️ Uninstall Script', async () => {
                    emit('debug', 'COMMUNITY-UI', 'Uninstall button clicked', { scriptId: script.id, version: installed.version });
                    uninstallBtn.disabled = true;
                    uninstallBtn.setText('Uninstalling...');
                    try {
                        await this.handleUninstall(script.id, uninstallBtn);
                        emit('info', 'COMMUNITY-UI', 'Script uninstall completed', { scriptId: script.id });
                    } catch (error) {
                        uninstallBtn.disabled = false;
                        uninstallBtn.setText('Uninstall');
                        emit('error', 'COMMUNITY-UI', 'Script uninstall failed', { scriptId: script.id, error: error.message });
                    }
                });
            });
        } else {
            // Not installed - show install button
            const installBtn = actions.createEl('button', {
                text: 'Install',
                cls: 'mod-cta'
            });
            installBtn.addEventListener('click', async () => {
                await withLogScope('📦 Install Script', async () => {
                    emit('debug', 'COMMUNITY-UI', 'Install button clicked', { scriptId: script.id, version: script.version });
                    // Disable button and show loading state
                    installBtn.disabled = true;
                    installBtn.setText('Installing...');

                    try {
                        await this.handleInstall(script.id, installBtn);
                        emit('info', 'COMMUNITY-UI', 'Script install completed', { scriptId: script.id });
                    } catch (error) {
                        // Re-enable button on error
                        installBtn.disabled = false;
                        installBtn.setText('Install');
                        emit('error', 'COMMUNITY-UI', 'Script install failed', { scriptId: script.id, error: error.message });
                    }
                });
            });
        }

        // View details button
        const detailsBtn = actions.createEl('button', { text: 'Details' });
        detailsBtn.addEventListener('click', () => {
            withLogScope('📖 View Script Details', () => {
                emit('debug', 'COMMUNITY-UI', 'Details button clicked', { scriptId: script.id, url: script.urls.readme });
                window.open(script.urls.readme, '_blank');
                emit('info', 'COMMUNITY-UI', 'Script details opened in browser', { scriptId: script.id });
            });
        });
    }

    private async handleInstall(scriptId: string, button?: HTMLButtonElement): Promise<void> {
        try {
            if (button) {
                button.setText('Downloading...');
            }

            await this.communityService.installScript(scriptId);
            await this.plugin.saveSettings(this.plugin.settings);

            if (button) {
                button.setText('Installed ✓');
            }

            // Re-render community scripts tab to show updated state after a brief delay
            setTimeout(async () => {
                const container = document.querySelector('.community-scripts-container') as HTMLElement;
                if (container) {
                    await this.render(container);
                }
            }, 500);
        } catch (error) {
            new Notice(`Installation failed: ${error.message}`);
            throw error; // Re-throw so button can be re-enabled
        }
    }

    private async handleUpdate(scriptId: string, button?: HTMLButtonElement): Promise<void> {
        try {
            if (button) {
                button.setText('Downloading...');
            }

            await this.communityService.updateScript(scriptId);
            await this.plugin.saveSettings(this.plugin.settings);

            if (button) {
                button.setText('Updated ✓');
            }

            // Re-render community scripts tab after a brief delay
            setTimeout(async () => {
                const container = document.querySelector('.community-scripts-container') as HTMLElement;
                if (container) {
                    await this.render(container);
                }
            }, 500);
        } catch (error) {
            new Notice(`Update failed: ${error.message}`);
            throw error;
        }
    }

    private async handleUninstall(scriptId: string, button?: HTMLButtonElement): Promise<void> {
        try {
            await this.communityService.uninstallScript(scriptId);
            await this.plugin.saveSettings(this.plugin.settings);

            if (button) {
                button.setText('Uninstalled ✓');
            }

            // Re-render community scripts tab after a brief delay
            setTimeout(async () => {
                const container = document.querySelector('.community-scripts-container') as HTMLElement;
                if (container) {
                    await this.render(container);
                }
            }, 500);
        } catch (error) {
            new Notice(`Uninstall failed: ${error.message}`);
            throw error;
        }
    }
}
