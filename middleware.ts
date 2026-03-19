import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // No-auth mode: redirect /history to home
  if (request.nextUrl.pathname.startsWith("/history")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
