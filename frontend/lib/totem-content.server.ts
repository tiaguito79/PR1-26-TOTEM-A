import mongoose from "mongoose"
import Content from "@/models/Content"
import DocumentModel from "@/models/Document"
import Faq from "@/models/Faq"
import { deleteCloudinaryAsset, fetchCloudinaryPdfBuffer } from "@/lib/cloudinary-server"
import {
  buildGridFsFileUrl,
  eliminarArchivoGridFS,
  eliminarPdfGridFS,
  leerPdfGridFS,
} from "@/lib/gridfs"
import {
  extractTextFromPdfBuffer,
  parseTotemKnowledgeDocument,
} from "@/lib/pdf-service"

export type UploadedArchivoInput = {
  slot: string
  tipo: "imagen" | "video"
  url: string
  publicId: string
}

export type UploadedPdfInput = {
  name: string
  extractedText?: string
  pdfFileId?: string
  pdfUrl?: string
  url?: string
  publicId?: string
}

export type FaqProcessResult = {
  document: InstanceType<typeof DocumentModel>
  faq: InstanceType<typeof Faq>
  itemsCount: number
  extractedOk: boolean
  warning?: string
}

function isGridFaqPdf(pdf: UploadedPdfInput) {
  return Boolean(pdf.pdfFileId)
}

function isCloudinaryFaqPdf(pdf: UploadedPdfInput) {
  return Boolean(pdf.url && pdf.publicId && !pdf.pdfFileId)
}

export async function createContentsFromCloudinary(
  archivos: UploadedArchivoInput[],
  totemNombre: string
) {
  const saved = []

  for (const archivo of archivos) {
    const content = await Content.create({
      content_id: `CONTENT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      tipo: archivo.tipo,
      nombre: archivo.slot,
      cloudinaryPublicId: archivo.publicId,
      url_contenido: archivo.url,
      descripcion: `${archivo.slot} del tótem ${totemNombre}`,
    })

    saved.push({
      slot: archivo.slot,
      tipo: archivo.tipo,
      contentId: content._id,
    })
  }

  return saved
}

export async function deleteContentRecord(content: {
  fileId?: mongoose.Types.ObjectId | null
  cloudinaryPublicId?: string | null
  tipo?: string
}) {
  if (content.cloudinaryPublicId) {
    const resourceType = content.tipo === "video" ? "video" : "image"
    try {
      await deleteCloudinaryAsset(content.cloudinaryPublicId, resourceType)
    } catch (error) {
      console.error("Error eliminando asset Cloudinary:", error)
    }
  }

  if (content.fileId) {
    try {
      await eliminarArchivoGridFS(content.fileId, "uploads")
    } catch (error) {
      console.error("Error eliminando archivo GridFS:", error)
    }
  }
}

export async function deleteTotemContents(archivos: Array<{ contentId?: mongoose.Types.ObjectId }>) {
  for (const archivo of archivos) {
    if (!archivo.contentId) continue
    const content = await Content.findById(archivo.contentId)
    if (!content) continue
    await deleteContentRecord(content)
    await Content.findByIdAndDelete(archivo.contentId)
  }
}

async function deleteExistingTotemFaqs(totemId: mongoose.Types.ObjectId | string) {
  const existingFaqs = await Faq.find({ totemId })

  for (const faq of existingFaqs) {
    if (faq.pdfCloudinaryPublicId) {
      try {
        await deleteCloudinaryAsset(faq.pdfCloudinaryPublicId, "raw")
      } catch (error) {
        console.error("Error eliminando PDF Cloudinary:", error)
      }
    }

    if (faq.pdfFileId) {
      try {
        await eliminarPdfGridFS(faq.pdfFileId)
      } catch (error) {
        console.error("Error eliminando PDF GridFS:", error)
      }
    }

    if (faq.documentId) {
      const doc = await DocumentModel.findById(faq.documentId)
      if (doc?.cloudinaryPublicId) {
        try {
          await deleteCloudinaryAsset(doc.cloudinaryPublicId, "raw")
        } catch (error) {
          console.error("Error eliminando documento Cloudinary:", error)
        }
      }
      if (doc?.fileId) {
        try {
          await eliminarPdfGridFS(doc.fileId)
        } catch (error) {
          console.error("Error eliminando documento GridFS:", error)
        }
      }
      await DocumentModel.findByIdAndDelete(faq.documentId)
    }
  }

  await Faq.deleteMany({ totemId })
}

export async function processFaqPdfFromGridFS(
  pdf: UploadedPdfInput,
  totemId: mongoose.Types.ObjectId | string,
  totemNombre: string
): Promise<FaqProcessResult> {
  if (!pdf.pdfFileId) {
    throw new Error("Falta pdfFileId para guardar el FAQ en MongoDB")
  }

  const pdfFileId = new mongoose.Types.ObjectId(pdf.pdfFileId)
  const pdfUrl = pdf.pdfUrl || buildGridFsFileUrl(pdfFileId)
  let extractedText = pdf.extractedText?.trim() || ""
  let warning: string | undefined

  if (!extractedText) {
    try {
      const pdfBuffer = await leerPdfGridFS(pdfFileId)
      extractedText = await extractTextFromPdfBuffer(pdfBuffer)
    } catch (error) {
      console.error("Error leyendo PDF desde MongoDB:", error)
      warning =
        error instanceof Error
          ? `El PDF se guardó en MongoDB, pero falló la lectura: ${error.message}`
          : "El PDF se guardó en MongoDB, pero falló la lectura del contenido."
    }
  }

  const parsed = extractedText ? parseTotemKnowledgeDocument(extractedText) : { items: [], generalInfo: [], rules: [] }
  const items = parsed.items

  if (!extractedText && !warning) {
    warning =
      "El PDF se vinculó al tótem, pero no se pudo extraer texto. Verifica que el PDF tenga texto seleccionable."
  } else if (!warning && items.length === 0 && extractedText) {
    warning =
      "El PDF se vinculó, pero no se detectaron preguntas. Usa el formato DOCUMENTO DE CONOCIMIENTO con PREGUNTA:/RESPUESTA:."
  }

  const document = await DocumentModel.create({
    name: pdf.name,
    type: "faq_pdf",
    fileId: pdfFileId,
    fileUrl: pdfUrl,
    mimeType: "application/pdf",
    extractedText,
  })

  const faq = await Faq.create({
    title: `FAQ - ${totemNombre}`,
    campusId: null,
    totemId,
    documentId: document._id,
    pdfFileId,
    pdfUrl,
    items,
    isActive: true,
  })

  return {
    document,
    faq,
    itemsCount: items.length,
    extractedOk: Boolean(extractedText),
    warning,
  }
}

export async function processFaqPdfFromCloudinary(
  pdf: UploadedPdfInput,
  totemId: mongoose.Types.ObjectId | string,
  totemNombre: string
): Promise<FaqProcessResult> {
  let extractedText = pdf.extractedText?.trim() || ""
  let items: Array<{ question: string; answer: string }> = []
  let warning: string | undefined

  if (!extractedText) {
    try {
      const pdfBuffer = await fetchCloudinaryPdfBuffer({
        url: pdf.url || "",
        publicId: pdf.publicId || "",
      })
      extractedText = await extractTextFromPdfBuffer(pdfBuffer)
    } catch (error) {
      console.error("Error descargando PDF desde Cloudinary:", error)
      warning =
        error instanceof Error
          ? `El PDF se guardó en Cloudinary, pero falló la descarga en servidor: ${error.message}`
          : "El PDF se guardó, pero falló la descarga en servidor."
    }
  }

  if (extractedText) {
    const parsed = parseTotemKnowledgeDocument(extractedText)
    items = parsed.items
  } else if (!warning) {
    warning =
      "El PDF se vinculó al tótem, pero no se pudo extraer texto. Verifica que el PDF tenga texto seleccionable."
  }

  const document = await DocumentModel.create({
    name: pdf.name,
    type: "faq_pdf",
    cloudinaryPublicId: pdf.publicId,
    fileUrl: pdf.url,
    mimeType: "application/pdf",
    extractedText,
  })

  const faq = await Faq.create({
    title: `FAQ - ${totemNombre}`,
    campusId: null,
    totemId,
    documentId: document._id,
    pdfCloudinaryPublicId: pdf.publicId,
    pdfUrl: pdf.url,
    items,
    isActive: true,
  })

  if (!warning && items.length === 0 && extractedText) {
    warning =
      "El PDF se vinculó, pero no se detectaron preguntas. Usa el formato DOCUMENTO DE CONOCIMIENTO con PREGUNTA:/RESPUESTA:."
  }

  return {
    document,
    faq,
    itemsCount: items.length,
    extractedOk: Boolean(extractedText),
    warning,
  }
}

export async function processFaqPdf(
  pdf: UploadedPdfInput,
  totemId: mongoose.Types.ObjectId | string,
  totemNombre: string
) {
  if (isGridFaqPdf(pdf)) {
    return processFaqPdfFromGridFS(pdf, totemId, totemNombre)
  }
  if (isCloudinaryFaqPdf(pdf)) {
    return processFaqPdfFromCloudinary(pdf, totemId, totemNombre)
  }
  throw new Error("PDF de FAQ inválido: falta pdfFileId o referencia de Cloudinary")
}

export async function ensureTotemFaqFromPdf(totem: {
  _id: mongoose.Types.ObjectId
  nombre: string
  faqPdf?: UploadedPdfInput | null
}) {
  const pdf = totem.faqPdf
  if (!pdf?.pdfFileId && !(pdf?.url && pdf?.publicId)) return null

  const existing = await Faq.findOne({ totemId: totem._id, isActive: true }).sort({
    createdAt: -1,
  })
  if (existing) return existing

  try {
    const result = await processFaqPdf(pdf, totem._id, totem.nombre)
    return result.faq
  } catch (error) {
    console.error("Error reparando FAQ desde totem.faqPdf:", error)
    if (isGridFaqPdf(pdf)) {
      return Faq.create({
        title: `FAQ - ${totem.nombre}`,
        campusId: null,
        totemId: totem._id,
        pdfFileId: new mongoose.Types.ObjectId(pdf.pdfFileId!),
        pdfUrl: pdf.pdfUrl || buildGridFsFileUrl(pdf.pdfFileId!),
        items: [],
        isActive: true,
      })
    }
    return Faq.create({
      title: `FAQ - ${totem.nombre}`,
      campusId: null,
      totemId: totem._id,
      pdfCloudinaryPublicId: pdf.publicId,
      pdfUrl: pdf.url,
      items: [],
      isActive: true,
    })
  }
}

export async function replaceTotemFaq(
  totemId: mongoose.Types.ObjectId | string,
  totemNombre: string,
  pdf: UploadedPdfInput
) {
  await deleteExistingTotemFaqs(totemId)
  return processFaqPdf(pdf, totemId, totemNombre)
}

/** @deprecated Usa replaceTotemFaq */
export async function replaceTotemFaqFromCloudinary(
  totemId: mongoose.Types.ObjectId | string,
  totemNombre: string,
  pdf: UploadedPdfInput
) {
  return replaceTotemFaq(totemId, totemNombre, pdf)
}
