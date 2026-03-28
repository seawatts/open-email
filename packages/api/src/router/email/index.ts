import { createTRPCRouter } from '../../trpc';
import { contentRouter } from './content';
import { gmailRouter } from './gmail';
import { rulesRouter } from './rules';
import { searchRouter } from './search';
import { searchAgentRouter } from './search-agent';
import { sendReplyProcedure } from './send-reply';
import { settingsRouter } from './settings';
import { threadsRouter } from './threads';

export const emailRouter = createTRPCRouter({
  content: contentRouter,
  gmail: gmailRouter,
  rules: rulesRouter,
  search: searchRouter,
  searchAgent: searchAgentRouter,
  sendReply: sendReplyProcedure,
  settings: settingsRouter,
  threads: threadsRouter,
});

export {
  contentRouter,
  gmailRouter,
  rulesRouter,
  searchAgentRouter,
  searchRouter,
  sendReplyProcedure,
  settingsRouter,
  threadsRouter,
};
