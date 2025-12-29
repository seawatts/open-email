import {
  UserContactStyle,
  UserMemory,
  UserWritingProfile,
} from '@seawatts/db/schema';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestFactories } from '../test-utils/factories';
import { testDb } from './setup';

describe('User Profile and Memory Integration Tests', () => {
  let factories: TestFactories;

  beforeEach(async () => {
    factories = new TestFactories(testDb.db);
  });

  describe('UserMemory Factory and Storage', () => {
    it('should create a user memory', async () => {
      const user = await factories.createUser();

      const memory = await factories.createUserMemory(user.id, {
        confidence: 0.95,
        content: 'Works at Google as a software engineer',
        memoryType: 'fact',
      });

      expect(memory).toBeDefined();
      expect(memory.id).toMatch(/^mem_/);
      expect(memory.userId).toBe(user.id);
      expect(memory.content).toBe('Works at Google as a software engineer');
      expect(memory.memoryType).toBe('fact');
      expect(memory.confidence).toBe(0.95);
    });

    it('should create multiple memories for a user', async () => {
      const user = await factories.createUser();

      const memories = await factories.createUserMemories(user.id, [
        { content: 'Prefers Python over JavaScript', memoryType: 'preference' },
        { content: 'Lives in San Francisco', memoryType: 'fact' },
        { content: 'Works at Startup Inc', memoryType: 'fact' },
      ]);

      expect(memories).toHaveLength(3);
      expect(memories.map((m) => m.memoryType)).toContain('preference');
      expect(memories.map((m) => m.memoryType)).toContain('fact');
    });

    it('should support all memory types', async () => {
      const user = await factories.createUser();
      const memoryTypes: Array<
        'fact' | 'preference' | 'writing_style' | 'signature' | 'relationship'
      > = ['fact', 'preference', 'writing_style', 'signature', 'relationship'];

      for (const memoryType of memoryTypes) {
        const memory = await factories.createUserMemory(user.id, {
          content: `Test ${memoryType} memory`,
          memoryType,
        });

        expect(memory.memoryType).toBe(memoryType);
      }
    });

    it('should query memories by type', async () => {
      const user = await factories.createUser();

      await factories.createUserMemories(user.id, [
        { content: 'Work fact 1', memoryType: 'fact' },
        { content: 'Work fact 2', memoryType: 'fact' },
        { content: 'User preference', memoryType: 'preference' },
      ]);

      const factMemories = await testDb.db.query.UserMemory.findMany({
        where: eq(UserMemory.memoryType, 'fact'),
      });

      expect(factMemories).toHaveLength(2);
      expect(factMemories.every((m) => m.memoryType === 'fact')).toBe(true);
    });
  });

  describe('UserWritingProfile Factory and Storage', () => {
    it('should create a user writing profile', async () => {
      const user = await factories.createUser();

      const profile = await factories.createUserWritingProfile(user.id, {
        defaultFormalityLevel: 0.7,
        preferredGreeting: 'Hello',
        preferredSignoff: 'Regards',
      });

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(user.id);
      expect(profile.defaultFormalityLevel).toBe(0.7);
      expect(profile.preferredGreeting).toBe('Hello');
      expect(profile.preferredSignoff).toBe('Regards');
    });

    it('should store detected signature', async () => {
      const user = await factories.createUser();
      const signature =
        'Best regards,\nJohn Doe\nSoftware Engineer\njohn@example.com';

      const profile = await factories.createUserWritingProfile(user.id, {
        detectedSignature: signature,
      });

      expect(profile.detectedSignature).toBe(signature);
    });

    it('should store common phrases', async () => {
      const user = await factories.createUser();
      const phrases = [
        'Thanks for your patience',
        'Please let me know',
        'Looking forward to hearing from you',
      ];

      const profile = await factories.createUserWritingProfile(user.id, {
        commonPhrases: phrases,
      });

      expect(profile.commonPhrases).toEqual(phrases);
    });

    it('should track analyzed message count', async () => {
      const user = await factories.createUser();

      const profile = await factories.createUserWritingProfile(user.id, {
        analyzedMessageCount: 150,
        averageMessageLength: 320,
      });

      expect(profile.analyzedMessageCount).toBe(150);
      expect(profile.averageMessageLength).toBe(320);
    });
  });

  describe('UserContactStyle Factory and Storage', () => {
    it('should create a user contact style', async () => {
      const user = await factories.createUser();

      const style = await factories.createUserContactStyle(user.id, {
        contactDomain: 'company.com',
        contactEmail: 'boss@company.com',
        formalityLevel: 0.9,
        typicalGreeting: 'Dear Sir/Madam',
      });

      expect(style).toBeDefined();
      expect(style.id).toMatch(/^style_/);
      expect(style.userId).toBe(user.id);
      expect(style.contactDomain).toBe('company.com');
      expect(style.formalityLevel).toBe(0.9);
    });

    it('should track message count per contact', async () => {
      const user = await factories.createUser();

      const style = await factories.createUserContactStyle(user.id, {
        contactDomain: 'friend.com',
        messageCount: 25,
      });

      expect(style.messageCount).toBe(25);
    });

    it('should support different formality levels', async () => {
      const user = await factories.createUser();

      // Formal contact
      const formalStyle = await factories.createUserContactStyle(user.id, {
        contactDomain: 'corporate.com',
        formalityLevel: 0.95,
        typicalGreeting: 'Dear',
        typicalSignoff: 'Yours sincerely',
      });

      // Casual contact
      const casualStyle = await factories.createUserContactStyle(user.id, {
        contactDomain: 'friend.com',
        formalityLevel: 0.2,
        typicalGreeting: 'Hey',
        typicalSignoff: 'Cheers',
      });

      expect(formalStyle.formalityLevel).toBeGreaterThan(0.9);
      expect(casualStyle.formalityLevel).toBeLessThan(0.3);
    });

    it('should query contact styles by domain', async () => {
      const user = await factories.createUser();

      await factories.createUserContactStyle(user.id, {
        contactDomain: 'work.com',
      });
      await factories.createUserContactStyle(user.id, {
        contactDomain: 'personal.com',
      });

      const workStyles = await testDb.db.query.UserContactStyle.findMany({
        where: eq(UserContactStyle.contactDomain, 'work.com'),
      });

      expect(workStyles).toHaveLength(1);
      expect(workStyles[0]?.contactDomain).toBe('work.com');
    });
  });

  describe('Complete User Profile Setup', () => {
    it('should create complete profile with memories and contact styles', async () => {
      const user = await factories.createUser();

      const { writingProfile, memories, contactStyles } =
        await factories.createUserProfileSetup(user.id);

      expect(writingProfile).toBeDefined();
      expect(writingProfile.userId).toBe(user.id);

      expect(memories).toHaveLength(3);
      expect(memories.map((m) => m.memoryType)).toContain('fact');
      expect(memories.map((m) => m.memoryType)).toContain('preference');
      expect(memories.map((m) => m.memoryType)).toContain('writing_style');

      expect(contactStyles).toHaveLength(2);
      expect(contactStyles.map((s) => s.contactDomain)).toContain('work.com');
      expect(contactStyles.map((s) => s.contactDomain)).toContain('friend.com');
    });

    it('should create profile with different formality for different domains', async () => {
      const user = await factories.createUser();

      const { contactStyles } = await factories.createUserProfileSetup(user.id);

      const workStyle = contactStyles.find(
        (s) => s.contactDomain === 'work.com',
      );
      const friendStyle = contactStyles.find(
        (s) => s.contactDomain === 'friend.com',
      );

      expect(workStyle?.formalityLevel).toBeGreaterThan(
        friendStyle?.formalityLevel ?? 0,
      );
    });
  });

  describe('Profile Update Operations', () => {
    it('should update writing profile', async () => {
      const user = await factories.createUser();
      const profile = await factories.createUserWritingProfile(user.id, {
        defaultFormalityLevel: 0.5,
      });

      await testDb.db
        .update(UserWritingProfile)
        .set({
          analyzedMessageCount: 200,
          defaultFormalityLevel: 0.7,
        })
        .where(eq(UserWritingProfile.userId, user.id));

      const updated = await testDb.db.query.UserWritingProfile.findFirst({
        where: eq(UserWritingProfile.userId, user.id),
      });

      expect(updated?.defaultFormalityLevel).toBe(0.7);
      expect(updated?.analyzedMessageCount).toBe(200);
    });

    it('should update contact style formality over time', async () => {
      const user = await factories.createUser();
      const style = await factories.createUserContactStyle(user.id, {
        contactDomain: 'evolving.com',
        formalityLevel: 0.8,
        messageCount: 5,
      });

      // Simulate formality becoming more casual
      const newFormality = (0.8 * 5 + 0.3) / 6; // Weighted average
      await testDb.db
        .update(UserContactStyle)
        .set({
          formalityLevel: newFormality,
          messageCount: 6,
        })
        .where(eq(UserContactStyle.id, style.id));

      const updated = await testDb.db.query.UserContactStyle.findFirst({
        where: eq(UserContactStyle.id, style.id),
      });

      expect(updated?.formalityLevel).toBeLessThan(0.8);
      expect(updated?.messageCount).toBe(6);
    });
  });
});
