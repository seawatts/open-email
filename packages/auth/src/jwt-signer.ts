import jwt from 'jsonwebtoken';

import { env } from './env';

export interface JwtPayload {
  userId: string;
  orgId?: string | null;
  sessionId: string;
  template: 'cli' | 'supabase';
}

export interface CustomJwtClaims {
  sub: string;
  org_id: string | null;
  session_id: string;
  template: 'cli' | 'supabase';
  iat: number;
  exp: number;
}

export function signCustomJwt(payload: JwtPayload): string {
  const claims: CustomJwtClaims = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    iat: Math.floor(Date.now() / 1000),
    org_id: payload.orgId ?? null,
    session_id: payload.sessionId,
    sub: payload.userId,
    template: payload.template,
  };

  return jwt.sign(claims, env.BETTER_AUTH_SECRET, { algorithm: 'HS256' });
}

export function verifyCustomJwt(token: string): CustomJwtClaims | null {
  try {
    return jwt.verify(token, env.BETTER_AUTH_SECRET, {
      algorithms: ['HS256'],
    }) as CustomJwtClaims;
  } catch {
    return null;
  }
}
