// Test file for prefer-nullish-over-optional-nullable.grit rule
// This file should trigger warnings for .nullable().optional() or .optional().nullable() patterns

// Mock zod (matching the pattern the rule looks for)
const z = {
	string: () => ({
		nullable: () => ({
			optional: () => ({}),
		}),
		optional: () => ({
			nullable: () => ({}),
		}),
		default: () => ({
			nullable: () => ({
				optional: () => ({}),
			}),
			optional: () => ({
				nullable: () => ({}),
			}),
		}),
	}),
};

// ✅ Should trigger: z.string().nullable().optional()
const schema1 = z.string().nullable().optional();

// ✅ Should trigger: z.string().optional().nullable()
const schema2 = z.string().optional().nullable();

// ✅ Should trigger: z.string().default('').nullable().optional()
const schema3 = z.string().default("").nullable().optional();

// ✅ Should trigger: z.string().default('').optional().nullable()
const schema4 = z.string().default("").optional().nullable();
