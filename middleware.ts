import { auth } from "@/lib/auth.config"
import { NextResponse } from "next/server"

function getDashboardPath(role: string): string {
  switch (role) {
    case "FACULTY":
      return "/faculty/dashboard"
    case "STUDENT":
      return "/student"
    case "HOD":
      return "/hod"
    case "ADMIN":
      return "/admin"
    default:
      return "/login"
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isRoot = pathname === "/"
  const isAuthPage = pathname === "/login"
  const isErrorPage = pathname === "/error"
  const role = session?.user?.role

  // Authenticated user on login page → redirect to dashboard
  if (role && isAuthPage) {
    const dest = getDashboardPath(role)
    if (dest === "/login") {
      return NextResponse.redirect(new URL("/error?code=unauthorized", req.nextUrl.origin))
    }
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin))
  }

  // Unauthenticated user on protected page → redirect to login
  if (!role && !isAuthPage && !isErrorPage && !isRoot) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin))
  }

  // Unauthenticated user on root → redirect to login
  if (!role && isRoot) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin))
  }

  // Authenticated user on root → redirect to dashboard
  if (role && isRoot) {
    const dest = getDashboardPath(role)
    if (dest === "/login") {
      return NextResponse.redirect(new URL("/error?code=unauthorized", req.nextUrl.origin))
    }
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin))
  }

  // Role-based route access
  if (role) {
    if (pathname.startsWith("/faculty") && !["FACULTY", "HOD", "ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/error?code=unauthorized", req.nextUrl.origin))
    }

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/error?code=unauthorized", req.nextUrl.origin))
    }

    if (pathname.startsWith("/hod") && !["HOD", "ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/error?code=unauthorized", req.nextUrl.origin))
    }

    if (pathname.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL("/error?code=unauthorized", req.nextUrl.origin))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|_next/data|__nextjs.*|favicon.ico).*)"],
}
