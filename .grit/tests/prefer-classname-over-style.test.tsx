// Test file for prefer-classname-over-style.grit rule
// This file should trigger warnings for inline style attributes

// ✅ Should trigger: Self-closing tag with style attribute
const SelfClosingWithStyle = () => (
	<div
		style={{
			padding: "10px",
		}}
	/>
);

// ✅ Should trigger: Tag with children and style attribute
const TagWithStyleAndChildren = () => (
	<div
		style={{
			margin: "20px",
		}}
	>
		<span>Hello</span>
	</div>
);

// ✅ Should trigger: Multiple style properties
const MultipleStyles = () => (
	<section
		style={{
			color: "red",
			backgroundColor: "blue",
		}}
	>
		Content
	</section>
);

// ✅ Should trigger: Nested elements with style
const NestedWithStyle = () => (
	<div className="wrapper">
		<span
			style={{
				fontWeight: "bold",
			}}
		>
			Bold text
		</span>
	</div>
);

// ❌ Should NOT trigger: Using className (the preferred way)
const WithClassName = () => <div className="p-2.5">Good</div>;

// ❌ Should NOT trigger: No style attribute
const NoStyle = () => <div>Plain content</div>;

// ❌ Should NOT trigger: Using both className and style (style should still warn)
// const BothAttributes = () => <div className="base" style={{ custom: 'value' }} />;
