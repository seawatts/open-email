/**
 * @seawatts/ai - AI SDK v6 Email Agent
 *
 * Provides AI-powered email processing using AI SDK v6 beta with
 * ToolLoopAgent, tool approval workflows, and streaming support.
 *
 * Usage:
 *   import { processEmail, emailTriageAgent } from '@seawatts/ai/ai-sdk-v6';
 */

// Adapters
export {
  createOpenAI,
  createOpenAIProvider,
  getDefaultProvider,
  getModel,
  models,
  type ModelType,
} from './adapters';

// Tools
export {
  applyLabelsParams,
  applyLabelsTool,
  approvalRequiredTools,
  archiveParams,
  archiveTool,
  autoExecutableTools,
  canAutoExecute,
  conditionalApprovalTools,
  createCalEventParams,
  createCalEventTool,
  createTaskParams,
  createTaskTool,
  draftReplyParams,
  draftReplyTool,
  emailTools,
  extractHighlightsParams,
  extractHighlightsTool,
  highlightDataParams,
  markReadParams,
  markReadTool,
  markUnreadParams,
  markUnreadTool,
  requiresApproval,
  scheduleSendParams,
  scheduleSendTool,
  sendDraftParams,
  sendDraftTool,
  TOOL_NAMES,
  triageParams,
  triageTool,
  type EmailToolContext,
  type ToolName,
  type ToolResult,
} from './tools';

// Agent
export {
  // Agents
  actionPlanningAgent,
  emailTriageAgent,
  highlightExtractionAgent,
  // Functions
  classifyEmail,
  draftReplyStream,
  executeWithGuardrails,
  extractHighlights,
  needsClarification,
  planActions,
  processEmail,
  processEmailBatch,
  proposeHeuristicActions,
  shouldDraftReply,
  // Types
  type AgentEvent,
  type BundleType,
  type DraftReply,
  type EmailMessage,
  type EmailThread,
  type ExtractedHighlight,
  type HighlightDataType,
  type PlannedAction,
  type Policy,
  type ProcessEmailOptions,
  type TriageResult,
  type UserPreferences,
} from './email-agent';

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
