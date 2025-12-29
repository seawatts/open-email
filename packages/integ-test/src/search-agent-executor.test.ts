import {
  listEmailsByCategory,
  searchEmails,
} from '@seawatts/api/services/email-search';
import { getThreadWithMessages } from '@seawatts/api/services/email-thread';
import { type EmailKeywordType, EmailThreads } from '@seawatts/db/schema';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestFactories } from '../test-utils/factories';
import { testDb } from './setup';

/**
 * These tests verify the search tool executor functions that the search agent uses.
 * They test the database layer that backs the agent's tools.
 */
describe('Search Agent Executor Integration Tests', () => {
  let factories: TestFactories;

  beforeEach(async () => {
    factories = new TestFactories(testDb.db);
  });

  describe('searchEmails (search_emails tool)', () => {
    it('should search emails by query', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create thread with searchable content
      const thread = await factories.createEmailThread(account.id, {
        snippet: 'The project deadline is approaching',
        subject: 'Project deadline reminder',
      });
      await factories.createEmailMessage(thread.id);

      // Set search vector
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Project deadline reminder approaching')`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      const result = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'project deadline',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.subject).toContain('deadline');
    });

    it('should filter by bundle types', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create threads of different types
      const travelThread = await factories.createEmailThread(account.id, {
        bundleType: 'travel',
        subject: 'Flight confirmation',
      });
      await factories.createEmailMessage(travelThread.id);

      const financeThread = await factories.createEmailThread(account.id, {
        bundleType: 'finance',
        subject: 'Bank statement',
      });
      await factories.createEmailMessage(financeThread.id);

      // Set search vectors
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Flight confirmation travel')`,
        })
        .where(sql`${EmailThreads.id} = ${travelThread.id}`);

      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Bank statement finance')`,
        })
        .where(sql`${EmailThreads.id} = ${financeThread.id}`);

      const result = await searchEmails({
        filters: {
          bundleTypes: ['travel'],
          gmailAccountId: account.id,
        },
        query: 'confirmation statement',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.bundleType).toBe('travel');
    });

    it('should filter by date range', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Old thread
      const oldThread = await factories.createEmailThread(account.id, {
        lastMessageAt: new Date('2024-01-01'),
        subject: 'Old email',
      });
      await factories.createEmailMessage(oldThread.id);
      await testDb.db
        .update(EmailThreads)
        .set({ searchVector: sql`to_tsvector('english', 'Old email')` })
        .where(sql`${EmailThreads.id} = ${oldThread.id}`);

      // Recent thread
      const recentThread = await factories.createEmailThread(account.id, {
        lastMessageAt: new Date('2024-12-15'),
        subject: 'Recent email',
      });
      await factories.createEmailMessage(recentThread.id);
      await testDb.db
        .update(EmailThreads)
        .set({ searchVector: sql`to_tsvector('english', 'Recent email')` })
        .where(sql`${EmailThreads.id} = ${recentThread.id}`);

      const result = await searchEmails({
        filters: {
          dateRange: {
            end: new Date('2024-12-31'),
            start: new Date('2024-12-01'),
          },
          gmailAccountId: account.id,
        },
        query: 'email',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.threadId).toBe(recentThread.id);
    });

    it('should return matching keywords', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const thread = await factories.createEmailThread(account.id, {
        subject: 'Order from Amazon',
      });
      await factories.createEmailMessage(thread.id);
      await factories.createEmailKeywords(thread.id, [
        { keyword: 'amazon', keywordType: 'company' },
        { keyword: 'order', keywordType: 'topic' },
        { keyword: '$150', keywordType: 'financial' },
      ]);

      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Order from Amazon purchase')`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      const result = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'amazon order',
      });

      expect(result.results[0]?.matchingKeywords.length).toBeGreaterThan(0);
      expect(
        result.results[0]?.matchingKeywords.map((k) => k.keyword),
      ).toContain('amazon');
    });

    it('should respect limit parameter', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create 5 threads
      for (let i = 0; i < 5; i++) {
        const thread = await factories.createEmailThread(account.id, {
          subject: `Test email ${i}`,
        });
        await factories.createEmailMessage(thread.id);
        await testDb.db
          .update(EmailThreads)
          .set({
            searchVector: sql`to_tsvector('english', ${`Test email ${i}`})`,
          })
          .where(sql`${EmailThreads.id} = ${thread.id}`);
      }

      const result = await searchEmails({
        filters: { gmailAccountId: account.id },
        limit: 2,
        query: 'test',
      });

      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(5);
    });
  });

  describe('getThreadWithMessages (get_email_thread tool)', () => {
    it('should return full thread content', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const thread = await factories.createEmailThread(account.id, {
        subject: 'Important Discussion',
      });

      await factories.createEmailMessage(thread.id, {
        bodyPreview: 'This is the first message',
        fromEmail: 'sender@example.com',
      });

      await factories.createEmailMessage(thread.id, {
        bodyPreview: 'This is a reply',
        fromEmail: 'reply@example.com',
      });

      const result = await getThreadWithMessages(thread.id, {
        includeKeywords: true,
        includeMessages: true,
      });

      expect(result).not.toBeNull();
      expect(result?.thread.subject).toBe('Important Discussion');
      expect(result?.messages).toHaveLength(2);
    });

    it('should include keywords when requested', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const thread = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread.id);
      await factories.createEmailKeywords(thread.id, [
        { keyword: 'meeting', keywordType: 'topic' },
        { keyword: 'John', keywordType: 'person' },
      ]);

      const result = await getThreadWithMessages(thread.id, {
        includeKeywords: true,
      });

      expect(result?.keywords).toHaveLength(2);
    });

    it('should return null for non-existent thread', async () => {
      const result = await getThreadWithMessages('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('listEmailsByCategory (list_emails_by_category tool)', () => {
    it('should list emails by category', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create travel emails
      for (let i = 0; i < 3; i++) {
        const thread = await factories.createEmailThread(account.id, {
          bundleType: 'travel',
          subject: `Travel email ${i}`,
        });
        await factories.createEmailMessage(thread.id);
      }

      // Create other emails
      const otherThread = await factories.createEmailThread(account.id, {
        bundleType: 'finance',
        subject: 'Finance email',
      });
      await factories.createEmailMessage(otherThread.id);

      const result = await listEmailsByCategory({
        category: 'travel',
        gmailAccountId: account.id,
      });

      expect(result.results).toHaveLength(3);
      expect(result.results.every((r) => r.bundleType === 'travel')).toBe(true);
    });

    it('should filter by date range', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Old purchase
      const oldThread = await factories.createEmailThread(account.id, {
        bundleType: 'purchases',
        lastMessageAt: new Date('2024-01-15'),
      });
      await factories.createEmailMessage(oldThread.id);

      // Recent purchase
      const recentThread = await factories.createEmailThread(account.id, {
        bundleType: 'purchases',
        lastMessageAt: new Date('2024-12-15'),
      });
      await factories.createEmailMessage(recentThread.id);

      const result = await listEmailsByCategory({
        category: 'purchases',
        dateRange: {
          end: new Date('2024-12-31'),
          start: new Date('2024-12-01'),
        },
        gmailAccountId: account.id,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.threadId).toBe(recentThread.id);
    });

    it('should paginate results', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create 5 finance emails
      for (let i = 0; i < 5; i++) {
        const thread = await factories.createEmailThread(account.id, {
          bundleType: 'finance',
          lastMessageAt: new Date(`2024-12-${10 + i}`),
        });
        await factories.createEmailMessage(thread.id);
      }

      const page1 = await listEmailsByCategory({
        category: 'finance',
        gmailAccountId: account.id,
        limit: 2,
        offset: 0,
      });

      const page2 = await listEmailsByCategory({
        category: 'finance',
        gmailAccountId: account.id,
        limit: 2,
        offset: 2,
      });

      expect(page1.results).toHaveLength(2);
      expect(page2.results).toHaveLength(2);
      expect(page1.totalCount).toBe(5);

      // No overlap
      const page1Ids = new Set(page1.results.map((r) => r.threadId));
      const page2Ids = new Set(page2.results.map((r) => r.threadId));
      for (const id of page2Ids) {
        expect(page1Ids.has(id)).toBe(false);
      }
    });
  });

  describe('Combined Search Scenario', () => {
    it('should support agent search workflow', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create diverse email set
      const travelThread = await factories.createEmailThread(account.id, {
        bundleType: 'travel',
        lastMessageAt: new Date('2024-12-20'),
        subject: 'Flight to New York JFK',
      });
      await factories.createEmailMessage(travelThread.id, {
        bodyPreview: 'Your United flight UA123 confirmation',
        fromEmail: 'united@airlines.com',
      });
      await factories.createEmailKeywords(travelThread.id, [
        { keyword: 'new york', keywordType: 'location' },
        { keyword: 'united', keywordType: 'company' },
        { keyword: 'flight', keywordType: 'topic' },
      ]);

      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Flight to New York JFK United flight UA123 confirmation')`,
        })
        .where(sql`${EmailThreads.id} = ${travelThread.id}`);

      // Step 1: Agent searches for flights
      const searchResult = await searchEmails({
        filters: {
          bundleTypes: ['travel'],
          gmailAccountId: account.id,
        },
        query: 'flight new york',
      });

      expect(searchResult.results.length).toBeGreaterThan(0);
      const foundThreadId = searchResult.results[0]?.threadId;

      // Step 2: Agent gets full thread content
      const threadContent = await getThreadWithMessages(foundThreadId!, {
        includeKeywords: true,
        includeMessages: true,
      });

      expect(threadContent).not.toBeNull();
      expect(threadContent?.messages.length).toBeGreaterThan(0);
      expect(
        threadContent?.keywords.some(
          (k: EmailKeywordType) => k.keyword === 'new york',
        ),
      ).toBe(true);
    });
  });
});
