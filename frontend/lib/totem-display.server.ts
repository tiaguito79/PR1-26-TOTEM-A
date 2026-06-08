import Ad from "@/models/Ad"
import Content from "@/models/Content"
import Faq from "@/models/Faq"
import Totem from "@/models/Totem"
import { resolveTotemRef } from "@/lib/totem-resolve"
import {
  getTemplateMediaRequirements,
  normalizePlantillaId,
} from "@/lib/totem-templates"

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

function parseImageSlotIndex(slot: string | undefined) {
  const match = slot?.match(/Imagen Carrusel\s*(\d+)/i)
  return match ? Number(match[1]) - 1 : -1
}

function parseVideoSlotIndex(slot: string | undefined) {
  const match = slot?.match(/Video Principal\s*(\d+)/i)
  return match ? Number(match[1]) - 1 : -1
}

export async function getTotemMediaForDisplay(totemRef: string) {
  const totem = await resolveTotemRef(totemRef)
  if (!totem) {
    return {
      plantillaId: "clasica" as const,
      images: [] as Array<string | null>,
      videos: [] as Array<string | null>,
    }
  }

  const plantillaId = normalizePlantillaId(totem.plantilla)
  const { images: imageCount, videos: videoCount } =
    getTemplateMediaRequirements(plantillaId)

  const images: Array<string | null> = Array.from({ length: imageCount }, () => null)
  const videos: Array<string | null> = Array.from({ length: videoCount }, () => null)

  const populated = await Totem.findById(totem._id).populate<{
    contenido: { archivos: Array<{ slot: string; tipo: string; contentId: PopulatedContent }> }
  }>("contenido.archivos.contentId")

  const archivos = populated?.contenido?.archivos ?? []

  for (const archivo of archivos) {
    const content = archivo.contentId as PopulatedContent | null
    const mediaUrl = content?.url_contenido
    if (!mediaUrl) continue

    const imageIndex = parseImageSlotIndex(archivo.slot)
    if (imageIndex >= 0 && imageIndex < images.length) {
      images[imageIndex] = mediaUrl
      continue
    }

    const videoIndex = parseVideoSlotIndex(archivo.slot)
    if (videoIndex >= 0 && videoIndex < videos.length) {
      videos[videoIndex] = mediaUrl
      continue
    }

    const isVideo =
      archivo.tipo === "video" || content?.tipo === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)

    if (isVideo) {
      const emptyVideo = videos.findIndex((v) => !v)
      if (emptyVideo >= 0) videos[emptyVideo] = mediaUrl
    } else {
      const emptyImage = images.findIndex((v) => !v)
      if (emptyImage >= 0) images[emptyImage] = mediaUrl
    }
  }

  return { plantillaId, images, videos }
}

export async function getTotemFaqForDisplay(totemRef: string) {
  const totem = await resolveTotemRef(totemRef)
  if (!totem) {
    return { hasFaq: false, items: [], title: "Preguntas Frecuentes" }
  }

  const faq = await Faq.findOne({
    totemId: totem._id,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean()

  if (!faq) {
    return { hasFaq: false, items: [], title: "Preguntas Frecuentes" }
  }

  return {
    hasFaq: true,
    title: faq.title,
    items: faq.items ?? [],
  }
}
