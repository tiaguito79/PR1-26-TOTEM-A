import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { subirPdfAGridFS } from "@/lib/gridfs"
import { extractTextFromPdfBuffer, parseTotemKnowledgeDocument } from "@/lib/pdf-service"
import DocumentModel from "@/models/Document"
import Faq from "@/models/Faq"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    await connectDB()

    const formData = await request.formData()
    const file = formData.get("pdf") as File | null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { message: "Debes subir un PDF" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${Date.now()}-${file.name}`

    const pdfFileId = await subirPdfAGridFS(buffer, fileName, file.type)

    const extractedText = await extractTextFromPdfBuffer(buffer)
    const { items } = parseTotemKnowledgeDocument(extractedText)

    if (!items.length) {
      return NextResponse.json(
        {
          message:
            "No se pudieron extraer preguntas/respuestas del PDF. Verifica el formato.",
        },
        { status: 400 }
      )
    }

    const document = await DocumentModel.create({
      name: file.name,
      type: "faq_pdf",
      fileId: pdfFileId,
      mimeType: file.type,
      extractedText,
    })

    const title = formData.get("title") as string | null
    const campusId = formData.get("campusId") as string | null
    const totemId = formData.get("totemId") as string | null

    const faq = await Faq.create({
      title: title || "Preguntas frecuentes",
      campusId: campusId || null,
      totemId: totemId || null,
      documentId: document._id,
      pdfFileId,
      items,
      isActive: true,
    })

    return NextResponse.json(
      { message: "PDF subido y FAQ generada correctamente", faq },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error subiendo FAQ PDF:", error)
    const msg = error instanceof Error ? error.message : "Error al procesar PDF"
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
