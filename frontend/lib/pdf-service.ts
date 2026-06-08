import { createRequire } from "module"

const require = createRequire(import.meta.url)

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { extractText } = require("unpdf")
  const result = await extractText(new Uint8Array(buffer), { mergePages: true })
  return typeof result.text === "string" ? result.text : (result.text as string[]).join("\n")
}

export type FaqItem = { question: string; answer: string }

export function parseFaqText(text: string): FaqItem[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim()
  if (!cleaned) return []

  const strategies = [
    parsePreguntaRespuestaFormat,
    parseQuestionMarkFormat,
    parseNumberedFaqFormat,
  ]

  for (const strategy of strategies) {
    const items = strategy(cleaned)
    if (items.length > 0) return items
  }

  return []
}

function parsePreguntaRespuestaFormat(text: string): FaqItem[] {
  const normalized = text.replace(/\s+/g, " ").trim()
  const regex = /PREGUNTA:\s*(.*?)\s*RESPUESTA:\s*(.*?)(?=PREGUNTA:|$)/gi
  const items: FaqItem[] = []
  let match

  while ((match = regex.exec(normalized)) !== null) {
    const question = match[1].trim()
    const answer = match[2].trim()
    if (question && answer) items.push({ question, answer })
  }

  return items
}

function parseQuestionMarkFormat(text: string): FaqItem[] {
  const items: FaqItem[] = []
  const regex = /¿([^?\n]+)\?\s*([\s\S]*?)(?=¿|$)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const question = match[1].replace(/\s+/g, " ").trim()
    const answer = match[2].replace(/\s+/g, " ").trim()
    if (question.length > 3 && answer.length > 5) {
      items.push({ question: `¿${question}?`, answer })
    }
  }

  return items
}

function parseNumberedFaqFormat(text: string): FaqItem[] {
  const blocks = text.split(/\n(?=\d+[\).\-\s])/)
  const items: FaqItem[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    const match = trimmed.match(/^\d+[\).\-\s]+(.+)$/s)
    if (!match) continue

    const body = match[1].trim()
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) continue

    const question = lines[0].replace(/\s+/g, " ")
    const answer = lines.slice(1).join(" ").replace(/\s+/g, " ")
    if (question.length > 3 && answer.length > 5) {
      items.push({ question, answer })
    }
  }

  return items
}

export function buildFaqSearchParagraphs(text: string, items: FaqItem[]): string[] {
  const paragraphs = new Set<string>()

  for (const item of items) {
    paragraphs.add(`${item.question}. ${item.answer}`)
    paragraphs.add(item.answer)
  }

  for (const paragraph of splitPdfParagraphs(text)) {
    paragraphs.add(paragraph)
  }

  return Array.from(paragraphs).filter((p) => p.length >= 30)
}

function splitPdfParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 40)
}
