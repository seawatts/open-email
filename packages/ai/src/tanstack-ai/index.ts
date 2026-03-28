/**
 * @seawatts/ai - TanStack AI
 *
 * Provides AI-powered email search using TanStack AI.
 *
 * Usage:
 *   import { searchAgent } from '@seawatts/ai/tanstack-ai';
 */

// Adapters
export {
  getAdapter,
  getDefaultAdapter,
  getModel,
  models,
  openaiText,
  type ModelType,
} from './adapters';

// Tools (search + get thread only)
export {
  emailSearchTools,
  getEmailThreadParams,
  getEmailThreadTool,
  searchEmailsParams,
  searchEmailsTool,
  TOOL_NAMES,
  type ToolName,
} from './tools';

// Search Agent
export {
  runSearchAgent,
  searchAgent,
  type CreateSearchExecutor,
  type EmailSearchResult,
  type EmailThreadContent,
  type SearchAgentConfig,
  type SearchAgentEvent,
  type SearchToolExecutor,
  type ToolCallResult,
} from './search-agent';
