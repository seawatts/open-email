import { type NextRequest, NextResponse } from 'next/server';

// Define routes that require authentication
const protectedRoutes = ['/app'];
const publicOnlyRoutes = ['/sign-in', '/sign-up'];

function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get session from Better Auth by checking the session cookie
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;

  // Fetch session from the auth API
  let session = null;
  if (sessionToken) {
    try {
      const sessionResponse = await fetch(
        new URL('/api/auth/get-session', request.url),
        {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        },
      );

      if (sessionResponse.ok) {
        session = await sessionResponse.json();
      }
    } catch {
      // Session fetch failed, treat as unauthenticated
    }
  }

  const isAuthenticated = !!session?.user;
  const isProtectedRoute = matchesPath(pathname, protectedRoutes);
  const isPublicOnlyRoute = matchesPath(pathname, publicOnlyRoutes);

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users from public-only routes (sign-in, sign-up)
  if (isPublicOnlyRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  // Check for organization on protected routes
  if (isProtectedRoute && isAuthenticated) {
    const hasOrganization = !!session?.session?.activeOrganizationId;

    if (!hasOrganization && !pathname.startsWith('/app/onboarding')) {
      const url = request.nextUrl.clone();
      url.pathname = '/app/onboarding';
      const redirectTo = request.nextUrl.searchParams.get('redirectTo');
      const source = request.nextUrl.searchParams.get('source');

      if (redirectTo) {
        url.searchParams.set('redirectTo', redirectTo);
      }

      if (source) {
        url.searchParams.set('source', source);
      }

      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/app(.*)',
  ],
};
