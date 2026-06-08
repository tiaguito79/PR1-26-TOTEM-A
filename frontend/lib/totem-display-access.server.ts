import { AuthError, assertCanAccessTotem, extractBearerToken, verifyToken } from "@/lib/auth.server"
import {
  assertTotemDeviceCanAccessRef,
  verifyTotemDeviceToken,
  type AuthTotemDevice,
} from "@/lib/totem-auth.server"
import { resolveTotemRef } from "@/lib/totem-resolve"

type DisplayAccess =
  | { kind: "totem_device"; device: AuthTotemDevice }
  | { kind: "admin" }

export async function authorizeTotemDisplayAccess(
  request: Request,
  totemRef: string
): Promise<DisplayAccess> {
  const token = extractBearerToken(request)
  if (!token) {
    throw new AuthError("No autorizado")
  }

  try {
    const device = verifyTotemDeviceToken(token)
    assertTotemDeviceCanAccessRef(device, totemRef)
    return { kind: "totem_device", device }
  } catch {
    // Puede ser token de administrador; se valida abajo.
  }

  const admin = verifyToken(token)
  const totem = await resolveTotemRef(totemRef)
  if (!totem) {
    throw new AuthError("Tótem no encontrado", 404)
  }
  assertCanAccessTotem(admin, totem.campus_id)
  return { kind: "admin" }
}
