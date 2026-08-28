import { NextRequest, NextResponse } from "next/server";
import { getSession, COOKIE_NAME } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protect all /dashboard routes ──────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const user = await getSession(req.cookies);
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      // Clear the cookie on the way out. Previously only the "present but
      // invalid" branch did this; doing it unconditionally is a no-op when
      // there was no cookie, and removes the need for two branches.
      res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
      return res;
    }

    // Pass through — user is authenticated
    return NextResponse.next();
  }

  // ── Redirect already-authenticated users away from login ────────────────
  if (pathname === "/login") {
    if (await getSession(req.cookies)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
