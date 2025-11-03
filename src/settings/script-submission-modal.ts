import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { Logger } from '../utils/logger';
import TagversePlugin from '../core/plugin';

export class ScriptSubmissionModal extends Modal {
    private scriptPath = '';
    private scriptName = '';
    private description = '';
    private labels: string[] = [];
    private suggestedTag = '';
    private authorName = '';
    private authorGithub = '';

    constructor(
        app: App,
        private plugin: TagversePlugin
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '🚀 Submit Script to Community' });

        contentEl.createDiv({
            text: 'Share your script with the Tagverse community!',
            cls: 'modal-description'
        });

        // Script file selector
        new Setting(contentEl)
            .setName('Script file')
            .setDesc('Select the .js file from your vault')
            .addDropdown(dropdown => {
                const jsFiles = this.app.vault.getFiles()
                    .filter(f => f.extension === 'js')
                    .map(f => f.path);

                dropdown.addOption('', 'Select a script...');
                jsFiles.forEach(path => {
                    dropdown.addOption(path, path);
                });

                dropdown.onChange(value => {
                    Logger.withScope('📄 Select Script File', () => {
                        Logger.debug( 'SUBMISSION-UI', 'Script file selected', { path: value });
                        this.scriptPath = value;
                    });
                });
            });

        // Metadata fields
        new Setting(contentEl)
            .setName('Script name')
            .setDesc('Display name (e.g., "Task Counter")')
            .addText(text => text
                .setPlaceholder('My Awesome Script')
                .onChange(value => {
                    Logger.withScope('✏️ Enter Script Name', () => {
                        Logger.debug( 'SUBMISSION-UI', 'Script name entered', { value });
                        this.scriptName = value;
                    });
                })
            );

        new Setting(contentEl)
            .setName('Description')
            .setDesc('What does this script do?')
            .addTextArea(text => text
                .setPlaceholder('A detailed description of your script...')
                .onChange(value => {
                    Logger.withScope('📝 Enter Description', () => {
                        Logger.debug( 'SUBMISSION-UI', 'Description entered', { length: value.length });
                        this.description = value;
                    });
                })
            );

        new Setting(contentEl)
            .setName('Labels')
            .setDesc('Comma-separated (e.g., "productivity, tasks, analytics")')
            .addText(text => text
                .setPlaceholder('productivity, utilities')
                .onChange(value => {
                    Logger.withScope('🏷️ Enter Labels', () => {
                        const labels = value.split(',').map(l => l.trim()).filter(l => l);
                        Logger.debug( 'SUBMISSION-UI', 'Labels entered', { labels, count: labels.length });
                        this.labels = labels;
                    });
                })
            );

        new Setting(contentEl)
            .setName('Suggested tag')
            .setDesc('Recommended tag name for users')
            .addText(text => text
                .setPlaceholder('tasks')
                .onChange(value => {
                    Logger.withScope('🏷️ Enter Suggested Tag', () => {
                        Logger.debug( 'SUBMISSION-UI', 'Suggested tag entered', { value });
                        this.suggestedTag = value;
                    });
                })
            );

        new Setting(contentEl)
            .setName('Your name')
            .addText(text => text
                .setPlaceholder('Your Name')
                .onChange(value => {
                    Logger.withScope('👤 Enter Author Name', () => {
                        Logger.debug( 'SUBMISSION-UI', 'Author name entered', { value });
                        this.authorName = value;
                    });
                })
            );

        new Setting(contentEl)
            .setName('GitHub username')
            .addText(text => text
                .setPlaceholder('yourusername')
                .onChange(value => {
                    Logger.withScope('🐙 Enter GitHub Username', () => {
                        Logger.debug( 'SUBMISSION-UI', 'GitHub username entered', { value });
                        this.authorGithub = value;
                    });
                })
            );

        // Action buttons
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => {
            Logger.withScope('❌ Cancel Submission', () => {
                Logger.debug( 'SUBMISSION-UI', 'Cancel button clicked');
                this.close();
            });
        });

        const submitBtn = buttonContainer.createEl('button', {
            text: 'Generate Submission',
            cls: 'mod-cta'
        });
        submitBtn.addEventListener('click', async () => {
            await Logger.withScope('🚀 Generate Submission', async () => {
                Logger.debug( 'SUBMISSION-UI', 'Submit button clicked');
                await Logger.withScope('🔄 Process Submission', async () => {
                    await this.generateSubmission();
                    Logger.info( 'SUBMISSION-UI', 'Submission generation completed');
                });
            });
        });
    }

    private async generateSubmission(): Promise<void> {
        let scriptCode: string | undefined;
        let manifest: any;
        let readme: string;

        await Logger.withScope('🔄 Generate Submission Process', async () => {
            // Validate
            await Logger.withScope('✅ Validation', async () => {
                if (!this.scriptPath || !this.scriptName || !this.description ||
                    !this.authorName || !this.authorGithub) {
                    Logger.warn( 'SUBMISSION-UI', 'Validation failed - missing required fields');
                    new Notice('Please fill in all required fields');
                    return;
                }
                Logger.debug( 'SUBMISSION-UI', 'Validation passed');
            });

            try {
                // Read script file
                await Logger.withScope('📖 Read Script File', async () => {
                    const file = this.app.vault.getAbstractFileByPath(this.scriptPath);
                    if (!file || !(file instanceof TFile)) {
                        Logger.error( 'SUBMISSION-UI', 'Script file not found', { path: this.scriptPath });
                        new Notice('Script file not found');
                        return;
                    }

                    scriptCode = await this.app.vault.read(file);
                    Logger.debug( 'SUBMISSION-UI', 'Script file read successfully', { size: scriptCode?.length });
                });

                if (!scriptCode) return; // Early return if file not found

                // Generate script ID from name
                const scriptId = this.scriptName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                Logger.debug( 'SUBMISSION-UI', 'Generated script ID', { scriptId });

                // Generate manifest
                await Logger.withScope('📋 Generate Manifest', async () => {
                    manifest = {
                        id: scriptId,
                        name: this.scriptName,
                        description: this.description,
                        version: "1.0.0",
                        author: {
                            name: this.authorName,
                            github: this.authorGithub
                        },
                        minTagverseVersion: "1.0.0",
                        labels: this.labels,
                        suggestedTag: this.suggestedTag,
                        arguments: []
                    };
                    Logger.debug( 'SUBMISSION-UI', 'Manifest generated', { labels: this.labels.length });
                });

                // Generate README
                await Logger.withScope('📝 Generate README', async () => {
                    readme = this.generateReadme(scriptId, manifest, scriptCode!);
                    Logger.debug( 'SUBMISSION-UI', 'README generated', { length: readme.length });
                });

                // Create submission package
                const submissionData = {
                    scriptId,
                    manifest: JSON.stringify(manifest, null, 2),
                    scriptCode,
                    readme
                };

                // Copy to clipboard
                await Logger.withScope('📋 Copy to Clipboard', async () => {
                    const clipboardContent = this.formatForClipboard(submissionData);
                    await navigator.clipboard.writeText(clipboardContent);
                    Logger.debug( 'SUBMISSION-UI', 'Submission data copied to clipboard');
                });

                // Open GitHub PR page
                await Logger.withScope('🌐 Open GitHub PR', async () => {
                    const repoUrl = 'https://github.com/brunoleos/tagverse-community-scripts';
                    const prUrl = `${repoUrl}/compare/main...main?quick_pull=1&title=Add+${encodeURIComponent(this.scriptName)}&body=${encodeURIComponent(this.generatePRDescription(scriptId))}`;

                    window.open(prUrl, '_blank');
                    Logger.debug( 'SUBMISSION-UI', 'GitHub PR page opened');
                });

                new Notice('Submission prepared! Instructions copied to clipboard.');
                this.close();

                // Show instructions modal
                await Logger.withScope('📋 Show Instructions', async () => {
                    this.showInstructionsModal(scriptId);
                    Logger.debug( 'SUBMISSION-UI', 'Instructions modal shown');
                });

            } catch (error) {
                Logger.error( 'SUBMISSION-UI', 'Submission generation failed', error as Error);
                new Notice(`Failed to prepare submission: ${error.message}`);
            }
        });
    }

    private generateReadme(scriptId: string, manifest: any, scriptCode: string): string {
        return `# ${manifest.name}

${manifest.description}

## Usage

\`\`\`markdown
#${manifest.suggestedTag}
\`\`\`

## Arguments

${manifest.arguments.length > 0 ?
    manifest.arguments.map((arg: any) =>
        `- **${arg.name}** (${arg.type}): ${arg.description}`
    ).join('\n') :
    'No arguments required.'
}

## Example

\`\`\`markdown
#${manifest.suggestedTag}
\`\`\`

## Author

Created by [${manifest.author.name}](https://github.com/${manifest.author.github})

## License

MIT License
`;
    }

    private generatePRDescription(scriptId: string): string {
        return `## New Script Submission: ${this.scriptName}

**Script ID:** ${scriptId}
**Author:** @${this.authorGithub}

### Description
${this.description}

### Labels
${this.labels.join(', ')}

### Checklist
- [ ] Script follows the [contribution guidelines](../CONTRIBUTING.md)
- [ ] Script has been tested in Obsidian
- [ ] manifest.json is valid
- [ ] README.md is included
- [ ] No malicious code (eval, unsafe network requests)

---
*Generated via Tagverse plugin*
`;
    }

    private formatForClipboard(data: any): string {
        return `
📁 FOLDER STRUCTURE TO CREATE:
scripts/${data.scriptId}/
  ├── script.js
  ├── manifest.json
  └── README.md

📄 FILE: script.js
${data.scriptCode}

📄 FILE: manifest.json
${data.manifest}

📄 FILE: README.md
${data.readme}

🔗 NEXT STEPS:
1. Fork the repository: https://github.com/brunoleos/tagverse-community-scripts
2. Create the folder structure above in your fork
3. Create a pull request
4. GitHub PR page should open automatically

All content has been copied to your clipboard!
`;
    }

    private showInstructionsModal(scriptId: string): void {
        const modal = new Modal(this.app);
        const { contentEl } = modal;

        contentEl.createEl('h2', { text: '📋 Submission Instructions' });

        const instructions = contentEl.createDiv({ cls: 'submission-instructions' });
        instructions.innerHTML = `
            <ol>
                <li>Fork the <a href="https://github.com/brunoleos/tagverse-community-scripts">tagverse-community-scripts</a> repository</li>
                <li>Create folder: <code>scripts/${scriptId}/</code></li>
                <li>Add these files (copied to clipboard):
                    <ul>
                        <li><code>script.js</code></li>
                        <li><code>manifest.json</code></li>
                        <li><code>README.md</code></li>
                    </ul>
                </li>
                <li>Commit and push to your fork</li>
                <li>Create a Pull Request (page should open automatically)</li>
            </ol>
            <p><strong>The PR page should have opened in your browser. If not, create it manually.</strong></p>
        `;

        const closeBtn = contentEl.createEl('button', { text: 'Got it!', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => modal.close());

        modal.open();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
