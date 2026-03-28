export * from './types.generated';

/**
 * All tables live in the `open_email` schema, so the generated
 * `Database['public']['Tables']` is empty. For Supabase Realtime
 * subscriptions we only need the table name as a string and a
 * generic row shape.
 */
export type TableName = string;
export type Tables<_T extends TableName> = Record<string, unknown>;
