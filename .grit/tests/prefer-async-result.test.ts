// Test file for prefer-async-result.grit rule
// This file should trigger warnings for Promise<Result<T>> patterns

// Mock Result type (matching the pattern the rule looks for)
type Result<T, E = unknown> =
	| {
			ok: true;
			data: T;
	  }
	| {
			ok: false;
			error: E;
	  };

// ✅ Should trigger: Promise<Result<T>>
async function testPromiseResult(): Promise<Result<string>> {
	return Promise.resolve({
		ok: true,
		data: "test",
	});
}

// ✅ Should trigger: Promise<Result<T, E>>
async function testPromiseResultWithError(): Promise<Result<string, Error>> {
	return Promise.resolve({
		ok: false,
		error: new Error("test"),
	});
}

// ✅ Should trigger: variable typed as Promise<Result<T>>
const promiseResult: Promise<Result<number>> = Promise.resolve({
	ok: true,
	data: 42,
});
