// Test file for prefer-valueof-helper.grit rule
// This file should trigger warnings for (typeof X)[number] patterns

const PRICING_FIELDS = ["price", "cost", "amount"] as const;
const STATUS_VALUES = ["active", "inactive", "pending"] as const;
const COLORS = ["red", "green", "blue"] as const;

// ✅ Should trigger: (typeof X)[number] pattern
type PricingFieldKey = (typeof PRICING_FIELDS)[number];

// ✅ Should trigger: (typeof X)[number] pattern
type StatusValue = (typeof STATUS_VALUES)[number];

// ✅ Should trigger: (typeof X)[number] pattern with nested typeof
type ColorValue = (typeof COLORS)[number];

// ✅ Should trigger: Multiple instances
type Field1 = (typeof PRICING_FIELDS)[number];
type Field2 = (typeof STATUS_VALUES)[number];

// ❌ Should NOT trigger: ValueOf helper (the preferred way)
import type { ValueOf } from "@openrouter-monorepo/type-utils";

type PricingFieldKeyPreferred = ValueOf<typeof PRICING_FIELDS>;

// ❌ Should NOT trigger: Regular array indexing (not typeof)
const arr = [1, 2, 3];
type ArrElement = (typeof arr)[number];

// ❌ Should NOT trigger: Non-parenthesized typeof
type DirectTypeof = typeof PRICING_FIELDS;

// ❌ Should NOT trigger: Other type operations
type Union = string | number;
type Indexed = { [K in keyof typeof PRICING_FIELDS]: string };

// ❌ Should NOT trigger: Property access after [number] (ValueOf can't extract properties)
const OPTIONS = [
	{ key: "a", value: 1 },
	{ key: "b", value: 2 },
] as const;
type OptionKey = (typeof OPTIONS)[number]["key"];
