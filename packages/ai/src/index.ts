/**
 * @seawatts/ai - Email Agent Package
 *
 * This package provides two AI SDK implementations:
 *
 * 1. TanStack AI (default): import from '@seawatts/ai' or '@seawatts/ai/tanstack-ai'
 * 2. AI SDK v6 beta: import from '@seawatts/ai/ai-sdk-v6'
 *
 * The default export uses TanStack AI for backwards compatibility.
 */

// Re-export everything from TanStack AI as the default
export * from './tanstack-ai';
