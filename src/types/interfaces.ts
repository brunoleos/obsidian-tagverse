import { App } from 'obsidian';
import { Notice } from 'obsidian';

export interface TagScriptMapping {
    tag: string;
    scriptPath: string;
    enabled: boolean;
}

export interface ScriptContext {
    app: App;
    tag: string;
    args: any;
    element: HTMLElement;
    sourcePath: string;
    frontmatter: any;
    Notice: typeof Notice;
}

export interface TagverseSettings {
    tagMappings: TagScriptMapping[];
    refreshOnFileChange: boolean;
    logLevel: 'debug' | 'info' | 'warning' | 'error';
}

export const DEFAULT_SETTINGS: TagverseSettings = {
    tagMappings: [],
    refreshOnFileChange: true,
    logLevel: 'error'
};
