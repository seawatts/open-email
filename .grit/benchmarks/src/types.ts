import { z } from '@openrouter-monorepo/type-utils/zod';

export const BenchmarkResultSchema = z.object({
  name: z.string(),
  category: z.string(),
  severity: z.string(),
  description: z.string(),
  config: z.string(),
  samples: z.array(z.number()),
  mean: z.number(),
  median: z.number(),
  p95: z.number(),
  stddev: z.number(),
  min: z.number(),
  max: z.number(),
});

export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

export const BenchmarkEnvironmentSchema = z.object({
  node: z.string(),
  pnpm: z.string(),
  biome: z.string(),
  os: z.string(),
  cpu: z.string(),
  commit: z.string(),
});

export const BenchmarkDataSchema = z.object({
  timestamp: z.string(),
  environment: BenchmarkEnvironmentSchema,
  filesChecked: z.number(),
  baseline: BenchmarkResultSchema,
  rules: z.array(BenchmarkResultSchema),
  allTogether: BenchmarkResultSchema,
});

export type BenchmarkData = z.infer<typeof BenchmarkDataSchema>;

export type SortBy = 'slowest' | 'fastest' | 'alphabetical' | 'category';
