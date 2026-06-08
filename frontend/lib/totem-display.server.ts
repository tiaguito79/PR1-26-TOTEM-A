import mongoose from "mongoose"
import Ad from "@/models/Ad"
import Content from "@/models/Content"
import Faq from "@/models/Faq"
import Totem from "@/models/Totem"
import { loadFaqKnowledgeForDisplay } from "@/lib/faq-document.server"
import { ensureTotemFaqFromPdf } from "@/lib/totem-content.server"
import { resolveTotemRef } from "@/lib/totem-resolve"
import {
  getTemplateMediaRequirements,
  normalizePlantillaId,
} from "@/lib/totem-templates"

type TotemArchivo = {
  slot?: string
  tipo?: string
  contentId?: mongoose.Types.ObjectId | string
}

type ContentRecord = {
  url_contenido?: string
  tipo?: string
  nombre?: string
  descripcion?: string
}

async function getTotemArchivosWithContent(totemId: mongoose.Types.ObjectId) {
  const totem = await Totem.findById(totemId).lean()
  const archivos = (totem?.contenido?.archivos ?? []) as TotemArchivo[]

  const contentIds = archivos
    .map((archivo) => archivo.contentId)
    .filter((id): id is mongoose.Types.ObjectId | string => Boolean(id))

  if (contentIds.length === 0) {
    return { archivos, contentById: new Map<string, ContentRecord>() }
  }

  const contents = await Content.find({ _id: { $in: contentIds } }).lean()
  const contentById = new Map<string, ContentRecord>(
    contents.map((content) => [content._id.toString(), content as ContentRecord])
  )

  return { archivos, contentById }
}

function getContentForArchivo(
  archivo: TotemArchivo,
  contentById: Map<string, ContentRecord>
) {
  const id = archivo.contentId?.toString()
  return id ? contentById.get(id) ?? null : null
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

  const { archivos, contentById } = await getTotemArchivosWithContent(totem._id)

  return archivos
    .map((archivo) => {
      const content = getContentForArchivo(archivo, contentById)
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

  const { archivos, contentById } = await getTotemArchivosWithContent(totem._id)

  for (const archivo of archivos) {
    const content = getContentForArchivo(archivo, contentById)
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
    return {
      hasFaq: false,
      items: [],
      generalInfo: [],
      rules: [],
      paragraphs: [],
      title: "Preguntas Frecuentes",
      pdfUrl: null,
      pdfName: null,
    }
  }

  let faq = await Faq.findOne({
    totemId: totem._id,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean()

  if (!faq && totem.faqPdf?.url && totem.faqPdf?.publicId) {
    const repaired = await ensureTotemFaqFromPdf({
      _id: totem._id,
      nombre: totem.nombre,
      faqPdf: totem.faqPdf,
    })
    if (repaired) {
      faq = await Faq.findById(repaired._id).lean()
    }
  }

  if (!faq) {
    return {
      hasFaq: false,
      items: [],
      generalInfo: [],
      rules: [],
      paragraphs: [],
      title: "Preguntas Frecuentes",
      pdfUrl: null,
      pdfName: null,
      hasPdf: false,
      extractedOk: false,
    }
  }

  return loadFaqKnowledgeForDisplay(faq)
}
