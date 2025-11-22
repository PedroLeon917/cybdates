/**
 * Flat ESLint config (eslint.config.cjs) — compatible with ESLint v9+
 */
module.exports = [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'node_modules/',
      '.wrangler/',
      '.cache/',
      'dist/',
      'coverage/',
      '*.log'
    ]
  },

  // Apply rules to JS files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        globalThis: 'readonly',
        process: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  }
];
