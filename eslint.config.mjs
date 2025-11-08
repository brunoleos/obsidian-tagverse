import obsidianmd from "eslint-plugin-obsidianmd";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
	// Apply to TypeScript files
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: "./tsconfig.json",
				ecmaVersion: 2020,
				sourceType: "module",
			},
		},
		plugins: {
			"@typescript-eslint": typescriptEslint,
			obsidianmd: obsidianmd,
		},
		rules: {
			// Obsidian recommended rules
			...obsidianmd.configs.recommended.rules,

			// TypeScript recommended rules
			...typescriptEslint.configs.recommended.rules,

			// Customize specific rules
			"obsidianmd/no-sample-code": "warn",
			"obsidianmd/prefer-file-manager-trash-file": "error",
			"obsidianmd/no-view-references-in-plugin": "error",
			"obsidianmd/ui/sentence-case": "warn",
			"@typescript-eslint/no-unused-vars": ["error", {
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
				"caughtErrorsIgnorePattern": "^_"
			}],
		},
	},
	// Apply to JavaScript files (example scripts)
	// Note: Only include rules that don't require TypeScript type information
	{
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: "module",
		},
		plugins: {
			obsidianmd: obsidianmd,
		},
		rules: {
			// Only include Obsidian rules that don't require type information
			"obsidianmd/no-sample-code": "warn",
			"obsidianmd/ui/sentence-case": "warn",
		},
	},
	// Ignore patterns
	{
		ignores: [
			"node_modules/**",
			"main.js",
			"*.config.mjs",
			"*.config.js",
			"version-bump.mjs",
		],
	},
];
