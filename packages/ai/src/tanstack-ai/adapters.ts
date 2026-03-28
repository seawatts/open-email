/**
 * TanStack AI Provider Adapters
 *
 * Provides unified configuration for AI providers (OpenAI, Anthropic)
 * with support for streaming, tool calling, and thinking/reasoning.
 */

import { openaiText } from '@tanstack/ai-openai';

/**
 * Model configurations for different tasks
 */
export const models = {
  // Fast model for classification/triage
  classification: 'gpt-4o-mini',

  // Standard model for planning and draft generation
  planning: 'gpt-4o',

  // High-capability model for complex reasoning
  reasoning: 'gpt-4o',
  chat: 'gpt-4o-mini',
  draft: 'gpt-4o',
} as const;

export type ModelType = keyof typeof models;
type ModelName = (typeof models)[ModelType];

/**
 * Get the appropriate model name for a task type
 */
export function getModel(taskType: ModelType) {
  return models[taskType];
}

/**
 * Cache for adapter instances by model
 */
const adapterCache = new Map<ModelName, ReturnType<typeof openaiText>>();

/**
 * Get or create an OpenAI adapter for a specific model.
 * The model parameter is REQUIRED by TanStack AI's openaiText function.
 */
export function getAdapter(taskType: ModelType) {
  const model = models[taskType];
  let adapter = adapterCache.get(model);

  if (!adapter) {
    // TanStack AI OpenAI adapter reads OPENAI_API_KEY from env automatically
    adapter = openaiText(model);
    adapterCache.set(model, adapter);
  }

  return adapter;
}

/**
 * Get or create the default OpenAI adapter (uses 'chat' model)
 * @deprecated Use getAdapter(taskType) instead for explicit model selection
 */
export function getDefaultAdapter() {
  return getAdapter('chat');
}

// Re-export for convenience
export { openaiText };
