import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import Totem from "@/models/Totem"
import { AuthError } from "@/lib/auth.server"

export type AuthTotemDevice = {
  type: "totem_device"
  totemId: string
  totem_id: string
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new AuthError("JWT no configurado en el servidor", 500)
  }
  return secret
}

export function signTotemDeviceToken(totem: {
  _id: { toString(): string }
  totem_id: string
}) {
  const payload: AuthTotemDevice = {
    type: "totem_device",
    totemId: totem._id.toString(),
    totem_id: totem.totem_id,
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_TOTEM_EXPIRES_IN || "30d",
  })
}

export function verifyTotemDeviceToken(token: string): AuthTotemDevice {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthTotemDevice
    if (decoded.type !== "totem_device" || !decoded.totemId || !decoded.totem_id) {
      throw new AuthError("Sesión de tótem inválida")
    }
    return decoded
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new AuthError("Sesión de tótem inválida o expirada")
  }
}

async function passwordsMatch(stored: string, provided: string) {
  if (!stored) return false
  if (stored.startsWith("$2")) {
    return bcrypt.compare(provided, stored)
  }
  return stored === provided
}

export async function authenticateTotemDevice(usuario: string, contrasena: string) {
  const username = usuario.trim()
  if (!username || !contrasena) {
    throw new AuthError("Usuario y contraseña son requeridos", 400)
  }

  const totem = await Totem.findOne({ "credenciales.usuario": username })
  if (!totem) {
    throw new AuthError("Credenciales inválidas")
  }

  const storedPassword = totem.credenciales?.contraseña || ""
  const valid = await passwordsMatch(storedPassword, contrasena)
  if (!valid) {
    throw new AuthError("Credenciales inválidas")
  }

  if (totem.estado === "Inactivo") {
    throw new AuthError("Este tótem está inactivo. Contacta al administrador.", 403)
  }

  if (totem.estado === "En Mantenimiento") {
    throw new AuthError("Este tótem está en mantenimiento. Intenta más tarde.", 403)
  }

  return totem
}

export function assertTotemDeviceCanAccessRef(device: AuthTotemDevice, totemRef: string) {
  const ref = totemRef.trim()
  if (ref !== device.totem_id && ref !== device.totemId) {
    throw new AuthError("No tienes acceso a este tótem", 403)
  }
}
