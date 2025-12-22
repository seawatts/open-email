// Test file for openai-naming-convention.grit rule
// This file should trigger warnings for schema constants that don't end with "Schema"

// Mock zod (matching the pattern the rule looks for)
const z = {
	object: () => ({}),
	discriminatedUnion: () => ({}),
	union: () => ({}),
	array: () => ({}),
};

// ✅ Should trigger: OpenAI schema without Schema suffix
export const OpenAIResponse = z.object({});

// ✅ Should trigger: Open schema (not OpenAI) without Schema suffix
export const OpenResponse = z.object({});

// ✅ Should trigger: OpenAI discriminatedUnion without Schema suffix
export const OpenAIChoice = z.discriminatedUnion("type", []);

// ✅ Should trigger: Open union without Schema suffix
export const OpenUnion = z.union([]);
