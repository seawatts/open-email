// Test file for use-named-arguments.grit rule
// This file should trigger warnings for functions with >3 parameters

// ✅ Should trigger: function with 4 parameters
function testFourParams(a: string, b: number, c: boolean, d: string) {
	return `${a}${b}${c}${d}`;
}

// ✅ Should trigger: async function with 5 parameters
async function testFiveParams(
	a: string,
	b: number,
	c: boolean,
	d: string,
	e: number,
) {
	return `${a}${b}${c}${d}${e}`;
}

// ✅ Should trigger: arrow function with 4 parameters
const arrowFourParams = (a: string, b: number, c: boolean, d: string) => {
	return `${a}${b}${c}${d}`;
};

// ✅ Should trigger: function expression with 4 parameters
const funcExpr = (a: string, b: number, c: boolean, d: string): string =>
	`${a}${b}${c}${d}`;

// ✅ Should trigger: function with return type and 4 parameters
function testWithReturnType(
	a: string,
	b: number,
	c: boolean,
	d: string,
): string {
	return `${a}${b}${c}${d}`;
}
