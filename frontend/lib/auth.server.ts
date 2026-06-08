import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { AUTH_COOKIE_NAME } from "@/lib/auth.constants"
import { buildTotemSedeFilter, sedeMatchesCampusId } from "@/lib/sedes"

export type AuthAdmin = {
  adminId: string
  admin_id: string
  rol: "admin" | "superadmin"
  sedeId?: string | null
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new AuthError("JWT no configurado en el servidor", 500)
  }
  return secret
}

export function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization")
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null
}

export async function getTokenFromRequest(request: Request) {
  const bearer = extractBearerToken(request)
  if (bearer) return bearer

  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null
}

export function verifyToken(token: string): AuthAdmin {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthAdmin
    return decoded
  } catch {
    throw new AuthError("Sesión inválida o expirada")
  }
}

export async function requireAuth(request: Request): Promise<AuthAdmin> {
  const token = await getTokenFromRequest(request)
  if (!token) {
    throw new AuthError("No autorizado")
  }
  return verifyToken(token)
}

export function isSuperAdmin(admin: AuthAdmin): boolean {
  return admin.rol === "superadmin"
}

export function requireSuperAdmin(admin: AuthAdmin) {
  if (!isSuperAdmin(admin)) {
    throw new AuthError("No tienes permisos de super administrador", 403)
  }
}

export function assertCanAccessSede(admin: AuthAdmin, campusOrSedeId: string) {
  if (isSuperAdmin(admin)) return
  if (!admin.sedeId || !sedeMatchesCampusId(admin.sedeId, campusOrSedeId)) {
    throw new AuthError("No tienes acceso a esta sede", 403)
  }
}

export function assertCanAccessTotem(admin: AuthAdmin, campusId: string) {
  if (isSuperAdmin(admin)) return
  if (!admin.sedeId || !sedeMatchesCampusId(admin.sedeId, campusId)) {
    throw new AuthError("No tienes acceso a este tótem", 403)
  }
}

export function getTotemQueryFilter(admin: AuthAdmin): Record<string, unknown> {
  if (isSuperAdmin(admin)) return {}
  if (!admin.sedeId) {
    throw new AuthError("Tu cuenta no tiene una sede asignada", 403)
  }
  return buildTotemSedeFilter(admin.sedeId)
}

export function authCookieOptions(maxAgeSeconds = 2 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}
