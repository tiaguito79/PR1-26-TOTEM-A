import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { extractBearerToken } from "@/lib/auth.server"
import { AuthError } from "@/lib/auth.server"
import { verifyTotemDeviceToken } from "@/lib/totem-auth.server"
import { buildTotemDisplayResponse } from "@/lib/totem-display-response.server"

export const runtime = "nodejs"

export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function GET(request: Request) {
  try {
    await connectDB()

    const token = extractBearerToken(request)
    if (!token) {
      return corsJson({ error: "No autorizado" }, { status: 401 })
    }

    const device = verifyTotemDeviceToken(token)
    const payload = await buildTotemDisplayResponse(device.totemId || device.totem_id)

    if (!payload) {
      return corsJson({ error: "Tótem no encontrado" }, { status: 404 })
    }

    return corsJson(payload)
  } catch (error) {
    if (error instanceof AuthError) {
      return corsJson({ error: error.message }, { status: error.status })
    }
    console.error("Error GET totem display/me:", error)
    const msg = error instanceof Error ? error.message : "Error obteniendo datos del tótem"
    return corsJson({ error: msg }, { status: 500 })
  }
}
