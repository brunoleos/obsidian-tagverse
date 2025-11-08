import { App } from 'obsidian';
import { Notice } from 'obsidian';
import { LogCategory } from 'src/utils/logger';

export interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

export interface ScriptContext {
    app: App;
    tag: string;
    args: Record<string, unknown>;
    element: HTMLElement;
    sourcePath: string;
    frontmatter: Record<string, unknown>;
    Notice: typeof Notice;
}

// Community script metadata
export interface ScriptArgument {
    name: string;
    type: string;
    description: string;
    default?: unknown;
    required: boolean;
}

export interface CommunityScriptMetadata {
    id: string;
    name: string;
    description: string;
    author: {
        name: string;
        github: string;
        url?: string;
    };
    version: string;
    minTagverseVersion: string;
    labels: string[];  // Multi-label classification system
    suggestedTag: string;
    downloads: number;
    featured: boolean;
    createdAt: string;
    updatedAt: string;
    urls: {
        script: string;
        manifest: string;
        preview?: string;
        readme: string;
    };
    arguments?: ScriptArgument[];
}

// Registry format from GitHub
export interface CommunityScriptsRegistry {
    version: string;
    lastUpdated: string;
    totalScripts: number;
    scripts: CommunityScriptMetadata[];
}

// Installed community script tracking
export interface InstalledCommunityScript {
    scriptId: string;
    version: string;
    installedAt: number;
    customTag: string;
    localPath: string;  // Path in plugin data folder
}

export interface TagverseSettings {
    tagMappings: TagScriptMapping[];
    refreshOnFileChange: boolean;
    logLevel: LogCategory;

    // Community scripts settings
    installedCommunityScripts: InstalledCommunityScript[];
    communityRegistryUrl: string;  // Configurable for testing
    lastRegistryFetch: number;
    checkForUpdatesOnStartup: boolean;
}

export const DEFAULT_SETTINGS: TagverseSettings = {
    tagMappings: [],
    refreshOnFileChange: true,
    logLevel: 'error',
    installedCommunityScripts: [],
    communityRegistryUrl: 'https://raw.githubusercontent.com/brunoleos/tagverse-community-scripts/main/registry.json',
    lastRegistryFetch: 0,
    checkForUpdatesOnStartup: true
};
