import {
  getThreadMessages,
  getThreadSenders,
  getThreadWithMessages,
} from '@seawatts/api/services/email-thread';
import type { EmailKeywordType, EmailMessageType } from '@seawatts/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestFactories } from '../test-utils/factories';
import { testDb } from './setup';

describe('Email Thread Service Integration Tests', () => {
  let factories: TestFactories;

  beforeEach(async () => {
    factories = new TestFactories(testDb.db);
  });

  describe('getThreadWithMessages', () => {
    it('should return null for non-existent thread', async () => {
      const result = await getThreadWithMessages('non-existent-thread-id');
      expect(result).toBeNull();
    });

    it('should return thread with messages', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        subject: 'Test Thread',
      });
      const message1 = await factories.createEmailMessage(thread.id, {
        fromEmail: 'sender@example.com',
        subject: 'Test Thread',
      });
      const message2 = await factories.createEmailMessage(thread.id, {
        fromEmail: 'reply@example.com',
        subject: 'Re: Test Thread',
      });

      const result = await getThreadWithMessages(thread.id);

      expect(result).not.toBeNull();
      expect(result?.thread.id).toBe(thread.id);
      expect(result?.thread.subject).toBe('Test Thread');
      expect(result?.messages).toHaveLength(2);
      expect(result?.messages.map((m: EmailMessageType) => m.id)).toContain(
        message1.id,
      );
      expect(result?.messages.map((m: EmailMessageType) => m.id)).toContain(
        message2.id,
      );
    });

    it('should include keywords when requested', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread.id);
      await factories.createEmailKeywords(thread.id, [
        { keyword: 'Amazon', keywordType: 'company' },
        { keyword: 'John', keywordType: 'person' },
      ]);

      const result = await getThreadWithMessages(thread.id, {
        includeKeywords: true,
      });

      expect(result?.keywords).toHaveLength(2);
      expect(
        result?.keywords.map((k: EmailKeywordType) => k.keyword),
      ).toContain('Amazon');
      expect(
        result?.keywords.map((k: EmailKeywordType) => k.keyword),
      ).toContain('John');
    });

    it('should include highlights when requested', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread.id);
      await factories.createEmailHighlight(thread.id, {
        highlightType: 'package_tracking',
        title: 'Package from Amazon',
      });

      const result = await getThreadWithMessages(thread.id, {
        includeHighlights: true,
      });

      expect(result?.highlights).toHaveLength(1);
      expect(result?.highlights[0]?.highlightType).toBe('package_tracking');
    });

    it('should exclude messages when not requested', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread.id);

      const result = await getThreadWithMessages(thread.id, {
        includeMessages: false,
      });

      expect(result?.thread.id).toBe(thread.id);
      expect(result?.messages).toHaveLength(0);
    });
  });

  describe('getThreadSenders', () => {
    it('should return empty map for empty array', async () => {
      const result = await getThreadSenders([]);
      expect(result.size).toBe(0);
    });

    it('should return first message sender for each thread', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create thread 1 with multiple messages
      const thread1 = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread1.id, {
        fromEmail: 'first@example.com',
        fromName: 'First Sender',
        internalDate: new Date('2024-01-01'),
      });
      await factories.createEmailMessage(thread1.id, {
        fromEmail: 'second@example.com',
        fromName: 'Second Sender',
        internalDate: new Date('2024-01-02'),
      });

      // Create thread 2
      const thread2 = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread2.id, {
        fromEmail: 'another@example.com',
        fromName: 'Another Sender',
      });

      const result = await getThreadSenders([thread1.id, thread2.id]);

      expect(result.size).toBe(2);
      expect(result.get(thread1.id)?.fromEmail).toBe('first@example.com');
      expect(result.get(thread2.id)?.fromEmail).toBe('another@example.com');
    });
  });

  describe('getThreadMessages', () => {
    it('should return all messages for a thread', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      await factories.createEmailMessage(thread.id, { isFromUser: false });
      await factories.createEmailMessage(thread.id, { isFromUser: true });
      await factories.createEmailMessage(thread.id, { isFromUser: false });

      const messages = await getThreadMessages(thread.id);

      expect(messages).toHaveLength(3);
    });

    it('should return only user-sent messages when filtered', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      await factories.createEmailMessage(thread.id, { isFromUser: false });
      await factories.createEmailMessage(thread.id, { isFromUser: true });
      await factories.createEmailMessage(thread.id, { isFromUser: true });
      await factories.createEmailMessage(thread.id, { isFromUser: false });

      const messages = await getThreadMessages(thread.id, true);

      expect(messages).toHaveLength(2);
      expect(messages.every((m: EmailMessageType) => m.isFromUser)).toBe(true);
    });

    it('should return empty array for thread with no messages', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      const messages = await getThreadMessages(thread.id);

      expect(messages).toHaveLength(0);
    });
  });
});
