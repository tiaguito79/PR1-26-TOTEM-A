import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { AUTH_COOKIE_NAME } from "@/lib/auth.constants"

const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/editor-plantillas", "/administradores"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (!isProtectedPage) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const jwtSecret = process.env.JWT_SECRET?.trim()

  if (!token || !jwtSecret) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete(AUTH_COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor-plantillas/:path*", "/administradores/:path*"],
}
