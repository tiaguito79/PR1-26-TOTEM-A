export type SessionAdmin = {
  id: string
  admin_id: string
  nombre: string
  correo: string
  rol: "admin" | "superadmin"
  sedeId?: string | null
  sedeName?: string | null
}

export function getSessionAdmin(): SessionAdmin | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("admin")
    if (!raw) return null
    return JSON.parse(raw) as SessionAdmin
  } catch {
    return null
  }
}

export function isSuperAdminSession(admin: SessionAdmin | null): boolean {
  return admin?.rol === "superadmin"
}
