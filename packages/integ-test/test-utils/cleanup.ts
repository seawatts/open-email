import * as schema from '@seawatts/db/schema';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function cleanupTestData(
  db: PostgresJsDatabase<typeof schema>,
): Promise<void> {
  // Delete all data in reverse order of dependencies
  // Use try-catch to handle potential constraint issues
  try {
    // User profile tables
    await db.delete(schema.UserContactStyle);
    await db.delete(schema.UserWritingProfile);
    await db.delete(schema.UserMemory);

    // Email-related tables (in dependency order)
    await db.delete(schema.EmailKeywords);
    await db.delete(schema.EmailHighlights);
    await db.delete(schema.EmailActions);
    await db.delete(schema.AgentDecisions);
    await db.delete(schema.EmailMessages);
    await db.delete(schema.EmailThreads);
    await db.delete(schema.EmailRules);
    await db.delete(schema.UserEmailSettings);
    await db.delete(schema.Accounts);

    // Original tables
    await db.delete(schema.AuthCodes);
    await db.delete(schema.ApiKeyUsage);
    await db.delete(schema.ApiKeys);
    await db.delete(schema.OrgMembers);
    await db.delete(schema.Orgs);
    await db.delete(schema.Users);
  } catch (error) {
    console.warn('Cleanup warning:', error);
    // If there are constraint issues, try again with TRUNCATE CASCADE
    try {
      await db.execute(
        sql`TRUNCATE TABLE
          "userContactStyle", "userWritingProfile", "userMemory",
          "emailKeywords", "emailHighlights", "emailActions", "agentDecisions", "emailMessages",
          "emailThreads", "emailRules", "userEmailSettings", "account",
          "authCodes", "apiKeyUsage", "apiKeys", "orgMembers", "orgs", "user"
          RESTART IDENTITY CASCADE`,
      );
    } catch (truncateError) {
      console.error('Failed to cleanup test data:', truncateError);
      throw truncateError;
    }
  }
}
