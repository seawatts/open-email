/**
 * @seawatts/ai - TanStack AI Email Agent
 *
 * Provides AI-powered email processing with streaming support,
 * tool calling, and approval workflows using TanStack AI.
 *
 * Usage:
 *   import { processEmail, classifyEmail } from '@seawatts/ai/tanstack-ai';
 */

// Adapters
export {
  createOpenAIAdapter,
  getDefaultAdapter,
  getModel,
  models,
  openaiAdapter,
  type ModelType,
} from './adapters';

// Tools
export {
  allEmailTools,
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
  emailSearchTools,
  emailTools,
  extractHighlightsParams,
  extractHighlightsTool,
  getEmailThreadParams,
  getEmailThreadTool,
  highlightDataParams,
  listEmailsByCategoryParams,
  listEmailsByCategoryTool,
  markReadParams,
  markReadTool,
  markUnreadParams,
  markUnreadTool,
  requiresApproval,
  scheduleSendParams,
  scheduleSendTool,
  searchEmailsParams,
  searchEmailsTool,
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
