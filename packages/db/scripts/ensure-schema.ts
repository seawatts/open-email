#!/usr/bin/env tsx

import postgres from 'postgres';
import { env } from '../src/env';

const nonPoolingUrl = (env.POSTGRES_URL ?? '').replace(':6543', ':5432');

async function ensureSchema() {
  const sql = postgres(nonPoolingUrl, { max: 1 });

  try {
    // Create schema with correct PostgreSQL syntax if it doesn't exist
    await sql`CREATE SCHEMA IF NOT EXISTS "open_email"`;
    console.log('Schema "open_email" ensured');
  } catch (error) {
    console.error('Error ensuring schema:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

ensureSchema();
