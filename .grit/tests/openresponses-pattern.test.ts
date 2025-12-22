// Test file for openresponses-pattern.grit rule
// This file should trigger warnings for OpenResponses*Schema without base reference

// Mock zod (matching the pattern the rule looks for)
const z = {
	object: () => ({}),
	union: () => ({}),
	discriminatedUnion: () => ({}),
};

// ✅ Should trigger: OpenResponses*Schema with z.object() without satisfies
export const OpenResponsesChatSchema = z.object({});

// ✅ Should trigger: OpenResponses*Schema with z.union() without satisfies
export const OpenResponsesUnionSchema = z.union([]);

// ✅ Should trigger: OpenResponses*Schema with z.discriminatedUnion() without satisfies
export const OpenResponsesDiscriminatedSchema = z.discriminatedUnion(
	"type",
	[],
);
