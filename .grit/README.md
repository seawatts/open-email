# Grit Rules

This directory contains custom Grit pattern rules for enforcing code standards in the OpenRouter monorepo.

## What are Grit Rules?

Grit is a pattern-matching language built into Biome that allows us to write custom linting rules. These rules help us enforce:

- Coding conventions specific to our codebase
- Migration patterns (e.g., from one API to another)
- Best practices that aren't covered by standard linters

## Benchmarking Grit Rules

**IMPORTANT:** Grit rules can be expensive to run. A poorly written rule can significantly slow down the linting process for the entire monorepo.

### Why Benchmark?

- **Performance Impact:** Some pattern-matching operations are more expensive than others
- **CI/CD Time:** Slow rules increase build times for all developers
- **Developer Experience:** Long linting times slow down local development

### How to Benchmark

**IMPORTANT:** Benchmarking all rules is expensive and time-consuming. When developing a new rule, use the `--rule` flag to benchmark only your new rule.

#### Benchmarking a Single Rule (Recommended)

If you are adding a rule, you _must_ benchmark it to confirm that it doesn't add more than one second of overhead. If it does, investigate changes you could make to reduce its overhead.

Use the `--rule` flag to benchmark a specific rule without modifying `biome.json`:

```bash
# Benchmark a specific rule
pnpm bench:grit --rule=no-iife > my-rule-benchmark.json

# More thorough benchmark with additional samples
pnpm bench:grit --rule=no-iife --warmup=3 --samples=10 > my-rule-benchmark.json
```

#### Benchmarking All Rules (Rarely Needed)

Only benchmark all rules when you need to:
- Compare relative performance across all rules
- Detect performance regressions in existing rules
- Generate a comprehensive performance report

```bash
# Benchmark all rules (default: 1 warmup, 3 samples per rule)
pnpm bench:grit > benchmark-results.json

# More thorough benchmark with additional samples
pnpm bench:grit --warmup=3 --samples=10 > benchmark-results.json
```

### Options

- `--rule=<name>` - Benchmark only a specific rule (e.g., `--rule=no-iife`)
- `--warmup=N` - Number of warmup runs before sampling (default: 1)
- `--samples=N` - Number of sample runs for statistics (default: 3)
- `--no-baseline` - Skip baseline benchmark (Biome with no Grit rules)
- `--no-combined` - Skip combined benchmark (all Grit rules together)

### Interpreting Results

The benchmark outputs JSON with statistics for each rule:

```json
{
  "rules": [
    {
      "name": "no-promise-race",
      "path": ".grit/no-promise-race.grit",
      "samples": [1234.5, 1245.2, ...],
      "mean": 1239.8,
      "median": 1238.1,
      "p95": 1256.7,
      "stddev": 8.3,
      "min": 1230.1,
      "max": 1260.5
    }
  ]
}
```

**Key metrics:**
- `mean` - Average execution time across all samples (in milliseconds)
- `median` - Middle value, less affected by outliers
- `p95` - 95th percentile, shows worst-case performance
- `stddev` - Standard deviation, indicates consistency

### Performance Guidelines

Compare individual rule performance to the baseline to understand the overhead. Rules with significant overhead should provide proportional value or be optimized.

## Adding a New Grit Rule

1. **Create the rule file:** Add a new `.grit` file to this directory
2. **Benchmark it:** Run `pnpm bench:grit` and check the performance
3. **Optimize if needed:** Refactor patterns to reduce execution time
4. **Add to biome.json:** Once performance is acceptable, add the rule path to the `plugins` array in `biome.json`

## Example: Creating a Rule

```grit
engine biome(2.0)
language js(typescript, jsx)

// Match pattern and register diagnostic
`someAntiPattern($args)` as $match where {
  register_diagnostic(
    span=$match,
    message="Use betterPattern() instead of someAntiPattern()",
    severity="warning"
  )
}
```

## Optimization Tips

1. **Be specific with patterns:** Narrow patterns match fewer nodes
2. **Use language filters:** Specify `js`, `typescript`, `jsx` only if needed
3. **Avoid expensive operations:** Minimize complex nested patterns
4. **Test on real codebase:** Benchmark on the actual monorepo, not toy examples

## Existing Rules

See the `.grit` files in this directory for the current rules. Each file contains a pattern definition with a diagnostic message explaining what it enforces.

## Resources

- [Biome Grit Documentation](https://biomejs.dev/guides/grit/)
- [Grit Pattern Language](https://docs.grit.io/)
- Benchmark script: `scripts/bench-grit-rules.ts`
