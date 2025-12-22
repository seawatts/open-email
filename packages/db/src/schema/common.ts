import { customType, pgSchema } from 'drizzle-orm/pg-core';

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

export const schema = pgSchema('open_email');

// ============================================================================
// CUSTOM DRIZZLE TYPES
// ============================================================================

// Custom type for PostgreSQL tsvector (full-text search)
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});
