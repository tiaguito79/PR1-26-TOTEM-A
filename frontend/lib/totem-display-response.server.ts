import {
  getTotemAdsForDisplay,
  getTotemFaqForDisplay,
  getTotemMediaForDisplay,
} from "@/lib/totem-display.server"
import { getTemplateDisplayName, normalizePlantillaId } from "@/lib/totem-templates"
import { resolveTotemRef } from "@/lib/totem-resolve"

export async function buildTotemDisplayResponse(totemRef: string) {
  const totem = await resolveTotemRef(totemRef)
  if (!totem) return null

  const plantillaId = normalizePlantillaId(totem.plantilla)

  const [ads, faq, media] = await Promise.all([
    getTotemAdsForDisplay(totemRef),
    getTotemFaqForDisplay(totemRef),
    getTotemMediaForDisplay(totemRef),
  ])

  return {
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
  }
}
