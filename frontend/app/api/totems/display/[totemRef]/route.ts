import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { getTotemAdsForDisplay, getTotemFaqForDisplay } from "@/lib/totem-display.server"
import { resolveTotemRef } from "@/lib/totem-resolve"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ totemRef: string }> }

export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await connectDB()
    const { totemRef } = await params
    const totem = await resolveTotemRef(totemRef)

    if (!totem) {
      return corsJson({ error: "Tótem no encontrado" }, { status: 404 })
    }

    const [ads, faq] = await Promise.all([
      getTotemAdsForDisplay(totemRef),
      getTotemFaqForDisplay(totemRef),
    ])

    return corsJson({
      totem: {
        id: totem._id.toString(),
        totem_id: totem.totem_id,
        nombre: totem.nombre,
        plantilla: totem.plantilla,
        estado: totem.estado,
        info_bloques: totem.info_bloques ?? [],
      },
      ads,
      faq,
    })
  } catch (error) {
    console.error("Error GET totem display:", error)
    const msg = error instanceof Error ? error.message : "Error obteniendo datos del tótem"
    return corsJson({ error: msg }, { status: 500 })
  }
}
