/**
 * Error Utilities
 *
 * Shared error handling helpers.
 */

/**
 * Extract error message from unknown error type.
 * Safely handles both Error instances and other thrown values.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
