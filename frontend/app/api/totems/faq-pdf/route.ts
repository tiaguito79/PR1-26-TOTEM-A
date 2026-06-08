import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { AuthError, requireAuth } from "@/lib/auth.server"
import { buildGridFsFileUrl, subirPdfAGridFS } from "@/lib/gridfs"
import { extractTextFromPdfBuffer } from "@/lib/pdf-service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    await requireAuth(request)
    await connectDB()

    const formData = await request.formData()
    const file = formData.get("pdf") as File | null
    const extractedTextFromClient = (formData.get("extractedText") as string | null)?.trim()

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Debes subir un PDF" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${Date.now()}-${file.name}`
    const pdfFileId = await subirPdfAGridFS(buffer, fileName, file.type || "application/pdf")

    let extractedText = extractedTextFromClient || ""
    if (!extractedText) {
      extractedText = await extractTextFromPdfBuffer(buffer)
    }

    return NextResponse.json({
      pdfFileId: pdfFileId.toString(),
      pdfUrl: buildGridFsFileUrl(pdfFileId),
      name: file.name,
      extractedText,
      extractedOk: Boolean(extractedText),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error subiendo PDF FAQ a MongoDB:", error)
    const msg = error instanceof Error ? error.message : "Error al guardar el PDF"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
