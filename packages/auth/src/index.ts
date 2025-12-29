// Re-export types

// Re-export client utilities
export {
  authClient,
  getSession,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  useActiveOrganization,
  useIsAuthenticated,
  useListOrganizations,
  useSession,
} from './client';
// Re-export JWT signing utilities
export {
  type CustomJwtClaims,
  type JwtPayload,
  signCustomJwt,
  verifyCustomJwt,
} from './jwt-signer';
// Re-export middleware utilities
export {
  type AuthMiddlewareOptions,
  createAuthMiddleware,
  getAuthHeaders,
  getSessionFromRequest,
} from './middleware';
export type { Auth, Session, User } from './server';
