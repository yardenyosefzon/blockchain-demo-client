module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true, es2021: true, node: true },
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.eslint.json', './tsconfig.app.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss'],
      },
    },
    react: { version: 'detect' },
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'import', 'prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/require-default-props': 'off',
    'import/prefer-default-export': 'off',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
        tsx: 'never',
        js: 'never',
        jsx: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/vite.config.ts',
          '**/*.config.ts',
          '**/*.config.cjs',
          '**/setupTests.ts',
        ],
      },
    ],
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['state', 'draft'],
      },
    ],
  },
  overrides: [
    {
      files: ['vite.config.ts', '*.config.ts', '*.config.cjs'],
      env: { node: true, browser: false },
      parserOptions: {
        project: './tsconfig.node.json',
      },
    },
  ],
};
