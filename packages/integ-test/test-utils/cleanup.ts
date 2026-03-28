import * as schema from '@seawatts/db/schema';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function cleanupTestData(
  db: PostgresJsDatabase<typeof schema>,
): Promise<void> {
  try {
    await db.delete(schema.EmailMessages);
    await db.delete(schema.EmailThreads);
    await db.delete(schema.EmailRules);
    await db.delete(schema.Accounts);

    await db.delete(schema.AuthCodes);
    await db.delete(schema.ApiKeyUsage);
    await db.delete(schema.ApiKeys);
    await db.delete(schema.OrgMembers);
    await db.delete(schema.Orgs);
    await db.delete(schema.Users);
  } catch (error) {
    console.warn('Cleanup warning:', error);
    try {
      await db.execute(
        sql`TRUNCATE TABLE
          "emailMessages", "emailThreads", "emailRules", "account",
          "authCodes", "apiKeyUsage", "apiKeys", "orgMembers", "orgs", "user"
          RESTART IDENTITY CASCADE`,
      );
    } catch (truncateError) {
      console.error('Failed to cleanup test data:', truncateError);
      throw truncateError;
    }
  }
}
