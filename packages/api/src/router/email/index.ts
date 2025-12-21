/**
 * Email Router
 *
 * This module aggregates all email-related routers into a single export.
 * Each sub-router handles a specific domain:
 *
 * - actions: Action approval, creation, and pending queries
 * - agent: AI agent processing with TanStack AI
 * - gmail: Gmail OAuth and sync operations
 * - highlights: Inbox-style extracted information
 * - rules: Email rule management
 * - search: Email search queries
 * - searchAgent: AI-powered search assistant with plan-and-execute
 * - settings: User email settings
 * - threads: Thread management and queries
 * - triage: Legacy non-streaming triage
 * - sendReply: Send email replies
 */

import { createTRPCRouter } from '../../trpc';
import { actionsRouter } from './actions';
import { agentRouter } from './agent';
import { gmailRouter } from './gmail';
import { highlightsRouter } from './highlights';
import { rulesRouter } from './rules';
import { searchRouter } from './search';
import { searchAgentRouter } from './search-agent';
import { sendReplyProcedure } from './send-reply';
import { settingsRouter } from './settings';
import { threadsRouter } from './threads';
import { triageProcedure } from './triage';

export const emailRouter = createTRPCRouter({
  actions: actionsRouter,
  agent: agentRouter,
  gmail: gmailRouter,
  highlights: highlightsRouter,
  rules: rulesRouter,
  search: searchRouter,
  searchAgent: searchAgentRouter,
  sendReply: sendReplyProcedure,
  settings: settingsRouter,
  threads: threadsRouter,
  triage: triageProcedure,
});

// Re-export sub-routers for direct access if needed
export {
  actionsRouter,
  agentRouter,
  gmailRouter,
  highlightsRouter,
  rulesRouter,
  searchAgentRouter,
  searchRouter,
  sendReplyProcedure,
  settingsRouter,
  threadsRouter,
  triageProcedure,
};
