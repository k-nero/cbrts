import typescriptParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import eslint from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';

const eslintConfig = [
  // Global ignores
  {
    ignores: ['public/**', 'dist/**', '*.config.*'],
  },
  // Base JavaScript recommended rules
  eslint.configs.recommended,
  // Project-specific TypeScript/React rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.es6,
        chrome: true,
        fetch: true,
        FormData: true,
        React: true,
        process: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
      'simple-import-sort': simpleImportSortPlugin,
      '@tanstack/query': {
        rules: pluginQuery.rules,
      },
    },
    rules: {
      ...pluginQuery.configs.recommended.rules,
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],
      semi: ['warn', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],
      'no-tabs': ['warn', { allowIndentationTabs: true }],
      'no-multi-spaces': ['warn', { ignoreEOLComments: false }],
      'space-before-blocks': ['warn'],
      'no-irregular-whitespace': ['warn'],
      'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 }],
      'no-unused-vars': ['off'],
      'max-len': ['warn', { code: 100, tabWidth: 2, ignoreComments: true, ignoreUrls: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': ['off'],
      '@typescript-eslint/no-unused-expressions': ['off'],
      'react/jsx-key': ['warn'],
      'react/jsx-indent': ['off'],
      'react/jsx-indent-props': ['off'],
      'react-hooks/exhaustive-deps': ['warn'],
      'react/display-name': ['off'],
      'react/prop-types': 'off',
      'react/no-children-prop': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/default-param-last': ['off'],
      'import/extensions': ['off'],
      'unused-imports/no-unused-imports': ['warn'],
      'simple-import-sort/exports': ['warn'],
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            ['^react.*', '^next.*', '^(?!src|.?./|.+\\.(s?css|less)$).*'],
            ['^src'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$', '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.(s?css|less)$'],
          ],
        },
      ],
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          paths: ['./'],
        },
      },
    },
  },
];

export default eslintConfig;
