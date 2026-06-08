import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import {
  getTotemAdsForDisplay,
  getTotemFaqForDisplay,
  getTotemMediaForDisplay,
} from "@/lib/totem-display.server"
import { getTemplateDisplayName, normalizePlantillaId } from "@/lib/totem-templates"
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

    const plantillaId = normalizePlantillaId(totem.plantilla)

    const [ads, faq, media] = await Promise.all([
      getTotemAdsForDisplay(totemRef),
      getTotemFaqForDisplay(totemRef),
      getTotemMediaForDisplay(totemRef),
    ])

    return corsJson({
      totem: {
        id: totem._id.toString(),
        totem_id: totem.totem_id,
        nombre: totem.nombre,
        plantilla: totem.plantilla,
        plantillaId,
        plantillaNombre: getTemplateDisplayName(plantillaId),
        estado: totem.estado,
        info_bloques: totem.info_bloques ?? [],
      },
      media: {
        images: media.images,
        videos: media.videos,
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
