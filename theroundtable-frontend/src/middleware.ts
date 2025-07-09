import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/api/health'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken = request.cookies.get('auth_token');
  
  if (!authToken) {
    // User is not authenticated, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If we have a token, proceed (auth validation will happen in component)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
