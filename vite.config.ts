import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    ignorePatterns: [
      'dist/**',
      'coverage/**',
      'storybook-static/**',
      'specs/**',
      'packages/**/dist/**',
      'packages/**/src/generated/**',
      'packages/**/src/exports/**',
    ],
    options: { typeAware: true, typeCheck: true },
    plugins: ['typescript', 'react', 'unicorn'],
    overrides: [
      {
        files: [
          'apps/**/src/**/*.{ts,tsx}',
          'packages/**/src/**/*.{ts,tsx}',
        ],
        rules: {
          'func-style': 'error',
          'unicorn/filename-case': [
            'error',
            {
              ignore: ['^AGENTS\\.md$', '^README\\.md$', '^index(\\.test)?\\.(ts|tsx)$'],
            },
          ],
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      'dist/**',
      'coverage/**',
      'storybook-static/**',
      'packages/**/dist/**',
      'packages/**/src/generated/**',
      'packages/**/src/exports/**',
    ],
    singleQuote: true,
  },
});
