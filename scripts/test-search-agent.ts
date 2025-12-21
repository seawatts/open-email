#!/usr/bin/env bun
/**
 * Search Agent CLI
 *
 * Interactive CLI for testing the email search agent with real-time
 * visualization of tool calling and streaming responses.
 *
 * Usage:
 *   bun scripts/test-search-agent.ts --mock     # Use mock data (no database)
 *   bun scripts/test-search-agent.ts            # Interactive mode selection
 *   infisical run -- bun scripts/test-search-agent.ts  # Real database mode
 */

import * as p from '@clack/prompts';
import type {
  EmailSearchResult,
  EmailThreadContent,
  SearchAgentEvent,
  SearchToolExecutor,
} from '@seawatts/ai/ai-sdk-v6';
import { searchAgent } from '@seawatts/ai/ai-sdk-v6';
import chalk from 'chalk';

// ============================================================================
// Mock Data - Sample emails for demo mode
// ============================================================================

const MOCK_EMAILS: EmailSearchResult[] = [
  {
    bundleType: 'travel',
    fromEmail: 'noreply@united.com',
    fromName: 'United Airlines',
    isRead: true,
    lastMessageAt: new Date('2024-12-18T10:00:00Z'),
    matchingKeywords: [
      { keyword: 'flight', keywordType: 'topic' },
      { keyword: 'new york', keywordType: 'location' },
      { keyword: 'united', keywordType: 'company' },
    ],
    messageCount: 2,
    relevanceScore: 0.95,
    snippet:
      'Thank you for booking with United Airlines. Your flight UA 1234 from SFO to JFK on Dec 22 is confirmed.',
    subject: 'Your flight to New York is confirmed - UA 1234',
    threadId: 'thread_mock_1',
  },
  {
    bundleType: 'travel',
    fromEmail: 'reservations@theplaza.com',
    fromName: 'The Plaza Hotel',
    isRead: true,
    lastMessageAt: new Date('2024-12-17T15:30:00Z'),
    matchingKeywords: [
      { keyword: 'hotel', keywordType: 'topic' },
      { keyword: 'new york', keywordType: 'location' },
      { keyword: 'reservation', keywordType: 'topic' },
    ],
    messageCount: 1,
    relevanceScore: 0.9,
    snippet:
      'Your reservation at The Plaza Hotel, New York from Dec 22-25 has been confirmed. Confirmation #PLZ12345.',
    subject: 'Hotel Reservation Confirmation - The Plaza Hotel',
    threadId: 'thread_mock_2',
  },
  {
    bundleType: 'purchases',
    fromEmail: 'ship-confirm@amazon.com',
    fromName: 'Amazon.com',
    isRead: false,
    lastMessageAt: new Date('2024-12-19T08:00:00Z'),
    matchingKeywords: [
      { keyword: 'amazon', keywordType: 'company' },
      { keyword: 'order', keywordType: 'topic' },
      { keyword: 'macbook', keywordType: 'product' },
    ],
    messageCount: 1,
    relevanceScore: 0.88,
    snippet:
      'Your order #112-3456789-0123456 containing MacBook Pro 14" has shipped via UPS. Tracking: 1Z999AA10123456784.',
    subject: 'Your Amazon.com order has shipped',
    threadId: 'thread_mock_3',
  },
  {
    bundleType: 'finance',
    fromEmail: 'statements@chase.com',
    fromName: 'Chase Bank',
    isRead: true,
    lastMessageAt: new Date('2024-12-15T06:00:00Z'),
    matchingKeywords: [
      { keyword: 'bank', keywordType: 'topic' },
      { keyword: 'statement', keywordType: 'topic' },
      { keyword: 'chase', keywordType: 'company' },
      { keyword: '$12,345.67', keywordType: 'financial' },
    ],
    messageCount: 1,
    relevanceScore: 0.75,
    snippet:
      'Your monthly statement for account ending in 4567 is now available. Total balance: $12,345.67.',
    subject: 'Your Bank Statement for December 2024',
    threadId: 'thread_mock_4',
  },
  {
    bundleType: 'personal',
    fromEmail: 'sarah.johnson@company.com',
    fromName: 'Sarah Johnson',
    isRead: false,
    lastMessageAt: new Date('2024-12-20T14:00:00Z'),
    matchingKeywords: [
      { keyword: 'john', keywordType: 'person' },
      { keyword: 'sarah', keywordType: 'person' },
      { keyword: 'meeting', keywordType: 'topic' },
      { keyword: 'q1', keywordType: 'topic' },
    ],
    messageCount: 5,
    relevanceScore: 0.82,
    snippet:
      'Hi, following up on our discussion about Q1 goals. Can we meet next Tuesday at 2pm? - Sarah',
    subject: 'Meeting with John about Q1 planning',
    threadId: 'thread_mock_5',
  },
];

const MOCK_THREAD_CONTENT: Map<string, EmailThreadContent> = new Map([
  [
    'thread_mock_1',
    {
      keywords: [
        { keyword: 'flight', keywordType: 'topic' },
        { keyword: 'new york', keywordType: 'location' },
        { keyword: 'united', keywordType: 'company' },
        { keyword: 'december 22', keywordType: 'temporal' },
      ],
      messages: [
        {
          body: `Dear Traveler,

Thank you for choosing United Airlines!

Your flight booking has been confirmed:

Flight: UA 1234
Route: San Francisco (SFO) → New York JFK
Date: December 22, 2024
Departure: 8:00 AM PST
Arrival: 4:30 PM EST

Confirmation Code: ABC123

Please arrive at the airport at least 2 hours before departure.

Safe travels!
United Airlines`,
          date: new Date('2024-12-18T10:00:00Z'),
          from: 'noreply@united.com',
          id: 'msg_1_1',
          snippet:
            'Thank you for booking with United Airlines. Your flight UA 1234 from SFO to JFK on Dec 22 is confirmed.',
          to: ['user@example.com'],
        },
      ],
      subject: 'Your flight to New York is confirmed - UA 1234',
      threadId: 'thread_mock_1',
    },
  ],
  [
    'thread_mock_2',
    {
      keywords: [
        { keyword: 'hotel', keywordType: 'topic' },
        { keyword: 'new york', keywordType: 'location' },
        { keyword: 'reservation', keywordType: 'topic' },
        { keyword: '$1,850.00', keywordType: 'financial' },
      ],
      messages: [
        {
          body: `Dear Guest,

We are pleased to confirm your reservation at The Plaza Hotel.

Reservation Details:
- Confirmation Number: PLZ12345
- Check-in: December 22, 2024 at 3:00 PM
- Check-out: December 25, 2024 at 11:00 AM
- Room Type: Deluxe King Suite
- Total: $1,850.00

Address: 768 5th Avenue, New York, NY 10019

We look forward to welcoming you!

Best regards,
The Plaza Hotel Reservations Team`,
          date: new Date('2024-12-17T15:30:00Z'),
          from: 'reservations@theplaza.com',
          id: 'msg_2_1',
          snippet:
            'Your reservation at The Plaza Hotel, New York from Dec 22-25 has been confirmed.',
          to: ['user@example.com'],
        },
      ],
      subject: 'Hotel Reservation Confirmation - The Plaza Hotel',
      threadId: 'thread_mock_2',
    },
  ],
  [
    'thread_mock_3',
    {
      keywords: [
        { keyword: 'amazon', keywordType: 'company' },
        { keyword: 'macbook', keywordType: 'product' },
        { keyword: 'order', keywordType: 'topic' },
        { keyword: '$1,999.00', keywordType: 'financial' },
      ],
      messages: [
        {
          body: `Hello,

Your order has shipped!

Order #112-3456789-0123456

Items in this shipment:
- Apple MacBook Pro 14" M3 Pro - $1,999.00

Shipping Address:
123 Main St, San Francisco, CA 94105

Carrier: UPS
Tracking Number: 1Z999AA10123456784

Expected delivery: December 21, 2024

Track your package: https://amazon.com/track

Thank you for shopping with us!
Amazon.com`,
          date: new Date('2024-12-19T08:00:00Z'),
          from: 'ship-confirm@amazon.com',
          id: 'msg_3_1',
          snippet: 'Your order containing MacBook Pro 14" has shipped via UPS.',
          to: ['user@example.com'],
        },
      ],
      subject: 'Your Amazon.com order has shipped',
      threadId: 'thread_mock_3',
    },
  ],
]);

// ============================================================================
// Mock Executor - Returns sample data for demo mode
// ============================================================================

function createMockExecutor(): SearchToolExecutor {
  return {
    async getEmailThread(params) {
      // Simulate network delay
      await sleep(300);

      return MOCK_THREAD_CONTENT.get(params.threadId) ?? null;
    },

    async listEmailsByCategory(params) {
      // Simulate network delay
      await sleep(400);

      const results = MOCK_EMAILS.filter(
        (email) => email.bundleType === params.category,
      );

      return {
        results,
        totalCount: results.length,
      };
    },
    async searchEmails(params) {
      // Simulate network delay
      await sleep(500);

      const query = params.query.toLowerCase();
      let results = [...MOCK_EMAILS]; // Copy to avoid mutation

      // Filter by query terms - split into individual words and match ANY
      if (query) {
        const queryTerms = query.split(/\s+/).filter((term) => term.length > 2); // Skip short words like "to", "a"

        results = results.filter((email) => {
          const subjectLower = email.subject.toLowerCase();
          const snippetLower = (email.snippet || '').toLowerCase();
          const keywordsLower = email.matchingKeywords.map((k) =>
            k.keyword.toLowerCase(),
          );

          // Match if ANY query term appears in subject, snippet, or keywords
          return queryTerms.some(
            (term) =>
              subjectLower.includes(term) ||
              snippetLower.includes(term) ||
              keywordsLower.some((kw) => kw.includes(term)),
          );
        });
      }

      // Filter by bundle type
      if (params.filters?.bundleTypes) {
        results = results.filter(
          (email) =>
            email.bundleType &&
            params.filters?.bundleTypes?.includes(
              email.bundleType as
                | 'travel'
                | 'purchases'
                | 'finance'
                | 'social'
                | 'promos'
                | 'updates'
                | 'forums'
                | 'personal',
            ),
        );
      }

      return {
        results,
        totalCount: results.length,
      };
    },
  };
}

// ============================================================================
// Real Executor - Connects to actual database
// ============================================================================

async function createRealExecutor(
  gmailAccountId: string,
): Promise<SearchToolExecutor> {
  // Dynamic import to avoid loading database code in mock mode
  const { searchEmails, listEmailsByCategory } = await import(
    '@seawatts/api/services/email-search'
  );
  const { getThreadWithMessages } = await import(
    '@seawatts/api/services/email-thread'
  );
  const { parseDateRange } = await import('@seawatts/api/utils');

  return {
    async getEmailThread(params) {
      const result = await getThreadWithMessages(params.threadId, {
        includeKeywords: true,
        includeMessages: true,
      });

      if (!result) {
        return null;
      }

      return {
        keywords: result.keywords.map((k) => ({
          keyword: k.keyword,
          keywordType: k.keywordType,
        })),
        messages: result.messages.map((m) => ({
          body: m.bodyPreview || '',
          date: m.internalDate,
          from: m.fromEmail,
          id: m.id,
          snippet: m.snippet || '',
          to: m.toEmails,
        })),
        subject: result.thread.subject,
        threadId: result.thread.id,
      };
    },

    async listEmailsByCategory(params) {
      const { parseDateRange: parse } = await import('@seawatts/api/utils');

      const result = await listEmailsByCategory({
        category: params.category,
        dateRange: parse(params.dateRange),
        gmailAccountId,
        limit: params.limit,
      });

      return {
        results: result.results,
        totalCount: result.totalCount,
      };
    },
    async searchEmails(params) {
      const result = await searchEmails({
        filters: {
          bundleTypes: params.filters?.bundleTypes as
            | Array<
                | 'travel'
                | 'purchases'
                | 'finance'
                | 'social'
                | 'promos'
                | 'updates'
                | 'forums'
                | 'personal'
              >
            | undefined,
          dateRange: parseDateRange(params.filters?.dateRange),
          gmailAccountId,
          hasAttachments: params.filters?.hasAttachments,
          senders: params.filters?.senders,
          unreadOnly: params.filters?.unreadOnly,
        },
        limit: params.limit,
        query: params.query,
      });

      return {
        results: result.results,
        totalCount: result.totalCount,
      };
    },
  };
}

// ============================================================================
// Event Renderer - Formats agent events for CLI display
// ============================================================================

interface SpinnerHandle {
  start: (message?: string) => void;
  stop: (message?: string, code?: number) => void;
  message: (message: string) => void;
}

async function renderAgentEvents(
  events: AsyncGenerator<SearchAgentEvent>,
  spinner: SpinnerHandle,
): Promise<{
  answer: string;
  sources: EmailSearchResult[];
  totalToolCalls: number;
  iterations: number;
}> {
  let answer = '';
  let sources: EmailSearchResult[] = [];
  let totalToolCalls = 0;
  let iterations = 0;
  let answerStarted = false;

  // Buffer thinking content to display as summary instead of token-by-token
  let thinkingBuffer = '';

  for await (const event of events) {
    switch (event.type) {
      case 'planning':
        // Show any buffered thinking before new planning phase
        if (thinkingBuffer.trim()) {
          const summary = thinkingBuffer.trim().slice(0, 200);
          p.log.info(
            chalk.dim(
              `💭 ${summary}${thinkingBuffer.length > 200 ? '...' : ''}`,
            ),
          );
          thinkingBuffer = '';
        }
        spinner.message(chalk.blue(`🔍 ${event.plan}`));
        break;

      case 'thinking':
        // Buffer thinking tokens - don't log each one individually
        thinkingBuffer += event.content;
        break;

      case 'tool_calls_start':
        spinner.stop(chalk.green('✓ Planning complete'));

        // Show buffered thinking as a summary
        if (thinkingBuffer.trim()) {
          const summary = thinkingBuffer.trim().slice(0, 300);
          p.log.info(
            chalk.dim(
              `💭 ${summary}${thinkingBuffer.length > 300 ? '...' : ''}`,
            ),
          );
          thinkingBuffer = '';
        }

        p.log.step(
          chalk.cyan(`\n📞 Making ${event.calls.length} tool call(s):`),
        );
        for (const call of event.calls) {
          const params = JSON.stringify(call.params, null, 2)
            .split('\n')
            .map((line) => `     ${line}`)
            .join('\n');
          p.log.info(chalk.cyan(`   → ${call.toolName}`));
          p.log.info(chalk.gray(params));
        }
        spinner.start(chalk.yellow('Executing tools...'));
        break;

      case 'tool_call_result':
        if (event.result.error) {
          p.log.error(
            chalk.red(`   ✗ ${event.result.toolName}: ${event.result.error}`),
          );
        } else {
          const resultSummary = summarizeToolResult(event.result);
          p.log.success(
            chalk.green(`   ✓ ${event.result.toolName}: ${resultSummary}`),
          );
        }
        break;

      case 'tool_calls_complete':
        totalToolCalls += event.results.length;
        iterations = event.iteration;
        spinner.stop(
          chalk.green(
            `✓ Iteration ${event.iteration} complete (${event.results.length} tools)`,
          ),
        );
        spinner.start(chalk.blue('Analyzing results...'));
        break;

      case 'refining':
        p.log.warn(chalk.yellow(`⚠️  ${event.reason}`));
        break;

      case 'synthesizing':
        spinner.stop(chalk.green('✓ Search complete'));

        // Show any remaining buffered thinking
        if (thinkingBuffer.trim()) {
          const summary = thinkingBuffer.trim().slice(0, 300);
          p.log.info(
            chalk.dim(
              `💭 ${summary}${thinkingBuffer.length > 300 ? '...' : ''}`,
            ),
          );
          thinkingBuffer = '';
        }

        p.log.step(chalk.magenta(`\n📝 ${event.context}`));
        spinner.start(chalk.magenta('Generating answer...'));
        break;

      case 'answer_chunk':
        if (!answerStarted) {
          spinner.stop(chalk.green('✓ Answer ready'));
          console.log(chalk.bold('\n📬 Answer:\n'));
          answerStarted = true;
        }
        process.stdout.write(chalk.white(event.delta));
        answer += event.delta;
        break;

      case 'complete':
        answer = event.answer;
        sources = event.sources;
        totalToolCalls = event.totalToolCalls;
        iterations = event.iterations;
        break;

      case 'error':
        spinner.stop(chalk.red('✗ Error'));
        p.log.error(chalk.red(`\n❌ Error: ${event.error}`));
        break;
    }
  }

  // Ensure we end with a newline after streaming
  if (answerStarted) {
    console.log('\n');
  }

  return { answer, iterations, sources, totalToolCalls };
}

function summarizeToolResult(result: {
  toolName: string;
  result: unknown;
}): string {
  if (
    result.toolName === 'search_emails' ||
    result.toolName === 'list_emails_by_category'
  ) {
    const data = result.result as {
      results: unknown[];
      totalCount: number;
    } | null;
    if (data) {
      return `Found ${data.totalCount} email(s)`;
    }
    return 'No results';
  }

  if (result.toolName === 'get_email_thread') {
    const data = result.result as EmailThreadContent | null;
    if (data) {
      return `Retrieved "${data.subject.slice(0, 40)}${data.subject.length > 40 ? '...' : ''}"`;
    }
    return 'Thread not found';
  }

  return 'Completed';
}

// ============================================================================
// Follow-up Question Generator
// ============================================================================

interface ConversationContext {
  lastQuery: string;
  lastAnswer: string;
  sources: EmailSearchResult[];
  previousQueries: string[];
}

function generateFollowUpQuestions(context: ConversationContext): string[] {
  const { sources, lastQuery, lastAnswer } = context;
  const followUps: string[] = [];

  // Analyze found emails to suggest relevant follow-ups
  const bundleTypes = new Set(sources.map((s) => s.bundleType).filter(Boolean));
  const senders = new Set(sources.map((s) => s.fromName || s.fromEmail));
  const keywords = sources.flatMap((s) => s.matchingKeywords);

  // Travel-related follow-ups
  if (bundleTypes.has('travel')) {
    const hasFlightInfo = lastAnswer.toLowerCase().includes('flight');
    const hasHotelInfo = lastAnswer.toLowerCase().includes('hotel');

    if (hasFlightInfo && !hasHotelInfo) {
      followUps.push('Do I have a hotel booked for this trip?');
    }
    if (hasHotelInfo && !hasFlightInfo) {
      followUps.push("What's my flight information for this trip?");
    }
    if (hasFlightInfo || hasHotelInfo) {
      followUps.push('Show me all my upcoming travel plans');
    }
  }

  // Purchase-related follow-ups
  if (bundleTypes.has('purchases')) {
    followUps.push('What other orders are arriving soon?');
    const hasTracking = lastAnswer.toLowerCase().includes('tracking');
    if (hasTracking) {
      followUps.push('Show me all my recent purchases');
    }
  }

  // Finance-related follow-ups
  if (bundleTypes.has('finance')) {
    followUps.push('Show me all my financial statements');
    followUps.push('Do I have any upcoming bills?');
  }

  // Meeting/calendar follow-ups
  if (
    keywords.some(
      (k) =>
        k.keyword.toLowerCase().includes('meeting') ||
        k.keyword.toLowerCase().includes('calendar'),
    )
  ) {
    followUps.push('What other meetings do I have this week?');
    followUps.push("Who else was CC'd on this thread?");
  }

  // Person-related follow-ups
  const personKeywords = keywords.filter((k) => k.keywordType === 'person');
  if (personKeywords.length > 0) {
    const person = personKeywords[0]?.keyword;
    if (person) {
      followUps.push(`Show me other emails from ${person}`);
    }
  }

  // Company-related follow-ups
  const companyKeywords = keywords.filter((k) => k.keywordType === 'company');
  if (companyKeywords.length > 0 && senders.size > 0) {
    const sender = Array.from(senders)[0];
    if (sender && !lastQuery.toLowerCase().includes(sender.toLowerCase())) {
      followUps.push(`Show me other emails from ${sender}`);
    }
  }

  // Generic exploration options
  if (followUps.length < 3) {
    const categoryOptions = [
      { prompt: 'Show me my travel emails', type: 'travel' },
      { prompt: 'Show me my recent orders', type: 'purchases' },
      { prompt: 'Show me my financial emails', type: 'finance' },
      { prompt: 'Show me emails from people I know', type: 'personal' },
    ];

    for (const option of categoryOptions) {
      if (!bundleTypes.has(option.type) && followUps.length < 3) {
        followUps.push(option.prompt);
      }
    }
  }

  // Limit to 3 and ensure uniqueness
  const uniqueFollowUps = [...new Set(followUps)].slice(0, 3);

  // Always ensure we have 3 options
  while (uniqueFollowUps.length < 3) {
    const fallbacks = [
      'Show me unread emails',
      "What's important in my inbox?",
      'Search for something else',
    ];
    for (const fallback of fallbacks) {
      if (!uniqueFollowUps.includes(fallback) && uniqueFollowUps.length < 3) {
        uniqueFollowUps.push(fallback);
      }
    }
  }

  return uniqueFollowUps;
}

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getGmailAccounts(): Promise<
  Array<{ id: string; email: string }>
> {
  try {
    const { db } = await import('@seawatts/db/client');
    const { GmailAccounts } = await import('@seawatts/db/schema');

    const accounts = await db
      .select({
        email: GmailAccounts.email,
        id: GmailAccounts.id,
      })
      .from(GmailAccounts);

    return accounts;
  } catch {
    return [];
  }
}

// ============================================================================
// Main CLI Flow
// ============================================================================

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const isMockMode = args.includes('--mock');

  // Intro banner
  console.clear();
  p.intro(chalk.bgCyan.black(' 🔍 Email Search Agent '));

  console.log(
    chalk.dim('\n  Ask me anything about your emails. I can search, '),
  );
  console.log(chalk.dim('  summarize, and find information for you.\n'));

  // Mode selection
  let useMockMode = isMockMode;
  if (!isMockMode) {
    const mode = await p.select({
      message: 'How would you like to start?',
      options: [
        {
          hint: 'Try it out with sample data',
          label: '🎭 Demo Mode',
          value: 'mock',
        },
        {
          hint: 'Search your actual inbox',
          label: '🗄️  My Emails',
          value: 'real',
        },
      ],
    });

    if (p.isCancel(mode)) {
      p.cancel('Goodbye!');
      process.exit(0);
    }

    useMockMode = mode === 'mock';
  }

  // Get executor based on mode
  let executor: SearchToolExecutor;
  let gmailAccountId = 'mock_account';

  if (useMockMode) {
    p.log.info(chalk.dim('Using demo data with sample emails\n'));
    executor = createMockExecutor();
  } else {
    // Get available Gmail accounts
    const accounts = await getGmailAccounts();

    if (accounts.length === 0) {
      p.log.error(
        chalk.red(
          'No Gmail accounts found. Please sync an account first or use --mock mode.',
        ),
      );
      process.exit(1);
    }

    const selectedAccount = await p.select({
      message: 'Which inbox should I search?',
      options: accounts.map((acc) => ({
        label: acc.email,
        value: acc.id,
      })),
    });

    if (p.isCancel(selectedAccount)) {
      p.cancel('Goodbye!');
      process.exit(0);
    }

    gmailAccountId = selectedAccount as string;
    executor = await createRealExecutor(gmailAccountId);
    p.log.info(
      chalk.dim(
        `Connected to ${accounts.find((a) => a.id === gmailAccountId)?.email}\n`,
      ),
    );
  }

  // Conversation context for follow-ups
  const conversationContext: ConversationContext = {
    lastAnswer: '',
    lastQuery: '',
    previousQueries: [],
    sources: [],
  };

  // Main conversation loop
  let continueConversation = true;
  let isFirstQuery = true;

  while (continueConversation) {
    let query: string;

    if (isFirstQuery) {
      // First query - open text input
      const input = await p.text({
        message: 'What would you like to know?',
        placeholder: 'e.g., "When is my flight to New York?"',
        validate: (value) => {
          if (!value.trim()) return 'Please enter a question';
          return undefined;
        },
      });

      if (p.isCancel(input)) {
        p.cancel('Goodbye!');
        process.exit(0);
      }

      query = input as string;
      isFirstQuery = false;
    } else {
      // Follow-up - show numbered options
      const followUps = generateFollowUpQuestions(conversationContext);

      console.log(chalk.dim('\n  What would you like to do next?\n'));

      const nextAction = await p.select({
        message: 'Choose an option or type a new question:',
        options: [
          ...followUps.map((q, i) => ({
            label: `${i + 1}. ${q}`,
            value: `followup_${i}`,
          })),
          { label: '✏️  Ask something else', value: 'new' },
          { label: '👋 Done for now', value: 'exit' },
        ],
      });

      if (p.isCancel(nextAction) || nextAction === 'exit') {
        continueConversation = false;
        continue;
      }

      if (nextAction === 'new') {
        const input = await p.text({
          message: 'What would you like to know?',
          placeholder: 'Type your question...',
          validate: (value) => {
            if (!value.trim()) return 'Please enter a question';
            return undefined;
          },
        });

        if (p.isCancel(input)) {
          continueConversation = false;
          continue;
        }

        query = input as string;
      } else if (
        typeof nextAction === 'string' &&
        nextAction.startsWith('followup_')
      ) {
        const index = Number.parseInt(nextAction.replace('followup_', ''), 10);
        query = followUps[index] || followUps[0] || 'Show me my emails';
        p.log.step(chalk.cyan(`\n→ ${query}\n`));
      } else {
        continue;
      }
    }

    // Run the agent
    const spinner = p.spinner();
    spinner.start(chalk.blue('Thinking...'));

    try {
      const agentStream = searchAgent(query, executor, {
        gmailAccountId,
        maxIterations: 5,
        maxToolCalls: 15,
      });

      const result = await renderAgentEvents(agentStream, spinner);

      // Update conversation context
      conversationContext.previousQueries.push(query);
      conversationContext.lastQuery = query;
      conversationContext.lastAnswer = result.answer;
      conversationContext.sources = result.sources;

      // Show brief stats
      if (result.sources.length > 0) {
        const statsLine = chalk.dim(
          `Found in ${result.sources.length} email${result.sources.length > 1 ? 's' : ''} · ${result.iterations} search${result.iterations > 1 ? 'es' : ''}`,
        );
        console.log(`  ${statsLine}\n`);
      }
    } catch (error) {
      spinner.stop(chalk.red('✗ Error'));
      p.log.error(
        chalk.red(
          `Oops! ${error instanceof Error ? error.message : 'Something went wrong'}`,
        ),
      );
      console.log(chalk.dim('\n  Let me try again...\n'));
    }
  }

  // Farewell
  console.log('');
  p.outro(chalk.dim('Thanks for chatting! 👋'));
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
