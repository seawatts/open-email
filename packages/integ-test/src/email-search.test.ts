import {
  listEmailsByCategory,
  searchEmails,
} from '@seawatts/api/services/email-search';
import { EmailThreads } from '@seawatts/db/schema';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestFactories } from '../test-utils/factories';
import { testDb } from './setup';

describe('Email Search Integration Tests', () => {
  let factories: TestFactories;

  beforeEach(async () => {
    factories = new TestFactories(testDb.db);
  });

  describe('EmailKeywords Factory and Storage', () => {
    it('should create an email keyword', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      const keyword = await factories.createEmailKeyword(thread.id, {
        keyword: 'Amazon',
        keywordType: 'company',
        originalText: 'Your Amazon order has shipped',
      });

      expect(keyword).toBeDefined();
      expect(keyword.id).toMatch(/^kw_/);
      expect(keyword.threadId).toBe(thread.id);
      expect(keyword.keyword).toBe('Amazon');
      expect(keyword.keywordType).toBe('company');
    });

    it('should create multiple keywords for a thread', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        subject: 'Meeting with John at Acme Corp',
      });

      const keywords = await factories.createEmailKeywords(thread.id, [
        { keyword: 'John', keywordType: 'person', originalText: 'John Smith' },
        {
          keyword: 'Acme Corp',
          keywordType: 'company',
          originalText: 'Acme Corporation',
        },
        {
          keyword: 'meeting',
          keywordType: 'topic',
          originalText: 'schedule a meeting',
        },
        {
          keyword: 'next week',
          keywordType: 'temporal',
          originalText: 'next week',
        },
      ]);

      expect(keywords).toHaveLength(4);
      expect(keywords.map((k) => k.keyword)).toContain('John');
      expect(keywords.map((k) => k.keyword)).toContain('Acme Corp');
      expect(keywords.map((k) => k.keywordType)).toContain('person');
      expect(keywords.map((k) => k.keywordType)).toContain('company');
    });

    it('should support all keyword types', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id);

      const keywordTypes = [
        { keyword: 'Jane Doe', type: 'person' as const },
        { keyword: 'Google', type: 'company' as const },
        { keyword: 'New York', type: 'location' as const },
        { keyword: 'invoice', type: 'topic' as const },
        { keyword: 'December 20th', type: 'temporal' as const },
        { keyword: 'approve', type: 'action' as const },
        { keyword: 'report.pdf', type: 'attachment' as const },
        { keyword: '$150.00', type: 'financial' as const },
        { keyword: 'iPhone 15', type: 'product' as const },
      ];

      for (const { keyword, type } of keywordTypes) {
        const created = await factories.createEmailKeyword(thread.id, {
          keyword,
          keywordType: type,
        });

        expect(created.keyword).toBe(keyword);
        expect(created.keywordType).toBe(type);
      }
    });
  });

  describe('Full-Text Search with tsvector', () => {
    it('should update search_vector on thread', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        snippet: 'Please review the attached financial report',
        subject: 'Important meeting about Q4 budget',
      });

      // Update search_vector with content
      const searchContent = `${thread.subject} ${thread.snippet}`;
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', ${searchContent})`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      // Verify the tsvector was set
      const [updated] = await testDb.db
        .select({
          hasSearchVector: sql<boolean>`${EmailThreads.searchVector} IS NOT NULL`,
        })
        .from(EmailThreads)
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      expect(updated?.hasSearchVector).toBe(true);
    });

    it('should find threads by full-text search', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create thread with searchable content
      const thread = await factories.createEmailThread(account.id, {
        snippet: 'Your United Airlines flight UA123 is confirmed',
        subject: 'Flight confirmation to New York',
      });
      await factories.createEmailMessage(thread.id, {
        bodyPreview: 'Departure from SFO at 8:00 AM, arriving JFK at 4:30 PM',
        subject: thread.subject,
      });

      // Set search vector
      const content = `${thread.subject} Your United Airlines flight UA123 is confirmed Departure from SFO at 8:00 AM`;
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', ${content})`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      // Search for flight-related terms
      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'flight New York',
      });

      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0]?.threadId).toBe(thread.id);
    });

    it('should rank results by relevance', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create thread with high relevance (budget mentioned multiple times)
      const highRelevance = await factories.createEmailThread(account.id, {
        snippet: 'Budget analysis for the quarterly budget report',
        subject: 'Q4 Budget Review - Budget Planning Session',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Q4 Budget Review Budget Planning Session Budget analysis for the quarterly budget report')`,
        })
        .where(sql`${EmailThreads.id} = ${highRelevance.id}`);

      // Create thread with lower relevance (budget mentioned once)
      const lowRelevance = await factories.createEmailThread(account.id, {
        snippet: 'We briefly discussed the budget',
        subject: 'Team meeting notes',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Team meeting notes We briefly discussed the budget')`,
        })
        .where(sql`${EmailThreads.id} = ${lowRelevance.id}`);

      // Search for "budget"
      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'budget',
      });

      expect(results.results.length).toBe(2);
      // Higher relevance thread should come first
      expect(results.results[0]?.threadId).toBe(highRelevance.id);
      expect(results.results[0]?.relevanceScore).toBeGreaterThan(
        results.results[1]?.relevanceScore ?? 0,
      );
    });
  });

  describe('Keyword-Based Search', () => {
    it('should find threads by keyword match', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        subject: 'Order shipped',
      });

      // Add keywords
      await factories.createEmailKeywords(thread.id, [
        { keyword: 'Amazon', keywordType: 'company' },
        { keyword: 'package', keywordType: 'topic' },
        { keyword: '1Z999AA1234567890', keywordType: 'product' },
      ]);

      // Set search vector for FTS
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Order shipped from Amazon package tracking')`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      // Search by keyword
      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'Amazon',
      });

      expect(results.results.length).toBeGreaterThan(0);
      expect(
        results.results[0]?.matchingKeywords.some(
          (k) => k.keyword === 'Amazon',
        ),
      ).toBe(true);
    });

    it('should return matching keywords in search results', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);
      const thread = await factories.createEmailThread(account.id, {
        subject: 'Meeting with John at Google HQ',
      });

      await factories.createEmailKeywords(thread.id, [
        { keyword: 'John', keywordType: 'person' },
        { keyword: 'Google', keywordType: 'company' },
        { keyword: 'meeting', keywordType: 'topic' },
        { keyword: 'Mountain View', keywordType: 'location' },
      ]);

      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Meeting with John at Google HQ Mountain View')`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'John Google meeting',
      });

      expect(results.results.length).toBeGreaterThan(0);
      const matchingKeywords = results.results[0]?.matchingKeywords ?? [];
      expect(matchingKeywords.map((k) => k.keyword)).toContain('John');
      expect(matchingKeywords.map((k) => k.keyword)).toContain('Google');
      expect(matchingKeywords.map((k) => k.keyword)).toContain('meeting');
    });
  });

  describe('Filter-Based Search', () => {
    it('should filter by date range', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create old thread
      const oldThread = await factories.createEmailThread(account.id, {
        lastMessageAt: new Date('2024-01-15'),
        subject: 'Old email about travel',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Old email about travel')`,
        })
        .where(sql`${EmailThreads.id} = ${oldThread.id}`);

      // Create recent thread
      const recentThread = await factories.createEmailThread(account.id, {
        lastMessageAt: new Date('2024-12-15'),
        subject: 'Recent email about travel',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Recent email about travel')`,
        })
        .where(sql`${EmailThreads.id} = ${recentThread.id}`);

      // Search with date filter
      const results = await searchEmails({
        filters: {
          dateRange: {
            end: new Date('2024-12-31'),
            start: new Date('2024-12-01'),
          },
          gmailAccountId: account.id,
        },
        query: 'travel',
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0]?.threadId).toBe(recentThread.id);
    });

    it('should filter by bundle type', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create travel thread
      const travelThread = await factories.createEmailThread(account.id, {
        bundleType: 'travel',
        subject: 'Flight booking confirmation',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Flight booking confirmation')`,
        })
        .where(sql`${EmailThreads.id} = ${travelThread.id}`);

      // Create finance thread
      const financeThread = await factories.createEmailThread(account.id, {
        bundleType: 'finance',
        subject: 'Bank statement confirmation',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Bank statement confirmation')`,
        })
        .where(sql`${EmailThreads.id} = ${financeThread.id}`);

      // Search for "confirmation" filtered by travel bundle
      const results = await searchEmails({
        filters: {
          bundleTypes: ['travel'],
          gmailAccountId: account.id,
        },
        query: 'confirmation',
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0]?.bundleType).toBe('travel');
    });

    it('should filter unread only', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create read thread
      await factories.createEmailThread(account.id, {
        isRead: true,
        subject: 'Read newsletter',
      });

      // Create unread thread
      const unreadThread = await factories.createEmailThread(account.id, {
        isRead: false,
        subject: 'Unread newsletter',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Unread newsletter')`,
        })
        .where(sql`${EmailThreads.id} = ${unreadThread.id}`);

      // Search with unread filter
      const results = await searchEmails({
        filters: {
          gmailAccountId: account.id,
          unreadOnly: true,
        },
        query: 'newsletter',
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0]?.isRead).toBe(false);
    });
  });

  describe('Category Listing', () => {
    it('should list emails by category', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create threads for different categories
      await factories.createEmailThread(account.id, {
        bundleType: 'travel',
        subject: 'Flight to Paris',
      });
      await factories.createEmailThread(account.id, {
        bundleType: 'travel',
        subject: 'Hotel booking',
      });
      await factories.createEmailThread(account.id, {
        bundleType: 'purchases',
        subject: 'Amazon order',
      });

      // List travel category
      const results = await listEmailsByCategory({
        category: 'travel',
        gmailAccountId: account.id,
      });

      expect(results.results.length).toBe(2);
      expect(results.results.every((r) => r.bundleType === 'travel')).toBe(
        true,
      );
    });

    it('should filter category by date range', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create old purchase
      await factories.createEmailThread(account.id, {
        bundleType: 'purchases',
        lastMessageAt: new Date('2024-01-15'),
        subject: 'Old purchase',
      });

      // Create recent purchase
      const recentPurchase = await factories.createEmailThread(account.id, {
        bundleType: 'purchases',
        lastMessageAt: new Date('2024-12-15'),
        subject: 'Recent purchase',
      });

      // List with date filter
      const results = await listEmailsByCategory({
        category: 'purchases',
        dateRange: {
          end: new Date('2024-12-31'),
          start: new Date('2024-12-01'),
        },
        gmailAccountId: account.id,
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0]?.threadId).toBe(recentPurchase.id);
    });

    it('should paginate category results', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create multiple threads
      for (let i = 0; i < 5; i++) {
        await factories.createEmailThread(account.id, {
          bundleType: 'finance',
          lastMessageAt: new Date(`2024-12-${10 + i}`),
          subject: `Finance email ${i}`,
        });
      }

      // Get first page
      const page1 = await listEmailsByCategory({
        category: 'finance',
        gmailAccountId: account.id,
        limit: 2,
        offset: 0,
      });

      expect(page1.results.length).toBe(2);
      expect(page1.totalCount).toBe(5);

      // Get second page
      const page2 = await listEmailsByCategory({
        category: 'finance',
        gmailAccountId: account.id,
        limit: 2,
        offset: 2,
      });

      expect(page2.results.length).toBe(2);

      // Ensure no overlap
      const page1Ids = page1.results.map((r) => r.threadId);
      const page2Ids = page2.results.map((r) => r.threadId);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });
  });

  describe('Search Response Metadata', () => {
    it('should return processing time', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      await factories.createEmailThread(account.id, {
        subject: 'Test email',
      });

      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'test',
      });

      expect(results.processingTimeMs).toBeDefined();
      expect(results.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return total count for pagination', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create 10 threads
      for (let i = 0; i < 10; i++) {
        const thread = await factories.createEmailThread(account.id, {
          subject: `Invoice email ${i}`,
        });
        await testDb.db
          .update(EmailThreads)
          .set({
            searchVector: sql`to_tsvector('english', ${`Invoice email ${i}`})`,
          })
          .where(sql`${EmailThreads.id} = ${thread.id}`);
      }

      // Search with limit
      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        limit: 3,
        query: 'invoice',
      });

      expect(results.results.length).toBe(3);
      expect(results.totalCount).toBe(10);
    });

    it('should echo back the query', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'test search query',
      });

      expect(results.query).toBe('test search query');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      await factories.createEmailThread(account.id, {
        subject: 'Some email',
      });

      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: '',
      });

      // Should return results ordered by date
      expect(results.results.length).toBeGreaterThan(0);
    });

    it('should handle special characters in search query', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const thread = await factories.createEmailThread(account.id, {
        subject: 'Email about $100 payment',
      });
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', 'Email about 100 payment dollars')`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      // Search with special characters - should not throw
      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: '$100 payment',
      });

      expect(results).toBeDefined();
    });

    it('should handle no matching results', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      await factories.createEmailThread(account.id, {
        subject: 'Email about cats',
      });

      const results = await searchEmails({
        filters: { gmailAccountId: account.id },
        query: 'nonexistent unique term xyz123',
      });

      expect(results.results.length).toBe(0);
      expect(results.totalCount).toBe(0);
    });
  });
});
