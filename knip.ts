import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    '**/drizzle.config.ts',
    '**/metro.config.js',
    '**/babel.config.js',
    './package.json',
  ],
  ignoreDependencies: [
    '@tailwindcss/typography',
    'tw-animate-css',
    'supabase',
    '@happy-dom/global-registrator',
  ],
  ignoreExportsUsedInFile: true,
  ignoreWorkspaces: [
    'apps/expo',
    'apps/ios',
    'tooling/next',
    'tooling/commitlint',
    'tooling/typescript',
    'tooling/github',
    'tooling/npm',
  ],
  rules: {
    dependencies: 'warn',
    enumMembers: 'warn',
  },
  workspaces: {
    '.': {
      entry: 'checkly.config.ts',
    },
    'apps/*': {
      entry: ['src/**/*.tsx', 'src/**/*.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'packages/*': {
      entry: ['src/**/*.ts', 'src/**/*.tsx'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'packages/ai': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/auth': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/id': {},
    'packages/integ-test': {
      entry: ['src/**/*.ts', 'test-utils/**/*.ts'],
      project: ['src/**/*.ts', 'test-utils/**/*.ts'],
    },
    'packages/logger': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/test-utils': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/utils': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'tooling/testing': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
  },
};

export default config;
