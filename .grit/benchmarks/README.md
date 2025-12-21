# Grit Rules Benchmark

Benchmark individual Biome.js Grit rules to measure performance impact and identify optimization opportunities.

## Quick Start

```bash
# Run benchmarks (~10-15 min)
pnpm bench:grit

# View visual report
pnpm bench:serve
# Opens at http://localhost:3010
```

Results are saved to `benchmarks/results/latest.json` and displayed in an interactive HTML report.

## Configuration

Edit `benchmarks/grit.config.json`:

```json
{
  "benchmarkSettings": {
    "warmupRuns": 1,        // Warmup runs before sampling
    "sampleRuns": 5,        // Number of timed samples
    "includeBaseline": true,
    "includeAllTogether": true
  }
}
```

### Adding New Rules

Add to `benchmarks/grit.config.json`:

```json
{
  "name": "my-new-rule",
  "path": ".grit/my-new-rule.grit",
  "category": "correctness",  // correctness, type-safety, style, naming, etc.
  "severity": "error",        // error, warning, info
  "description": "What the rule checks",
  "config": "biome.json"      // or "biome-incremental.json"
}
```

## Performance Guidelines

**Interpretation:**
- **< 3s**: Excellent
- **3-5s**: Good
- **5-10s**: Moderate impact, consider optimization
- **> 10s**: High impact, prioritize optimization

**Optimization strategies:**
1. Consolidate patterns using `$rest` captures
2. Add regex prefilters before structural matching
3. Limit scope to relevant directories
4. Move heavy rules to `biome-incremental.json`

## Metrics

- **Mean**: Average time
- **Median**: Middle value (less affected by outliers)
- **P95**: 95th percentile (worst-case)
- **Stddev**: Consistency indicator
- **Min/Max**: Best/worst observed times

## Troubleshooting

**Benchmarks too slow?** Reduce `sampleRuns` in config.

**Inconsistent results?** Close other apps, increase `sampleRuns`, check background processes.

**Report won't load?** Run `pnpm bench:grit` first to generate results.

## Files

- `grit.config.json` - Rule configuration and benchmark settings
- `scripts/bench-grit-rules.ts` - Benchmark script
- `index.html` - Visual report (loads `results/latest.json`)
- `results/` - JSON results (gitignored except `latest.json`)

## How It Works

For each rule:
1. Create temp config with only that rule enabled
2. Run `pnpm biome check` and measure wall-clock time
3. Repeat N times, calculate statistics
4. Clean up temp config

Results include baseline (no rules), individual rules, and all rules together.
