import js from '@eslint/js';
import globals from 'globals';

// Configuração do ESLint no formato "flat config"
export default [
  // Pastas geradas que não devem ser analisadas
  { ignores: ['dist/', 'coverage/'] },

  // Regras recomendadas do ESLint
  js.configs.recommended,

  // Código da aplicação: roda no navegador
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  // Testes e arquivos de configuração: rodam no Node.js
  {
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
