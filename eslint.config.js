import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  {
    // Completely ignore build files and configuration files from checks
    ignores: ['dist/**', 'node_modules/**', 'vite.config.js', 'eslint.config.js'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/named': 'error',
      'import/no-unresolved': 'error',
      'no-unused-vars': 'warn',
    },
    settings: {
      // Use standard node resolution but tell it which file extensions to care about
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json', 'svg'],
        },
      },
    },
  },
];