// Test file for no-promise-race.grit rule
// This file should trigger errors for Promise.race usage

// ✅ Should trigger: Promise.race() call
async function testPromiseRace() {
	const winner = await Promise.race([promise1, promise2]);
	return winner;
}

// ✅ Should trigger: Promise.race() with timeout pattern
async function testPromiseRaceWithTimeout() {
	const timeout = new Promise((_, reject) =>
		setTimeout(() => reject(new Error("Timeout")), 1000),
	);
	return await Promise.race([operation(), timeout]);
}

// ✅ Should trigger: Promise.race() in variable assignment
const raceResult = Promise.race([p1, p2, p3]);

// ✅ Should trigger: Promise.race() in return statement
function getFirstResult() {
	return Promise.race([asyncOp1(), asyncOp2()]);
}

function promise1() {
	return Promise.resolve("result1");
}

function promise2() {
	return Promise.resolve("result2");
}

function p1() {
	return Promise.resolve("p1");
}

function p2() {
	return Promise.resolve("p2");
}

function p3() {
	return Promise.resolve("p3");
}

function operation() {
	return Promise.resolve("operation");
}

function asyncOp1() {
	return Promise.resolve("op1");
}

function asyncOp2() {
	return Promise.resolve("op2");
}
