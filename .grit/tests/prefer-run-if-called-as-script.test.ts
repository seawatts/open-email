// Test file for prefer-run-if-called-as-script.grit rule
// This file should trigger warnings for main().catch() patterns

async function main() {
	// Script logic
}

// ✅ Should trigger: main().catch(...)
main().catch((error) => {
	process.stderr.write(
		`❌ Error: ${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exit(1);
});
