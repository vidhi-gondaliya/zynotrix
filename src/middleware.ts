import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn  = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage       = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isWorkspacePage  = pathname.startsWith("/create-workspace");
  const isApiRoute       = pathname.startsWith("/api");
  const isPortal         = pathname.startsWith("/portal");
  const isRoot           = pathname === "/";

  // Always allow API routes and public portal
  if (isApiRoute || isPortal) return NextResponse.next();

  // Root redirect
  if (isRoot) {
    return NextResponse.redirect(new URL(isLoggedIn ? "/dashboard" : "/login", req.url));
  }

  // Not logged in → login page
  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in + auth page → dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Logged in but no org → create-workspace (unless already there)
  if (isLoggedIn && !isWorkspacePage) {
    const orgId = (req.auth as { user?: { organizationId?: string | null } })?.user?.organizationId;
    if (!orgId) {
      return NextResponse.redirect(new URL("/create-workspace", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
