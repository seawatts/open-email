// Test file for prefer-assert-over-expect-result.grit rule
// This file should trigger warnings for expect(isErr/isOk).toBe(true) patterns

// Mock functions (matching the pattern the rule looks for)
function isErr(result: unknown): result is {
	error: unknown;
} {
	return typeof result === "object" && result !== null && "error" in result;
}

function isOk(result: unknown): result is {
	data: unknown;
} {
	return typeof result === "object" && result !== null && "data" in result;
}

// Mock expect function that returns object with toBe method
declare const expect: (value: boolean) => {
	toBe: (expected: boolean) => boolean;
};

// ✅ Should trigger: expect(isErr(result)).toBe(true)
const result: unknown = {
	error: "test",
};
expect(isErr(result)).toBe(true);

// ✅ Should trigger: expect(isOk(result)).toBe(true)
const okResult: unknown = {
	data: "test",
};
expect(isOk(okResult)).toBe(true);
