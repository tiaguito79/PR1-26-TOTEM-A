"use client"

import { extractPdfTextFromFile } from "@/lib/pdf-client"

export type UploadedFaqPdfPayload = {
  pdfFileId: string
  pdfUrl: string
  name: string
  extractedText?: string
}

export async function uploadTotemFaqPdf(
  file: File,
  token: string
): Promise<UploadedFaqPdfPayload> {
  const extractedText = await extractPdfTextFromFile(file)
  const formData = new FormData()
  formData.append("pdf", file)
  if (extractedText) {
    formData.append("extractedText", extractedText)
  }

  const response = await fetch("/api/totems/faq-pdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || "No se pudo guardar el PDF en el servidor")
  }

  return {
    pdfFileId: data.pdfFileId,
    pdfUrl: data.pdfUrl,
    name: data.name || file.name,
    extractedText: data.extractedText || extractedText || "",
  }
}
