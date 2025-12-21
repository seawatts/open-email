# Grit Rule Tests

This directory contains unit tests for Grit rules used in Biome linting. These tests verify that Grit rules correctly identify code patterns without affecting the main codebase linting.

## Structure

- Each `.test.ts` file contains examples that should trigger its corresponding Grit rule
- `biome.json` configures Biome to use only the Grit rules for testing (isolated from main config)
- Tests verify that rules correctly identify code patterns

## Exclusion from Main Linting

**Important:** The `.grit/tests` folder is excluded from normal Biome linting runs (like `pnpm biome:lint`) to prevent test files from triggering lint failures in the main codebase.

- ✅ **Excluded from main linting:** `.grit/tests/**` is in the exclude list in root `biome.json`
- ✅ **Included for testing:** Test script uses `--config-path=.grit/tests/biome.json` to lint test files
- ✅ **Isolated config:** Test config only includes Grit plugin rules, not other Biome rules

This ensures:
- Test files don't pollute normal lint output
- Grit rules can be tested independently
- Rules can be verified before adding to main `biome.json`

## Running Tests

### Automated Test Script (Recommended)

```bash
# Run all tests
pnpm x scripts/test-grit-rules.ts
```

This script:
- Runs Biome lint on all test files using relative plugin paths
- Reports which rules are working correctly

### Manual Testing

You can also test individual rules manually:

```bash
# Test all rules
pnpm biome lint .grit/tests --config-path=.grit/tests/biome.json

# Test specific rule
pnpm biome lint .grit/tests/prefer-wrap-over-try-catch.test.ts --config-path=.grit/tests/biome.json
```

## Expected Behavior

Each test file should produce warnings/errors from its corresponding rule:
- ✅ Comments mark code that SHOULD trigger the rule
- Rules should match the expected patterns
- Rules should NOT match unrelated code
- Test script verifies that plugin diagnostics are present

## Test Files

See all test files in [`.grit/tests/`](.).

## Adding New Tests

1. Create a new `.test.ts` file following the naming pattern: `{rule-name}.test.ts`
2. Add examples that should trigger the rule (marked with ✅ comments)
3. Add the rule to `biome.json` plugins array using relative path (e.g., `../rule-name.grit`)
4. Run `pnpm x scripts/test-grit-rules.ts` to verify

## How It Works

The test setup uses a separate `biome.json` configuration that:
- Sets `root: false` to avoid conflicts with the main config
- Only includes Grit plugin rules (no other Biome rules)
- Uses relative paths for plugins (e.g., `../rule-name.grit`)
- Isolates testing from the main codebase linting

This ensures that:
- ✅ Rules can be tested independently
- ✅ Tests don't affect main codebase linting
- ✅ Rules can be verified before adding to main `biome.json`

