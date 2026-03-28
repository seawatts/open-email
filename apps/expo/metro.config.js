import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultConfig } from 'expo/metro-config.js';
import { FileStore } from 'metro-cache';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = getDefaultConfig(__dirname);

// Stub out Node-only AI packages so Metro doesn't try to bundle them
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'ai' ||
    moduleName.startsWith('ai/') ||
    moduleName === '@ai-sdk/openai' ||
    moduleName.startsWith('@ai-sdk/openai/')
  ) {
    return {
      filePath: path.resolve(__dirname, 'empty-module.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

export default withTurborepoManagedCache(withMonorepoPaths(config));

/**
 * @see https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
 */
function withMonorepoPaths(config) {
  const projectRoot = __dirname;
  const workspaceRoot = path.resolve(projectRoot, '../..');

  config.watchFolders = [workspaceRoot];

  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ];

  return config;
}

/**
 * @see https://turbo.build/repo/docs/reference/configuration#env
 */
function withTurborepoManagedCache(config) {
  config.cacheStores = [
    new FileStore({ root: path.join(__dirname, 'node_modules/.cache/metro') }),
  ];
  return config;
}
