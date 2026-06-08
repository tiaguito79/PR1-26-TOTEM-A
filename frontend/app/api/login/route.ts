import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/mongodb"
import Admin from "@/models/Admin"
import { AUTH_COOKIE_NAME } from "@/lib/auth.constants"
import { authCookieOptions } from "@/lib/auth.server"
import { getSedeName } from "@/lib/sedes"

export const runtime = "nodejs"

const MAX_INTENTOS = 5
const TIEMPO_BLOQUEO_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json(
      { message: "Falta JWT_SECRET en .env.local" },
      { status: 500 }
    )
  }

  let body: { usuario?: string; contrasena?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 })
  }

  const { usuario, contrasena } = body

  if (!usuario || !contrasena) {
    return NextResponse.json(
      { message: "Usuario y contraseña son requeridos." },
      { status: 400 }
    )
  }

  try {
    await connectDB()

    const admin = await Admin.findOne({
      $or: [
        { admin_id: usuario.trim() },
        { correo_electronico: usuario.trim().toLowerCase() },
      ],
    })

    if (!admin) {
      return NextResponse.json(
        { message: "Credenciales inválidas." },
        { status: 401 }
      )
    }

    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const minutosRestantes = Math.ceil(
        (admin.lockUntil.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          message: `Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutosRestantes} minuto(s).`,
        },
        { status: 423 }
      )
    }

    const stored = admin.contraseña as string
    if (!stored?.startsWith("$2")) {
      return NextResponse.json(
        {
          message:
            "La contraseña del administrador no está cifrada. Contacta al encargado del sistema.",
        },
        { status: 500 }
      )
    }

    const contrasenaValida = await bcrypt.compare(contrasena, stored)

    if (!contrasenaValida) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1

      if (admin.failedLoginAttempts >= MAX_INTENTOS) {
        admin.lockUntil = new Date(Date.now() + TIEMPO_BLOQUEO_MS)
        await admin.save()
        return NextResponse.json(
          {
            message:
              "Cuenta bloqueada por demasiados intentos fallidos. Intenta nuevamente en 15 minutos.",
          },
          { status: 423 }
        )
      }

      await admin.save()
      return NextResponse.json(
        {
          message: `Credenciales inválidas. Intentos restantes: ${MAX_INTENTOS - admin.failedLoginAttempts}.`,
        },
        { status: 401 }
      )
    }

    admin.failedLoginAttempts = 0
    admin.lockUntil = null
    await admin.save()

    const token = jwt.sign(
      {
        adminId: admin._id,
        admin_id: admin.admin_id,
        rol: admin.rol,
        sedeId: admin.sedeId || null,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    )

    const expiresIn = process.env.JWT_EXPIRES_IN || "2h"
    const maxAgeSeconds = expiresIn.endsWith("h")
      ? parseInt(expiresIn, 10) * 60 * 60
      : 2 * 60 * 60

    const response = NextResponse.json({
      message: "Login exitoso.",
      token,
      admin: {
        id: admin._id,
        admin_id: admin.admin_id,
        nombre: admin.nombre,
        correo: admin.correo_electronico,
        rol: admin.rol,
        sedeId: admin.sedeId || null,
        sedeName: admin.sedeId ? getSedeName(admin.sedeId) : null,
      },
    })

    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions(maxAgeSeconds))
    return response
  } catch (error) {
    console.error("Error en login:", error)
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.includes("whitelist") || msg.includes("Server selection timed out")) {
      return NextResponse.json(
        {
          message:
            "MongoDB Atlas no permite tu IP. En cloud.mongodb.com → Network Access → Add IP Address → Allow Access from Anywhere (o agrega tu IP actual).",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Error interno del servidor." },
      { status: 500 }
    )
  }
}
