import Ad from "@/models/Ad"
import Faq from "@/models/Faq"
import Totem from "@/models/Totem"
import { resolveTotemRef } from "@/lib/totem-resolve"

type PopulatedContent = {
  url_contenido?: string
  tipo?: string
  nombre?: string
  descripcion?: string
}

export async function getTotemAdsForDisplay(totemRef: string) {
  const totem = await resolveTotemRef(totemRef)
  if (!totem) return []

  const adsFromCollection = await Ad.find({
    $or: [{ totemId: totem._id }, { totemId: null }],
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean()

  if (adsFromCollection.length > 0) {
    return adsFromCollection.map((ad) => ({
      title: ad.title,
      mediaUrl: ad.mediaUrl,
      type: ad.type,
      durationSeconds: ad.durationSeconds ?? 8,
      tag: "ANUNCIO",
      description: ad.title,
    }))
  }

  const populated = await Totem.findById(totem._id).populate<{
    contenido: { archivos: Array<{ slot: string; tipo: string; contentId: PopulatedContent }> }
  }>("contenido.archivos.contentId")

  const archivos = populated?.contenido?.archivos ?? []
  return archivos
    .map((archivo) => {
      const content = archivo.contentId as PopulatedContent | null
      const mediaUrl = content?.url_contenido
      if (!mediaUrl) return null
      return {
        title: archivo.slot || content?.nombre || "Contenido",
        mediaUrl,
        type: archivo.tipo === "video" || content?.tipo === "video" ? "video" : "image",
        durationSeconds: archivo.tipo === "video" ? 12 : 8,
        tag: "TOTEM",
        description: content?.descripcion || archivo.slot,
      }
    })
    .filter(Boolean)
}

export async function getTotemFaqForDisplay(totemRef: string) {
  const totem = await resolveTotemRef(totemRef)
  if (!totem) {
    return { hasFaq: false, items: [], title: "Preguntas Frecuentes" }
  }

  const faq = await Faq.findOne({
    totemId: totem._id,
    isActive: true,
  }).sort({ createdAt: -1 })

  if (!faq) {
    return { hasFaq: false, items: [], title: "Preguntas Frecuentes" }
  }

  return faq
}
