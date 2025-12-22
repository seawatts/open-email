// Test file for no-negated-result-checks.grit rule
// This file should trigger warnings for negated result checks

// Mock type guard functions (matching the pattern the rule looks for)
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

// ✅ Should trigger: !isErr() should be isOk()
function testNegatedIsErr(result: unknown) {
	if (!isErr(result)) {
		// Should use isOk() instead
		return result;
	}
}

// ✅ Should trigger: !isOk() should be isErr()
function testNegatedIsOk(result: unknown) {
	if (!isOk(result)) {
		// Should use isErr() instead
		return result;
	}
}

// ✅ Should trigger: negated in ternary
const result: unknown = {
	data: "test",
};
const value = !isErr(result)
	? (
			result as {
				data: string;
			}
		).data
	: null;

// ✅ Should trigger: negated in logical AND
const isValid =
	!isOk(result) &&
	(
		result as {
			error: unknown;
		}
	).error;
