// Test file for prefer-wrap-over-try-catch.grit rule
// This file should trigger warnings for all try/catch blocks

// ✅ Should trigger: try/catch with error binding
async function testTryCatchWithError() {
  try {
    const result = await someOperation();
    return result;
  } catch (error) {
    console.error(error);
  }
}

// ✅ Should trigger: try/catch without error binding
async function testTryCatchWithoutError() {
  try {
    const result = await someOperation();
    return result;
  } catch {
    console.error('Error occurred');
  }
}

// ✅ Should trigger: nested try/catch (outer)
async function testNestedTryCatch() {
  try {
    try {
      await innerOperation();
    } catch (innerError) {
      console.error(innerError);
    }
  } catch (outerError) {
    console.error(outerError);
  }
}

// ✅ Should trigger: try/catch in arrow function
const arrowFunctionWithTryCatch = async () => {
  try {
    await someOperation();
  } catch (error) {
    handleError(error);
  }
};

// ✅ Should trigger: try/catch with finally
async function testTryCatchFinally() {
  try {
    await someOperation();
  } catch (error) {
    handleError(error);
  } finally {
    cleanup();
  }
}

function someOperation() {
  return Promise.resolve('test');
}

function innerOperation() {
  return Promise.resolve('test');
}

function handleError(error: unknown) {
  // Handle error
}

function cleanup() {
  // Cleanup
}
