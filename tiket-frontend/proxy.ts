import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOKEN_KEY } from "@/constants/config";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_KEY)?.value;
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  // Protect the /home route
  if (
    pathname.startsWith("/home") ||
    pathname.startsWith("/create") ||
    pathname.startsWith("/edit")
  ) {
    if (!token) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
  }

  // Redirect /edit/[eventId] to /edit/[eventId]/overview
  const editMatch = pathname.match(/^\/edit\/([^\/]+)\/?$/);
  if (editMatch) {
    const eventId = editMatch[1];
    return NextResponse.redirect(
      new URL(`/edit/${eventId}/overview`, request.url)
    );
  }

  // Redirect signed-in users away from /signin
  if (pathname.startsWith("/signin")) {
    if (token) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home", "/signin", "/", "/create", "/edit/:path*"],
};
