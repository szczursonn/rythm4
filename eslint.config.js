// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n from 'eslint-plugin-n';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: ['node_modules/', 'data/'],
    },
    js.configs.recommended,
    n.configs['flat/recommended-module'],
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            globals: globals.nodeBuiltin,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'n/no-missing-import': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            '@typescript-eslint/no-non-null-assertion': 'off',
            'no-console': 'warn',
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
    {
        files: ['src/entrypoint.ts'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['**/*.js'],
        extends: [tseslint.configs.disableTypeChecked],
    },
    prettier,
);
