// Test file for no-iife.grit rule
// This file should trigger warnings for IIFE patterns

// ✅ Should trigger: (function() { ... })()
(() => {
	const localVar = "test";
	console.log(localVar);
})();

// ✅ Should trigger: (function(args) { ... })()
((arg: string) => {
	console.log(arg);
})("test");

// ✅ Should trigger: (async function() { ... })()
(async () => {
	await someAsyncOp();
})();

// ✅ Should trigger: (() => { ... })()
(() => {
	const localVar = "test";
	console.log(localVar);
})();

// ✅ Should trigger: ((args) => { ... })()
((arg: string) => {
	console.log(arg);
})("test");

// ✅ Should trigger: (async () => { ... })()
(async () => {
	await someAsyncOp();
})();

function someAsyncOp() {
	return Promise.resolve("done");
}
