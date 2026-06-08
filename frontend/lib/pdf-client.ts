"use client"

export async function extractPdfTextFromFile(file: File): Promise<string> {
  try {
    const { extractText } = await import("unpdf")
    const buffer = await file.arrayBuffer()
    const result = await extractText(new Uint8Array(buffer), { mergePages: true })
    const text =
      typeof result.text === "string" ? result.text : (result.text as string[]).join("\n")
    return text.trim()
  } catch (error) {
    console.error("No se pudo leer el PDF en el navegador:", error)
    return ""
  }
}
