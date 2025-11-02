import { InstantLogger } from './logger';
import { REGEX_PATTERNS } from '../constants';

export interface ParsedTag {
    tag: string;
    args: any;
    fullMatch: string;
}

/**
 * Utility for parsing tags with JavaScript/JSON-style arguments
 * Supports syntax like: #tagname{key: "value", array: [1,2,3]}
 */
export class TagParser {
    private static logger: InstantLogger;

    static setLogger(logger: InstantLogger): void {
        TagParser.logger = logger;
    }
    /**
     * Parses a tag string that may contain arguments in {} braces
     * @param tagString - The full tag string (e.g., "#progress{value: 75}")
     * @returns ParsedTag with tag name and parsed arguments
     */
    static parseTag(tagString: string): ParsedTag {
        // Match pattern: #tagname or #tagname{...}
        const match = tagString.match(/^#([a-zA-Z0-9_-]+)(\{[\s\S]*\})?$/);

        if (!match) {
            TagParser.logger?.debug('TAG_PARSER', 'Invalid tag format', { tagString });
            return {
                tag: tagString.replace(/^#/, ''),
                args: {},
                fullMatch: tagString
            };
        }

        const tag = match[1];
        const argsString = match[2];

        // If no arguments, return empty object
        if (!argsString) {
            return {
                tag,
                args: {},
                fullMatch: tagString
            };
        }

        // Parse arguments
        const args = this.parseArguments(argsString);

        return {
            tag,
            args,
            fullMatch: tagString
        };
    }

    /**
     * Parses the arguments string from within {} braces
     * Supports JavaScript/JSON object syntax with preprocessing for bare keys
     * @param argsString - The arguments string including braces (e.g., "{value: 75}")
     * @returns Parsed JavaScript object or empty object on error
     */
    private static parseArguments(argsString: string): any {
        try {
            // Remove outer braces
            let content = argsString.slice(1, -1).trim();

            if (!content) {
                return {};
            }

            // Preprocess: Convert JavaScript object notation to JSON
            // Handle bare keys (without quotes)
            content = this.preprocessObjectNotation(content);

            // Parse as JSON
            const parsed = JSON.parse(`{${content}}`);

            TagParser.logger?.debug('TAG_PARSER', 'Successfully parsed arguments', {
                original: argsString,
                parsed
            });

            return parsed;
        } catch (error) {
            TagParser.logger?.debug('TAG_PARSER', 'Failed to parse arguments, returning empty object', {
                argsString,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Preprocesses JavaScript object notation to make it JSON-compatible
     * Converts bare keys to quoted keys: {key: value} → {"key": value}
     * @param content - Object content without outer braces
     * @returns JSON-compatible string
     */
    private static preprocessObjectNotation(content: string): string {
        // This regex finds keys that are not already quoted
        // It looks for: word characters followed by colon
        // But not inside strings
        
        let result = '';
        let inString = false;
        let stringChar = '';
        let i = 0;

        while (i < content.length) {
            const char = content[i];
            
            // Track if we're inside a string
            if ((char === '"' || char === "'") && (i === 0 || content[i - 1] !== '\\')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                    result += '"'; // Always use double quotes for JSON
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                    result += '"';
                } else {
                    result += char;
                }
                i++;
                continue;
            }

            // If we're inside a string, just copy the character
            if (inString) {
                result += char;
                i++;
                continue;
            }

            // Outside strings: look for unquoted keys
            // Match word characters followed by optional whitespace and colon
            if (/[a-zA-Z_$]/.test(char)) {
                const keyMatch = content.slice(i).match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/);
                if (keyMatch) {
                    // Found an unquoted key
                    result += `"${keyMatch[1]}"`;
                    i += keyMatch[1].length;
                    // Skip whitespace before colon
                    while (i < content.length && /\s/.test(content[i])) {
                        i++;
                    }
                    continue;
                }
            }

            // Otherwise, copy the character as-is
            result += char;
            i++;
        }

        return result;
    }

    /**
     * Extracts tag with arguments from markdown text using the standard tag argument regex
     * @param text - The text to search in
     * @returns Array of matches with tag info
     */
    static extractTagsFromText(text: string): Array<{ match: string; tag: string; args: any; start: number; end: number }> {
        const results: Array<{ match: string; tag: string; args: any; start: number; end: number }> = [];

        // Match #tagname or #tagname{...} using the centralized regex
        const regex = REGEX_PATTERNS.TAG_ARGUMENT;

        let match;
        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const parsed = this.parseTag(fullMatch);

            results.push({
                match: fullMatch,
                tag: parsed.tag,
                args: parsed.args,
                start: match.index,
                end: match.index + fullMatch.length
            });
        }

        return results;
    }
}
