import {
  buildKeywordsByThreadMap,
  buildThreadSenderMap,
  mapThreadsToSearchResults,
  parseSearchQuery,
  STOP_WORDS,
} from '@seawatts/api/services/email-search';
import { EmailThreads } from '@seawatts/db/schema';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestFactories } from '../test-utils/factories';
import { testDb } from './setup';

describe('Search Mappers Integration Tests', () => {
  let factories: TestFactories;

  beforeEach(async () => {
    factories = new TestFactories(testDb.db);
  });

  describe('parseSearchQuery', () => {
    it('should parse simple query into terms', () => {
      const terms = parseSearchQuery('flight booking');

      expect(terms).toContain('flight:*');
      expect(terms).toContain('booking:*');
    });

    it('should filter out stop words', () => {
      const terms = parseSearchQuery('the flight to new york');

      expect(terms).not.toContain('the:*');
      expect(terms).not.toContain('to:*');
      expect(terms).toContain('flight:*');
      expect(terms).toContain('new:*');
      expect(terms).toContain('york:*');
    });

    it('should handle special characters', () => {
      const terms = parseSearchQuery('order #12345 from amazon.com');

      // Special chars should be stripped
      expect(terms.some((t) => t.includes('#'))).toBe(false);
      expect(terms).toContain('order:*');
      expect(terms).toContain('12345:*');
    });

    it('should convert to lowercase', () => {
      const terms = parseSearchQuery('IMPORTANT Meeting');

      expect(terms).toContain('important:*');
      expect(terms).toContain('meeting:*');
      expect(terms).not.toContain('IMPORTANT:*');
    });

    it('should filter short words', () => {
      const terms = parseSearchQuery('a I am ok');

      // Single letter and very short words filtered
      expect(terms).not.toContain('a:*');
      expect(terms).not.toContain('i:*');
      expect(terms).toContain('ok:*');
    });

    it('should handle empty query', () => {
      const terms = parseSearchQuery('');

      expect(terms).toHaveLength(0);
    });

    it('should handle query with only stop words', () => {
      const terms = parseSearchQuery('the and or but');

      expect(terms).toHaveLength(0);
    });
  });

  describe('STOP_WORDS', () => {
    it('should contain common English stop words', () => {
      expect(STOP_WORDS.has('the')).toBe(true);
      expect(STOP_WORDS.has('and')).toBe(true);
      expect(STOP_WORDS.has('or')).toBe(true);
      expect(STOP_WORDS.has('is')).toBe(true);
      expect(STOP_WORDS.has('are')).toBe(true);
    });

    it('should contain pronouns', () => {
      expect(STOP_WORDS.has('i')).toBe(true);
      expect(STOP_WORDS.has('you')).toBe(true);
      expect(STOP_WORDS.has('we')).toBe(true);
      expect(STOP_WORDS.has('they')).toBe(true);
    });
  });

  describe('buildKeywordsByThreadMap', () => {
    it('should group keywords by thread ID', () => {
      const keywordMatches = [
        { keyword: 'Amazon', keywordType: 'company', threadId: 'thread1' },
        { keyword: 'John', keywordType: 'person', threadId: 'thread1' },
        { keyword: 'Google', keywordType: 'company', threadId: 'thread2' },
      ];

      const map = buildKeywordsByThreadMap(keywordMatches);

      expect(map.get('thread1')).toHaveLength(2);
      expect(map.get('thread2')).toHaveLength(1);
      expect(map.get('thread1')?.map((k) => k.keyword)).toContain('Amazon');
      expect(map.get('thread1')?.map((k) => k.keyword)).toContain('John');
    });

    it('should return empty map for empty array', () => {
      const map = buildKeywordsByThreadMap([]);

      expect(map.size).toBe(0);
    });
  });

  describe('buildThreadSenderMap', () => {
    it('should build map of thread IDs to first sender', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const thread1 = await factories.createEmailThread(account.id);
      await factories.createEmailMessage(thread1.id, {
        fromEmail: 'first@example.com',
        fromName: 'First Person',
        internalDate: new Date('2024-01-01'),
      });
      await factories.createEmailMessage(thread1.id, {
        fromEmail: 'second@example.com',
        fromName: 'Second Person',
        internalDate: new Date('2024-01-02'),
      });

      const map = await buildThreadSenderMap([thread1.id]);

      expect(map.get(thread1.id)?.fromEmail).toBe('first@example.com');
      expect(map.get(thread1.id)?.fromName).toBe('First Person');
    });

    it('should return empty map for empty thread IDs', async () => {
      const map = await buildThreadSenderMap([]);

      expect(map.size).toBe(0);
    });
  });

  describe('mapThreadsToSearchResults', () => {
    it('should map thread rows to search results', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      const thread = await factories.createEmailThread(account.id, {
        bundleType: 'travel',
        isRead: false,
        snippet: 'Your flight has been confirmed',
        subject: 'Flight Confirmation',
      });
      await factories.createEmailMessage(thread.id, {
        fromEmail: 'airline@example.com',
        fromName: 'Airline',
      });

      const threadRows = [
        {
          bundleType: thread.bundleType,
          id: thread.id,
          isRead: thread.isRead,
          lastMessageAt: thread.lastMessageAt!,
          messageCount: thread.messageCount,
          relevanceScore: 0.85,
          snippet: thread.snippet,
          subject: thread.subject,
        },
      ];

      const senderMap = await buildThreadSenderMap([thread.id]);
      const keywordsMap = new Map<
        string,
        Array<{ keyword: string; keywordType: string }>
      >();
      keywordsMap.set(thread.id, [{ keyword: 'flight', keywordType: 'topic' }]);

      const results = mapThreadsToSearchResults(
        threadRows,
        senderMap,
        keywordsMap,
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.threadId).toBe(thread.id);
      expect(results[0]?.subject).toBe('Flight Confirmation');
      expect(results[0]?.fromEmail).toBe('airline@example.com');
      expect(results[0]?.bundleType).toBe('travel');
      expect(results[0]?.relevanceScore).toBe(0.85);
      expect(results[0]?.matchingKeywords).toHaveLength(1);
    });

    it('should use default values when sender not found', () => {
      const threadRows = [
        {
          bundleType: 'personal',
          id: 'thread1',
          isRead: true,
          lastMessageAt: new Date(),
          messageCount: 1,
          snippet: 'Test snippet',
          subject: 'Test',
        },
      ];

      const emptyMap = new Map<
        string,
        { fromEmail: string; fromName: string | null }
      >();
      const results = mapThreadsToSearchResults(threadRows, emptyMap);

      expect(results[0]?.fromEmail).toBe('unknown');
      expect(results[0]?.fromName).toBeNull();
    });

    it('should handle missing keywords map', () => {
      const threadRows = [
        {
          bundleType: null,
          id: 'thread1',
          isRead: true,
          lastMessageAt: new Date(),
          messageCount: 1,
          snippet: null,
          subject: 'Test',
        },
      ];

      const senderMap = new Map<
        string,
        { fromEmail: string; fromName: string | null }
      >();
      senderMap.set('thread1', {
        fromEmail: 'test@example.com',
        fromName: 'Test',
      });

      const results = mapThreadsToSearchResults(threadRows, senderMap);

      expect(results[0]?.matchingKeywords).toHaveLength(0);
      expect(results[0]?.relevanceScore).toBe(1.0);
    });
  });

  describe('Full-Text Search Integration', () => {
    it('should find threads using ts_rank', async () => {
      const user = await factories.createUser();
      const account = await factories.createGmailAccount(user.id);

      // Create thread with search vector
      const thread = await factories.createEmailThread(account.id, {
        snippet: 'Quarterly budget review and planning',
        subject: 'Important Budget Meeting',
      });

      // Set the search vector
      const content =
        'Important Budget Meeting Quarterly budget review and planning';
      await testDb.db
        .update(EmailThreads)
        .set({
          searchVector: sql`to_tsvector('english', ${content})`,
        })
        .where(sql`${EmailThreads.id} = ${thread.id}`);

      // Query using ts_rank
      const results = await testDb.db
        .select({
          id: EmailThreads.id,
          rank: sql<number>`ts_rank(${EmailThreads.searchVector}, to_tsquery('english', 'budget:*'))`,
          subject: EmailThreads.subject,
        })
        .from(EmailThreads)
        .where(
          sql`${EmailThreads.searchVector} @@ to_tsquery('english', 'budget:*')`,
        );

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(thread.id);
      expect(results[0]?.rank).toBeGreaterThan(0);
    });
  });
});
