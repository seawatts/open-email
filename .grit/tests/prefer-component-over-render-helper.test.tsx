// Test file for prefer-component-over-render-helper.grit rule
// This file should trigger warnings for render helper functions in JSX

// ✅ Should trigger: {renderSomething()}
function TestComponent() {
	function renderSomething() {
		return <div>Something</div>;
	}
	return <div>{renderSomething()}</div>;
}

// ✅ Should trigger: {renderMyComponent()}
function AnotherComponent() {
	function renderMyComponent() {
		return <span>My Component</span>;
	}
	return <div>{renderMyComponent()}</div>;
}

// ✅ Should trigger: {renderDeprecationBadge()}
function YetAnotherComponent() {
	function renderDeprecationBadge() {
		return <div>Deprecated</div>;
	}
	return <div>{renderDeprecationBadge()}</div>;
}
