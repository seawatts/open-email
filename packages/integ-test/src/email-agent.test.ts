import type {
  AgentEvent,
  EmailThread,
  ExtractedHighlight,
  Policy,
  TriageResult,
  UserPreferences,
} from '@seawatts/ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestFactories } from '../test-utils/factories';
import { testDb } from './setup';

// Mock the OpenAI adapter for tests
vi.mock('@seawatts/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@seawatts/ai')>();
  return {
    ...actual,
    getDefaultAdapter: vi.fn(() => ({
      chat: vi.fn(),
    })),
  };
});

describe('Email Agent Integration Tests', () => {
  let factories: TestFactories;

  beforeEach(async () => {
    factories = new TestFactories(testDb.db);
  });

  describe('Test Data Factories', () => {
    it('should create a Gmail account', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      expect(account).toBeDefined();
      expect(account.id).toMatch(/^acct_/);
      expect(account.userId).toBe(user.id);
      expect(account.accountId).toBeDefined(); // accountId stores the email
    });

    it('should create an email thread', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      expect(thread).toBeDefined();
      expect(thread.id).toMatch(/^thread_/);
      expect(thread.accountId).toBe(account.id);
      expect(thread.subject).toBeDefined();
      expect(thread.bundleType).toBe('personal');
    });

    it('should create an email message', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);
      const message = await factories.createEmailMessage(thread.id);

      expect(message).toBeDefined();
      expect(message.id).toMatch(/^msg_/);
      expect(message.threadId).toBe(thread.id);
      expect(message.fromEmail).toBeDefined();
    });

    it('should create an email highlight', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);
      const highlight = await factories.createEmailHighlight(thread.id);

      expect(highlight).toBeDefined();
      expect(highlight.id).toMatch(/^highlight_/);
      expect(highlight.threadId).toBe(thread.id);
      expect(highlight.highlightType).toBe('package_tracking');
    });

    it('should create an agent decision', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);
      const decision = await factories.createAgentDecision(thread.id);

      expect(decision).toBeDefined();
      expect(decision.id).toMatch(/^decision_/);
      expect(decision.threadId).toBe(thread.id);
      expect(decision.category).toBe('fyi');
      expect(decision.confidence).toBe(0.85);
    });

    it('should create user email settings', async () => {
      const user = await factories.createUser();
      const settings = await factories.createUserEmailSettings(user.id);

      expect(settings).toBeDefined();
      expect(settings.userId).toBe(user.id);
      expect(settings.agentMode).toBe('approval');
    });

    it('should create a complete email setup', async () => {
      const setup = await factories.createEmailSetup({
        messageCount: 3,
        threadCount: 2,
      });

      expect(setup.user).toBeDefined();
      expect(setup.gmailAccount).toBeDefined();
      expect(setup.threads).toHaveLength(2);
      expect(setup.messages).toHaveLength(6); // 2 threads * 3 messages
    });

    it('should create emails for all bundle types', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const threads = await factories.createBundleTypeEmails(
        user.id,
        account.id,
      );

      expect(threads).toHaveLength(8);

      const bundleTypes = threads.map((t) => t.bundleType);
      expect(bundleTypes).toContain('travel');
      expect(bundleTypes).toContain('purchases');
      expect(bundleTypes).toContain('finance');
      expect(bundleTypes).toContain('social');
      expect(bundleTypes).toContain('promos');
      expect(bundleTypes).toContain('updates');
      expect(bundleTypes).toContain('forums');
      expect(bundleTypes).toContain('personal');
    });
  });

  describe('Agent Types', () => {
    it('should have correct EmailThread type structure', () => {
      const thread: EmailThread = {
        id: 'thread_123',
        labels: ['INBOX'],
        messages: [
          {
            bodyPreview: 'Test body',
            date: new Date(),
            from: { email: 'test@example.com', name: 'Test User' },
            id: 'msg_123',
            snippet: 'Test snippet',
            subject: 'Test subject',
          },
        ],
        participantEmails: ['test@example.com'],
        subject: 'Test subject',
      };

      expect(thread.id).toBe('thread_123');
      expect(thread.messages).toHaveLength(1);
      expect(thread.messages[0]?.from.email).toBe('test@example.com');
    });

    it('should have correct Policy type structure', () => {
      const policy: Policy = {
        allowedDomainsForAutoActions: ['company.com'],
        autoArchiveNewsletters: false,
        requireApprovalForCalendar: true,
        requireApprovalForExternalShare: true,
        requireApprovalForSend: true,
      };

      expect(policy.allowedDomainsForAutoActions).toContain('company.com');
      expect(policy.requireApprovalForSend).toBe(true);
    });

    it('should have correct UserPreferences type structure', () => {
      const preferences: UserPreferences = {
        autoActionsAllowed: ['archive', 'label'],
        customInstructions: 'Be professional',
        preferredTone: 'friendly',
        requireApprovalDomains: ['external.com'],
      };

      expect(preferences.preferredTone).toBe('friendly');
      expect(preferences.autoActionsAllowed).toContain('archive');
    });

    it('should have correct TriageResult type structure with bundleType', () => {
      const triage: TriageResult = {
        bundleConfidence: 0.9,
        bundleType: 'purchases',
        category: 'RECEIPT',
        confidence: 0.95,
        intent: 'Order confirmation from Amazon',
        priority: 'P3',
        sensitivity: 'NORMAL',
        suggestedNextSteps: ['Archive after review'],
      };

      expect(triage.bundleType).toBe('purchases');
      expect(triage.bundleConfidence).toBe(0.9);
      expect(triage.category).toBe('RECEIPT');
    });

    it('should have correct ExtractedHighlight type structure', () => {
      const highlight: ExtractedHighlight = {
        actionLabel: 'Track Package',
        actionUrl: 'https://tracking.example.com/123',
        data: {
          carrier: 'UPS',
          estimatedDelivery: '2025-12-20',
          trackingNumber: '1Z999AA10123456784',
          type: 'package_tracking',
        },
        subtitle: 'Arrives Thursday',
        title: 'Package from Amazon',
      };

      expect(highlight.title).toBe('Package from Amazon');
      expect(highlight.data.type).toBe('package_tracking');
      if (highlight.data.type === 'package_tracking') {
        expect(highlight.data.carrier).toBe('UPS');
      }
    });

    it('should support all highlight data types', () => {
      const flightHighlight: ExtractedHighlight = {
        data: {
          airline: 'United',
          arrival: 'JFK',
          arrivalTime: '2025-12-20T14:30:00Z',
          departure: 'SFO',
          departureTime: '2025-12-20T08:00:00Z',
          flightNumber: 'UA123',
          type: 'flight',
        },
        title: 'Flight to NYC',
      };

      const hotelHighlight: ExtractedHighlight = {
        data: {
          checkIn: '2025-12-20',
          checkOut: '2025-12-23',
          confirmationNumber: 'CONF123',
          hotelName: 'Hilton NYC',
          type: 'hotel',
        },
        title: 'Hotel Reservation',
      };

      const paymentHighlight: ExtractedHighlight = {
        data: {
          amount: '150.00',
          currency: 'USD',
          dueDate: '2025-12-25',
          payee: 'Electric Company',
          type: 'payment',
        },
        title: 'Bill Due',
      };

      const eventHighlight: ExtractedHighlight = {
        data: {
          dateTime: '2025-12-20T19:00:00Z',
          eventName: 'Team Dinner',
          location: 'Restaurant XYZ',
          type: 'event',
        },
        title: 'Team Dinner',
      };

      const reservationHighlight: ExtractedHighlight = {
        data: {
          confirmationNumber: 'RES456',
          dateTime: '2025-12-20T19:30:00Z',
          partySize: 4,
          type: 'reservation',
          venue: 'Italian Restaurant',
        },
        title: 'Dinner Reservation',
      };

      const actionItemHighlight: ExtractedHighlight = {
        data: {
          assignedBy: 'boss@company.com',
          deadline: '2025-12-22',
          task: 'Review Q4 report',
          type: 'action_item',
        },
        title: 'Review Q4 report',
      };

      expect(flightHighlight.data.type).toBe('flight');
      expect(hotelHighlight.data.type).toBe('hotel');
      expect(paymentHighlight.data.type).toBe('payment');
      expect(eventHighlight.data.type).toBe('event');
      expect(reservationHighlight.data.type).toBe('reservation');
      expect(actionItemHighlight.data.type).toBe('action_item');
    });
  });

  describe('Agent Event Types', () => {
    it('should support thinking events', () => {
      const event: AgentEvent = {
        content: 'Analyzing email content...',
        type: 'thinking',
      };

      expect(event.type).toBe('thinking');
      if (event.type === 'thinking') {
        expect(event.content).toBe('Analyzing email content...');
      }
    });

    it('should support triage_complete events', () => {
      const event: AgentEvent = {
        triage: {
          bundleConfidence: 0.85,
          bundleType: 'personal',
          category: 'ACTION_REQUIRED',
          confidence: 0.9,
          intent: 'Meeting request',
          priority: 'P1',
          sensitivity: 'NORMAL',
          suggestedNextSteps: ['Reply to confirm'],
        },
        type: 'triage_complete',
      };

      expect(event.type).toBe('triage_complete');
      if (event.type === 'triage_complete') {
        expect(event.triage.category).toBe('ACTION_REQUIRED');
        expect(event.triage.bundleType).toBe('personal');
      }
    });

    it('should support highlights_complete events', () => {
      const event: AgentEvent = {
        highlights: [
          {
            data: {
              carrier: 'FedEx',
              trackingNumber: '123456',
              type: 'package_tracking',
            },
            title: 'Package Delivery',
          },
        ],
        type: 'highlights_complete',
      };

      expect(event.type).toBe('highlights_complete');
      if (event.type === 'highlights_complete') {
        expect(event.highlights).toHaveLength(1);
        expect(event.highlights[0]?.title).toBe('Package Delivery');
      }
    });

    it('should support actions_planned events', () => {
      const event: AgentEvent = {
        actions: [
          {
            params: { labels: ['Important'] },
            requiresApproval: false,
            toolName: 'apply_labels',
          },
        ],
        type: 'actions_planned',
      };

      expect(event.type).toBe('actions_planned');
      if (event.type === 'actions_planned') {
        expect(event.actions).toHaveLength(1);
        expect(event.actions[0]?.toolName).toBe('apply_labels');
      }
    });

    it('should support complete events with highlights', () => {
      const event: AgentEvent = {
        autoExecuted: [
          {
            params: {},
            requiresApproval: false,
            toolName: 'mark_read',
          },
        ],
        highlights: [
          {
            data: {
              airline: 'Delta',
              arrival: 'LAX',
              arrivalTime: '2025-12-20T16:00:00Z',
              departure: 'JFK',
              departureTime: '2025-12-20T10:00:00Z',
              flightNumber: 'DL456',
              type: 'flight',
            },
            title: 'Flight to LA',
          },
        ],
        needsApproval: [
          {
            params: { body: 'Thanks for the update!' },
            requiresApproval: true,
            toolName: 'draft_reply',
          },
        ],
        triage: {
          bundleConfidence: 0.95,
          bundleType: 'travel',
          category: 'FYI',
          confidence: 0.85,
          intent: 'Flight confirmation',
          priority: 'P2',
          sensitivity: 'NORMAL',
          suggestedNextSteps: ['Add to calendar'],
        },
        type: 'complete',
      };

      expect(event.type).toBe('complete');
      if (event.type === 'complete') {
        expect(event.autoExecuted).toHaveLength(1);
        expect(event.needsApproval).toHaveLength(1);
        expect(event.highlights).toHaveLength(1);
        expect(event.triage.bundleType).toBe('travel');
      }
    });

    it('should support error events', () => {
      const event: AgentEvent = {
        error: 'Failed to process email',
        type: 'error',
      };

      expect(event.type).toBe('error');
      if (event.type === 'error') {
        expect(event.error).toBe('Failed to process email');
      }
    });
  });

  describe('Bundle Type Classification', () => {
    it('should correctly identify travel bundle type', async () => {
      const setup = await factories.createEmailSetup({
        bundleType: 'travel',
      });

      expect(setup.threads[0]?.bundleType).toBe('travel');
    });

    it('should correctly identify purchases bundle type', async () => {
      const setup = await factories.createEmailSetup({
        bundleType: 'purchases',
      });

      expect(setup.threads[0]?.bundleType).toBe('purchases');
    });

    it('should correctly identify finance bundle type', async () => {
      const setup = await factories.createEmailSetup({
        bundleType: 'finance',
      });

      expect(setup.threads[0]?.bundleType).toBe('finance');
    });

    it('should default to personal bundle type', async () => {
      const setup = await factories.createEmailSetup();

      expect(setup.threads[0]?.bundleType).toBe('personal');
    });
  });

  describe('Highlight Data Persistence', () => {
    it('should persist flight highlight data', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        bundleType: 'travel',
      });

      const highlight = await factories.createEmailHighlight(thread.id, {
        data: {
          airline: 'American Airlines',
          arrival: 'ORD',
          arrivalTime: '2025-12-20T15:00:00Z',
          departure: 'DFW',
          departureTime: '2025-12-20T12:00:00Z',
          flightNumber: 'AA789',
          type: 'flight',
        },
        highlightType: 'flight',
        title: 'Flight to Chicago',
      });

      expect(highlight.highlightType).toBe('flight');
      expect(highlight.data).toEqual({
        airline: 'American Airlines',
        arrival: 'ORD',
        arrivalTime: '2025-12-20T15:00:00Z',
        departure: 'DFW',
        departureTime: '2025-12-20T12:00:00Z',
        flightNumber: 'AA789',
        type: 'flight',
      });
    });

    it('should persist payment highlight data', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        bundleType: 'finance',
      });

      const highlight = await factories.createEmailHighlight(thread.id, {
        data: {
          amount: '250.00',
          currency: 'USD',
          dueDate: '2025-12-31',
          payee: 'Insurance Co',
          type: 'payment',
        },
        highlightType: 'payment',
        title: 'Insurance Payment Due',
      });

      expect(highlight.highlightType).toBe('payment');
      expect(highlight.data).toEqual({
        amount: '250.00',
        currency: 'USD',
        dueDate: '2025-12-31',
        payee: 'Insurance Co',
        type: 'payment',
      });
    });

    it('should persist action item highlight data', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        bundleType: 'personal',
      });

      const highlight = await factories.createEmailHighlight(thread.id, {
        data: {
          assignedBy: 'manager@company.com',
          deadline: '2025-12-25',
          task: 'Complete year-end review',
          type: 'action_item',
        },
        highlightType: 'action_item',
        title: 'Year-End Review',
      });

      expect(highlight.highlightType).toBe('action_item');
      expect(highlight.data).toEqual({
        assignedBy: 'manager@company.com',
        deadline: '2025-12-25',
        task: 'Complete year-end review',
        type: 'action_item',
      });
    });
  });

  describe('Agent Decision Persistence', () => {
    it('should persist decisions with all categories', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      const categories: Array<
        'urgent' | 'needs_reply' | 'awaiting_other' | 'fyi' | 'spam_like'
      > = ['urgent', 'needs_reply', 'awaiting_other', 'fyi', 'spam_like'];

      for (const category of categories) {
        const decision = await factories.createAgentDecision(thread.id, {
          category,
        });
        expect(decision.category).toBe(category);
      }
    });

    it('should persist decisions with suggested actions', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      const actions: Array<
        'reply' | 'follow_up' | 'archive' | 'label' | 'ignore'
      > = ['reply', 'follow_up', 'archive', 'label', 'ignore'];

      for (const action of actions) {
        const decision = await factories.createAgentDecision(thread.id, {
          suggestedAction: action,
        });
        expect(decision.suggestedAction).toBe(action);
      }
    });
  });
});
