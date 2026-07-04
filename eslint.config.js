import eslint from "@eslint/js";
import nPlugin from "eslint-plugin-n";
import regexpPlugin from "eslint-plugin-regexp";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sortKeysFix from "eslint-plugin-sort-keys-fix";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/**", "build/**", "node_modules/**", "build_dependencies/**"]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    regexpPlugin.configs["flat/recommended"],
    {
        plugins: {
            n: nPlugin,
            "simple-import-sort": simpleImportSort,
            "sort-keys-fix": sortKeysFix
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node
            }
        },
        rules: {
            "no-console": "off",
            "no-labels": "error",
            "max-classes-per-file": "error",
            eqeqeq: "error",
            curly: "error",
            "default-case-last": "error",
            "block-scoped-var": "error",
            "no-new": "error",
            "no-multi-str": "error",
            "no-multi-spaces": ["error", { ignoreEOLComments: true }],
            "no-new-wrappers": "error",
            "no-sequences": "error",
            "no-self-compare": "error",
            "no-multi-assign": "error",
            "no-whitespace-before-property": "error",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
            semi: ["error", "always"],
            quotes: ["error", "double"],
            indent: ["error", 4, { SwitchCase: 1 }],
            "brace-style": ["error", "1tbs"],
            "no-trailing-spaces": ["error", { ignoreComments: true }],
            "keyword-spacing": "error",
            "eol-last": ["error", "always"],
            "sort-requires/sort-requires": "off",
            "simple-import-sort/imports": "warn",
            "operator-linebreak": ["error", "after"],
            "no-unneeded-ternary": ["error", { defaultAssignment: false }],
            "arrow-body-style": ["error", "always"],
            "regexp/no-unused-capturing-group": "off",
            "n/no-process-exit": "off",
            "n/no-unsupported-features/es-syntax": "off"
        }
    },
    {
        files: ["**/*.ts"],
        rules: {
            "n/no-missing-import": "off"
        }
    }
);
