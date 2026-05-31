import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Redirection to /registro happens here at the middleware level, which is faster
// and avoids any rendering/compilation issues on the root index page.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/registro', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Match and intercept the root route
};
