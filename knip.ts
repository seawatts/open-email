import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    '**/drizzle.config.ts',
    '**/metro.config.js',
    '**/babel.config.js',
    './package.json',
  ],
  ignoreDependencies: [
    'tailwindcss',
    '@tailwindcss/postcss',
    'picocolors',
    '@clack/prompts',
    'react-native-worklets',
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
    'packages/id': {
    },
    'tooling/testing': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
  },
};

export default config;
