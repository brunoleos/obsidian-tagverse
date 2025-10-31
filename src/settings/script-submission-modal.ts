import { App, Modal, Notice, Setting, TFile } from 'obsidian';
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

                dropdown.onChange(value => this.scriptPath = value);
            });

        // Metadata fields
        new Setting(contentEl)
            .setName('Script name')
            .setDesc('Display name (e.g., "Task Counter")')
            .addText(text => text
                .setPlaceholder('My Awesome Script')
                .onChange(value => this.scriptName = value)
            );

        new Setting(contentEl)
            .setName('Description')
            .setDesc('What does this script do?')
            .addTextArea(text => text
                .setPlaceholder('A detailed description of your script...')
                .onChange(value => this.description = value)
            );

        new Setting(contentEl)
            .setName('Labels')
            .setDesc('Comma-separated (e.g., "productivity, tasks, analytics")')
            .addText(text => text
                .setPlaceholder('productivity, utilities')
                .onChange(value => {
                    this.labels = value.split(',').map(l => l.trim()).filter(l => l);
                })
            );

        new Setting(contentEl)
            .setName('Suggested tag')
            .setDesc('Recommended tag name for users')
            .addText(text => text
                .setPlaceholder('tasks')
                .onChange(value => this.suggestedTag = value)
            );

        new Setting(contentEl)
            .setName('Your name')
            .addText(text => text
                .setPlaceholder('Your Name')
                .onChange(value => this.authorName = value)
            );

        new Setting(contentEl)
            .setName('GitHub username')
            .addText(text => text
                .setPlaceholder('yourusername')
                .onChange(value => this.authorGithub = value)
            );

        // Action buttons
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const submitBtn = buttonContainer.createEl('button', {
            text: 'Generate Submission',
            cls: 'mod-cta'
        });
        submitBtn.addEventListener('click', async () => {
            await this.generateSubmission();
        });
    }

    private async generateSubmission(): Promise<void> {
        // Validate
        if (!this.scriptPath || !this.scriptName || !this.description ||
            !this.authorName || !this.authorGithub) {
            new Notice('Please fill in all required fields');
            return;
        }

        try {
            // Read script file
            const file = this.app.vault.getAbstractFileByPath(this.scriptPath);
            if (!file || !(file instanceof TFile)) {
                new Notice('Script file not found');
                return;
            }

            const scriptCode = await this.app.vault.read(file);

            // Generate script ID from name
            const scriptId = this.scriptName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            // Generate manifest
            const manifest = {
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

            // Generate README
            const readme = this.generateReadme(scriptId, manifest, scriptCode);

            // Create submission package
            const submissionData = {
                scriptId,
                manifest: JSON.stringify(manifest, null, 2),
                scriptCode,
                readme
            };

            // Copy to clipboard
            const clipboardContent = this.formatForClipboard(submissionData);
            await navigator.clipboard.writeText(clipboardContent);

            // Open GitHub PR page
            const repoUrl = 'https://github.com/brunoleos/tagverse-community-scripts';
            const prUrl = `${repoUrl}/compare/main...main?quick_pull=1&title=Add+${encodeURIComponent(this.scriptName)}&body=${encodeURIComponent(this.generatePRDescription(scriptId))}`;

            window.open(prUrl, '_blank');

            new Notice('Submission prepared! Instructions copied to clipboard.');
            this.close();

            // Show instructions modal
            this.showInstructionsModal(scriptId);

        } catch (error) {
            new Notice(`Failed to prepare submission: ${error.message}`);
        }
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
