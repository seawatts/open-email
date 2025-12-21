import { describe, expect, it } from 'vitest';

import type {
  AgentEvent,
  BundleType,
  EmailMessage,
  EmailThread,
  ExtractedHighlight,
  HighlightDataType,
  PlannedAction,
  Policy,
  TriageResult,
  UserPreferences,
} from '../tanstack-ai/email-agent';

describe('Email Agent Types', () => {
  describe('EmailMessage', () => {
    it('should have correct structure', () => {
      const message: EmailMessage = {
        bodyPreview: 'Test body preview',
        date: new Date(),
        from: { email: 'sender@example.com', name: 'Sender Name' },
        id: 'msg_123',
        snippet: 'Test snippet',
        subject: 'Test Subject',
      };

      expect(message.id).toBe('msg_123');
      expect(message.from.email).toBe('sender@example.com');
      expect(message.from.name).toBe('Sender Name');
      expect(message.subject).toBe('Test Subject');
      expect(message.bodyPreview).toBe('Test body preview');
    });

    it('should allow null name', () => {
      const message: EmailMessage = {
        bodyPreview: null,
        date: new Date(),
        from: { email: 'sender@example.com', name: null },
        id: 'msg_123',
        snippet: null,
        subject: 'Test Subject',
      };

      expect(message.from.name).toBeNull();
      expect(message.bodyPreview).toBeNull();
    });
  });

  describe('EmailThread', () => {
    it('should have correct structure', () => {
      const thread: EmailThread = {
        id: 'thread_123',
        labels: ['INBOX', 'IMPORTANT'],
        messages: [
          {
            bodyPreview: 'Test body',
            date: new Date(),
            from: { email: 'test@example.com', name: 'Test User' },
            id: 'msg_1',
            snippet: 'Snippet',
            subject: 'Subject',
          },
        ],
        participantEmails: ['test@example.com', 'other@example.com'],
        subject: 'Thread Subject',
      };

      expect(thread.id).toBe('thread_123');
      expect(thread.labels).toContain('INBOX');
      expect(thread.messages).toHaveLength(1);
      expect(thread.participantEmails).toHaveLength(2);
    });

    it('should support multiple messages', () => {
      const thread: EmailThread = {
        id: 'thread_456',
        labels: [],
        messages: [
          {
            bodyPreview: 'First message',
            date: new Date('2025-01-01'),
            from: { email: 'a@example.com', name: 'A' },
            id: 'msg_1',
            snippet: 'First',
            subject: 'Subject',
          },
          {
            bodyPreview: 'Second message',
            date: new Date('2025-01-02'),
            from: { email: 'b@example.com', name: 'B' },
            id: 'msg_2',
            snippet: 'Second',
            subject: 'Re: Subject',
          },
        ],
        participantEmails: ['a@example.com', 'b@example.com'],
        subject: 'Subject',
      };

      expect(thread.messages).toHaveLength(2);
      expect(thread.messages[0]?.from.email).toBe('a@example.com');
      expect(thread.messages[1]?.from.email).toBe('b@example.com');
    });
  });

  describe('BundleType', () => {
    it('should support all bundle types', () => {
      const bundleTypes: BundleType[] = [
        'travel',
        'purchases',
        'finance',
        'social',
        'promos',
        'updates',
        'forums',
        'personal',
      ];

      expect(bundleTypes).toHaveLength(8);
      expect(bundleTypes).toContain('travel');
      expect(bundleTypes).toContain('personal');
    });
  });

  describe('TriageResult', () => {
    it('should have correct structure with bundleType', () => {
      const triage: TriageResult = {
        bundleConfidence: 0.95,
        bundleType: 'purchases',
        category: 'RECEIPT',
        confidence: 0.9,
        intent: 'Order confirmation from Amazon',
        priority: 'P3',
        sensitivity: 'NORMAL',
        suggestedNextSteps: ['Archive after review'],
      };

      expect(triage.bundleType).toBe('purchases');
      expect(triage.bundleConfidence).toBe(0.95);
      expect(triage.category).toBe('RECEIPT');
      expect(triage.priority).toBe('P3');
    });

    it('should support all categories', () => {
      const categories: TriageResult['category'][] = [
        'ACTION_REQUIRED',
        'WAITING_ON_OTHER',
        'FYI',
        'NEWSLETTER',
        'RECEIPT',
        'SPAM',
        'PERSONAL',
      ];

      expect(categories).toHaveLength(7);
    });

    it('should support all priorities', () => {
      const priorities: TriageResult['priority'][] = ['P0', 'P1', 'P2', 'P3'];
      expect(priorities).toHaveLength(4);
    });

    it('should support all sensitivity levels', () => {
      const sensitivities: TriageResult['sensitivity'][] = [
        'NORMAL',
        'SENSITIVE',
      ];
      expect(sensitivities).toHaveLength(2);
    });
  });

  describe('HighlightDataType', () => {
    it('should support flight highlight data', () => {
      const flightData: HighlightDataType = {
        airline: 'United Airlines',
        arrival: 'JFK',
        arrivalTime: '2025-12-20T14:30:00Z',
        departure: 'SFO',
        departureTime: '2025-12-20T08:00:00Z',
        flightNumber: 'UA123',
        type: 'flight',
      };

      expect(flightData.type).toBe('flight');
      expect(flightData.flightNumber).toBe('UA123');
      expect(flightData.airline).toBe('United Airlines');
    });

    it('should support hotel highlight data', () => {
      const hotelData: HighlightDataType = {
        checkIn: '2025-12-20',
        checkOut: '2025-12-23',
        confirmationNumber: 'CONF123456',
        hotelName: 'Grand Hotel',
        type: 'hotel',
      };

      expect(hotelData.type).toBe('hotel');
      expect(hotelData.hotelName).toBe('Grand Hotel');
    });

    it('should support package tracking highlight data', () => {
      const packageData: HighlightDataType = {
        carrier: 'UPS',
        estimatedDelivery: '2025-12-22',
        status: 'In Transit',
        trackingNumber: '1Z999AA10123456784',
        type: 'package_tracking',
      };

      expect(packageData.type).toBe('package_tracking');
      expect(packageData.carrier).toBe('UPS');
    });

    it('should support payment highlight data', () => {
      const paymentData: HighlightDataType = {
        amount: '150.00',
        currency: 'USD',
        dueDate: '2025-12-25',
        payee: 'Electric Company',
        type: 'payment',
      };

      expect(paymentData.type).toBe('payment');
      expect(paymentData.amount).toBe('150.00');
    });

    it('should support event highlight data', () => {
      const eventData: HighlightDataType = {
        dateTime: '2025-12-20T19:00:00Z',
        eventName: 'Team Holiday Party',
        location: 'Conference Room A',
        type: 'event',
      };

      expect(eventData.type).toBe('event');
      expect(eventData.eventName).toBe('Team Holiday Party');
    });

    it('should support reservation highlight data', () => {
      const reservationData: HighlightDataType = {
        confirmationNumber: 'RES789',
        dateTime: '2025-12-20T19:30:00Z',
        partySize: 4,
        type: 'reservation',
        venue: 'Italian Restaurant',
      };

      expect(reservationData.type).toBe('reservation');
      expect(reservationData.venue).toBe('Italian Restaurant');
    });

    it('should support action item highlight data', () => {
      const actionItemData: HighlightDataType = {
        assignedBy: 'manager@company.com',
        deadline: '2025-12-25',
        task: 'Complete quarterly report',
        type: 'action_item',
      };

      expect(actionItemData.type).toBe('action_item');
      expect(actionItemData.task).toBe('Complete quarterly report');
    });
  });

  describe('ExtractedHighlight', () => {
    it('should have correct structure', () => {
      const highlight: ExtractedHighlight = {
        actionLabel: 'Track Package',
        actionUrl: 'https://tracking.example.com/123',
        data: {
          carrier: 'FedEx',
          trackingNumber: '123456789',
          type: 'package_tracking',
        },
        subtitle: 'Arrives Thursday',
        title: 'Package from Amazon',
      };

      expect(highlight.title).toBe('Package from Amazon');
      expect(highlight.subtitle).toBe('Arrives Thursday');
      expect(highlight.actionLabel).toBe('Track Package');
      expect(highlight.data.type).toBe('package_tracking');
    });

    it('should support optional fields', () => {
      const highlight: ExtractedHighlight = {
        data: {
          carrier: 'USPS',
          trackingNumber: '987654321',
          type: 'package_tracking',
        },
        title: 'Package Delivery',
      };

      expect(highlight.title).toBe('Package Delivery');
      expect(highlight.actionLabel).toBeUndefined();
      expect(highlight.actionUrl).toBeUndefined();
      expect(highlight.subtitle).toBeUndefined();
    });
  });

  describe('PlannedAction', () => {
    it('should have correct structure', () => {
      const action: PlannedAction = {
        params: { labels: ['Important', 'Work'] },
        requiresApproval: false,
        toolName: 'apply_labels',
      };

      expect(action.toolName).toBe('apply_labels');
      expect(action.requiresApproval).toBe(false);
      expect(action.params).toHaveProperty('labels');
    });

    it('should support actions requiring approval', () => {
      const action: PlannedAction = {
        params: { body: 'Thanks for the update!', subject: 'Re: Update' },
        requiresApproval: true,
        toolName: 'send_draft',
      };

      expect(action.requiresApproval).toBe(true);
      expect(action.toolName).toBe('send_draft');
    });
  });

  describe('Policy', () => {
    it('should have correct structure', () => {
      const policy: Policy = {
        allowedDomainsForAutoActions: ['company.com', 'partner.com'],
        autoArchiveNewsletters: true,
        requireApprovalForCalendar: true,
        requireApprovalForExternalShare: true,
        requireApprovalForSend: true,
      };

      expect(policy.requireApprovalForSend).toBe(true);
      expect(policy.allowedDomainsForAutoActions).toContain('company.com');
    });

    it('should support empty allowed domains', () => {
      const policy: Policy = {
        allowedDomainsForAutoActions: [],
        autoArchiveNewsletters: false,
        requireApprovalForCalendar: false,
        requireApprovalForExternalShare: false,
        requireApprovalForSend: false,
      };

      expect(policy.allowedDomainsForAutoActions).toHaveLength(0);
      expect(policy.requireApprovalForSend).toBe(false);
    });
  });

  describe('UserPreferences', () => {
    it('should have correct structure', () => {
      const prefs: UserPreferences = {
        autoActionsAllowed: ['archive', 'label', 'mark_read'],
        customInstructions: 'Be professional and concise',
        preferredTone: 'formal',
        requireApprovalDomains: ['external.com'],
      };

      expect(prefs.preferredTone).toBe('formal');
      expect(prefs.autoActionsAllowed).toContain('archive');
      expect(prefs.customInstructions).toBe('Be professional and concise');
    });

    it('should support all tone options', () => {
      const tones: UserPreferences['preferredTone'][] = [
        'short',
        'direct',
        'friendly',
        'formal',
        'casual',
      ];

      expect(tones).toHaveLength(5);
    });
  });

  describe('AgentEvent', () => {
    it('should support thinking event', () => {
      const event: AgentEvent = {
        content: 'Analyzing email content...',
        type: 'thinking',
      };

      expect(event.type).toBe('thinking');
      if (event.type === 'thinking') {
        expect(event.content).toBe('Analyzing email content...');
      }
    });

    it('should support triage_complete event', () => {
      const event: AgentEvent = {
        triage: {
          bundleConfidence: 0.9,
          bundleType: 'travel',
          category: 'FYI',
          confidence: 0.85,
          intent: 'Flight confirmation',
          priority: 'P2',
          sensitivity: 'NORMAL',
          suggestedNextSteps: ['Add to calendar'],
        },
        type: 'triage_complete',
      };

      expect(event.type).toBe('triage_complete');
      if (event.type === 'triage_complete') {
        expect(event.triage.bundleType).toBe('travel');
      }
    });

    it('should support highlights_complete event', () => {
      const event: AgentEvent = {
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
        type: 'highlights_complete',
      };

      expect(event.type).toBe('highlights_complete');
      if (event.type === 'highlights_complete') {
        expect(event.highlights).toHaveLength(1);
      }
    });

    it('should support actions_planned event', () => {
      const event: AgentEvent = {
        actions: [
          {
            params: { labels: ['Travel'] },
            requiresApproval: false,
            toolName: 'apply_labels',
          },
        ],
        type: 'actions_planned',
      };

      expect(event.type).toBe('actions_planned');
      if (event.type === 'actions_planned') {
        expect(event.actions).toHaveLength(1);
      }
    });

    it('should support action_executed event', () => {
      const event: AgentEvent = {
        action: {
          params: {},
          requiresApproval: false,
          toolName: 'mark_read',
        },
        type: 'action_executed',
      };

      expect(event.type).toBe('action_executed');
    });

    it('should support action_queued event', () => {
      const event: AgentEvent = {
        action: {
          params: { body: 'Reply content' },
          requiresApproval: true,
          toolName: 'send_draft',
        },
        type: 'action_queued',
      };

      expect(event.type).toBe('action_queued');
    });

    it('should support draft_chunk event', () => {
      const event: AgentEvent = {
        content: 'Thank you for',
        draftId: 'draft_123',
        type: 'draft_chunk',
      };

      expect(event.type).toBe('draft_chunk');
      if (event.type === 'draft_chunk') {
        expect(event.content).toBe('Thank you for');
        expect(event.draftId).toBe('draft_123');
      }
    });

    it('should support draft_complete event', () => {
      const event: AgentEvent = {
        draft: {
          body: 'Thank you for your email. I will review and get back to you.',
          draftId: 'draft_123',
          subject: 'Re: Meeting Request',
          tone: 'formal',
        },
        type: 'draft_complete',
      };

      expect(event.type).toBe('draft_complete');
      if (event.type === 'draft_complete') {
        expect(event.draft.tone).toBe('formal');
      }
    });

    it('should support needs_review event', () => {
      const event: AgentEvent = {
        question: 'This email contains sensitive information. Please review.',
        suggestedActions: [
          {
            params: {},
            requiresApproval: true,
            toolName: 'archive_email',
          },
        ],
        triage: {
          bundleConfidence: 0.6,
          bundleType: 'finance',
          category: 'ACTION_REQUIRED',
          confidence: 0.5,
          intent: 'Financial document',
          priority: 'P1',
          sensitivity: 'SENSITIVE',
          suggestedNextSteps: ['Review carefully'],
        },
        type: 'needs_review',
      };

      expect(event.type).toBe('needs_review');
      if (event.type === 'needs_review') {
        expect(event.triage.sensitivity).toBe('SENSITIVE');
      }
    });

    it('should support complete event with highlights', () => {
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
              carrier: 'UPS',
              trackingNumber: '123456',
              type: 'package_tracking',
            },
            title: 'Package',
          },
        ],
        needsApproval: [],
        triage: {
          bundleConfidence: 0.95,
          bundleType: 'purchases',
          category: 'RECEIPT',
          confidence: 0.9,
          intent: 'Order shipped',
          priority: 'P3',
          sensitivity: 'NORMAL',
          suggestedNextSteps: ['Track delivery'],
        },
        type: 'complete',
      };

      expect(event.type).toBe('complete');
      if (event.type === 'complete') {
        expect(event.highlights).toHaveLength(1);
        expect(event.triage.bundleType).toBe('purchases');
      }
    });

    it('should support error event', () => {
      const event: AgentEvent = {
        error: 'Failed to process email: API timeout',
        type: 'error',
      };

      expect(event.type).toBe('error');
      if (event.type === 'error') {
        expect(event.error).toContain('API timeout');
      }
    });
  });
});
