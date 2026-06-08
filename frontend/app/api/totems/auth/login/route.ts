import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { AuthError } from "@/lib/auth.server"
import { authenticateTotemDevice, signTotemDeviceToken } from "@/lib/totem-auth.server"
import { getTemplateDisplayName, normalizePlantillaId } from "@/lib/totem-templates"

export const runtime = "nodejs"

export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function POST(request: Request) {
  try {
    await connectDB()

    let body: { usuario?: string; contrasena?: string; contraseña?: string }
    try {
      body = await request.json()
    } catch {
      return corsJson({ error: "Datos inválidos" }, { status: 400 })
    }

    const usuario = body.usuario
    const contrasena = body.contrasena || body.contraseña

    const totem = await authenticateTotemDevice(usuario || "", contrasena || "")
    const plantillaId = normalizePlantillaId(totem.plantilla)
    const token = signTotemDeviceToken(totem)

    return corsJson({
      message: "Login exitoso",
      token,
      totem: {
        id: totem._id.toString(),
        totem_id: totem.totem_id,
        nombre: totem.nombre,
        plantillaId,
        plantillaNombre: getTemplateDisplayName(plantillaId),
        estado: totem.estado,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return corsJson({ error: error.message }, { status: error.status })
    }
    console.error("Error POST totem auth login:", error)
    const msg = error instanceof Error ? error.message : "Error al iniciar sesión"
    return corsJson({ error: msg }, { status: 500 })
  }
}
