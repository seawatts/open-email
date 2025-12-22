import { z } from '@openrouter-monorepo/type-utils/zod';

export const BenchmarkResultSchema = z.object({
  category: z.string(),
  config: z.string(),
  description: z.string(),
  max: z.number(),
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  name: z.string(),
  p95: z.number(),
  samples: z.array(z.number()),
  severity: z.string(),
  stddev: z.number(),
});

export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

export const BenchmarkEnvironmentSchema = z.object({
  biome: z.string(),
  commit: z.string(),
  cpu: z.string(),
  node: z.string(),
  os: z.string(),
  pnpm: z.string(),
});

export const BenchmarkDataSchema = z.object({
  allTogether: BenchmarkResultSchema,
  baseline: BenchmarkResultSchema,
  environment: BenchmarkEnvironmentSchema,
  filesChecked: z.number(),
  rules: z.array(BenchmarkResultSchema),
  timestamp: z.string(),
});

export type BenchmarkData = z.infer<typeof BenchmarkDataSchema>;

export type SortBy = 'slowest' | 'fastest' | 'alphabetical' | 'category';
