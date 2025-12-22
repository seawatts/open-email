// Test file for openai-responses-pattern.grit rule
// This file should trigger warnings for OpenAIResponses*Schema without satisfies clause

// Mock zod (matching the pattern the rule looks for)
const z = {
	object: () => ({}),
};

// ✅ Should trigger: OpenAIResponses*Schema without satisfies
export const OpenAIResponsesChatSchema = z.object({});

// ✅ Should trigger: Another OpenAIResponses schema without satisfies
export const OpenAIResponsesCompletionSchema = z.object({});
