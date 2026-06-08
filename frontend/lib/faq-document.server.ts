import mongoose from "mongoose"
import DocumentModel from "@/models/Document"
import Faq from "@/models/Faq"
import { fetchCloudinaryPdfBuffer } from "@/lib/cloudinary-server"
import { leerPdfGridFS } from "@/lib/gridfs"
import {
  buildFaqSearchParagraphs,
  extractTextFromPdfBuffer,
  parseTotemKnowledgeDocument,
  type GeneralInfoItem,
} from "@/lib/pdf-service"

type LeanFaq = {
  _id: mongoose.Types.ObjectId
  title?: string
  totemId?: mongoose.Types.ObjectId
  documentId?: mongoose.Types.ObjectId
  pdfFileId?: mongoose.Types.ObjectId
  pdfUrl?: string
  pdfCloudinaryPublicId?: string
  items?: Array<{ question: string; answer: string }>
  isActive?: boolean
}

export async function loadFaqKnowledgeForDisplay(faq: LeanFaq) {
  let extractedText = ""
  let pdfUrl = faq.pdfUrl || null
  let pdfName: string | null = null
  let items = [...(faq.items ?? [])] as Array<{ question: string; answer: string }>
  let generalInfo: GeneralInfoItem[] = []
  let rules: string[] = []

  if (faq.documentId) {
    const document = await DocumentModel.findById(faq.documentId)
      .select("extractedText fileUrl name fileId")
      .lean()

    if (document) {
      extractedText = document.extractedText || ""
      pdfUrl =
        pdfUrl ||
        document.fileUrl ||
        (document.fileId ? `/api/contents/file/${document.fileId}` : null)
      pdfName = document.name || null
    }
  }

  if (!pdfUrl && faq.pdfFileId) {
    pdfUrl = `/api/contents/file/${faq.pdfFileId}`
  }

  const gridFileId = faq.pdfFileId || null

  if (!extractedText.trim() && gridFileId) {
    try {
      const pdfBuffer = await leerPdfGridFS(gridFileId)
      extractedText = await extractTextFromPdfBuffer(pdfBuffer)
    } catch (error) {
      console.error("Error re-extrayendo PDF desde MongoDB:", error)
    }
  }

  if (!extractedText.trim() && faq.pdfCloudinaryPublicId) {
    try {
      const pdfBuffer = await fetchCloudinaryPdfBuffer({
        url: pdfUrl || "",
        publicId: faq.pdfCloudinaryPublicId,
      })
      extractedText = await extractTextFromPdfBuffer(pdfBuffer)
    } catch (error) {
      console.error("Error re-extrayendo PDF de FAQ:", error)
    }
  }

  if (faq.documentId && extractedText.trim()) {
    await DocumentModel.findByIdAndUpdate(faq.documentId, {
      extractedText,
      ...(pdfUrl ? { fileUrl: pdfUrl } : {}),
    })
  }

  if (extractedText.trim()) {
    const parsed = parseTotemKnowledgeDocument(extractedText)
    if (parsed.items.length > 0) items = parsed.items
    if (parsed.generalInfo.length > 0) generalInfo = parsed.generalInfo
    if (parsed.rules.length > 0) rules = parsed.rules

    if (parsed.items.length > 0 && (faq.items?.length ?? 0) === 0) {
      await Faq.findByIdAndUpdate(faq._id, { items: parsed.items })
    }
  }

  const paragraphs = buildFaqSearchParagraphs(extractedText, items, generalInfo, rules)

  return {
    hasFaq:
      items.length > 0 ||
      generalInfo.length > 0 ||
      paragraphs.length > 0 ||
      Boolean(pdfUrl),
    title: faq.title || "Preguntas Frecuentes",
    items,
    generalInfo,
    rules,
    paragraphs,
    pdfUrl,
    pdfName,
    hasPdf: Boolean(pdfUrl),
    extractedOk: Boolean(extractedText.trim()),
  }
}
