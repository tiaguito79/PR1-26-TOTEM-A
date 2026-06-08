import { createRequire } from "module"

const require = createRequire(import.meta.url)

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length < 50) {
    console.error("PDF buffer vacío o demasiado pequeño para extraer texto")
    return ""
  }

  try {
    const { extractText } = require("unpdf")
    const result = await extractText(new Uint8Array(buffer), { mergePages: true })
    const text =
      typeof result.text === "string" ? result.text : (result.text as string[]).join("\n")
    if (text.trim()) return text.trim()
  } catch (error) {
    console.error("unpdf no pudo extraer texto:", error)
  }

  try {
    const { PDFParse } = require("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    if (result?.text?.trim()) return result.text.trim()
  } catch (error) {
    console.error("pdf-parse no pudo extraer texto:", error)
  }

  return ""
}

export type FaqItem = { question: string; answer: string }
export type GeneralInfoItem = { label: string; value: string }

export type TotemKnowledgeDocument = {
  generalInfo: GeneralInfoItem[]
  items: FaqItem[]
  rules: string[]
}

function normalizeDocumentText(text: string) {
  let normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u2028/g, "\n")
    .trim()

  // Los extractores de PDF suelen pegar todo en una sola línea.
  normalized = normalized
    .replace(/\s+(SECCI[OÓ]N:\s*)/gi, "\n$1")
    .replace(/\s+(PREGUNTA:\s*)/gi, "\n$1")
    .replace(/\s+(RESPUESTA:\s*)/gi, "\n$1")
    .replace(/\s+(REGLA:\s*)/gi, "\n$1")

  return normalized
}

function cleanInline(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function extractSections(text: string) {
  const normalized = normalizeDocumentText(text)
  const chunks = normalized
    .split(/(?=SECCI[OÓ]N:\s*)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  const sectionChunks = chunks.filter((chunk) => /^SECCI[OÓ]N:/i.test(chunk))

  if (sectionChunks.length === 0) {
    return [{ title: "DOCUMENTO", content: normalized }]
  }

  return sectionChunks.map((chunk) => {
    const header = chunk.match(/^SECCI[OÓ]N:\s*([^\n]+)\s*/i)
    return {
      title: header ? header[1].trim() : "DOCUMENTO",
      content: header ? chunk.slice(header[0].length).trim() : chunk,
    }
  })
}

function parseGeneralInfoSection(content: string): GeneralInfoItem[] {
  const items: GeneralInfoItem[] = []
  const cleanedContent = content
    .replace(/^SECCI[OÓ]N:\s*INFORMACI[OÓ]N GENERAL\s*/i, "")
    .trim()
  const lines = cleanedContent.split("\n").map((line) => line.trim()).filter(Boolean)

  for (const line of lines) {
    if (/^(PREGUNTA|RESPUESTA|REGLA|SECCI[OÓ]N)\b/i.test(line)) continue
    const match = line.match(/^([^:]{3,}):\s*(.+)$/)
    if (!match) continue
    items.push({
      label: match[1].trim(),
      value: match[2].trim(),
    })
  }

  if (items.length >= 2) return items

  const inlineRegex =
    /([A-Za-zÁÉÍÓÚáéíóúñÑ0-9][A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{2,45}):\s*([\s\S]*?)(?=\s+[A-Za-zÁÉÍÓÚáéíóúñÑ0-9][A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{2,45}:\s*|PREGUNTA:|SECCI[OÓ]N:|REGLA:|$)/gi
  let match

  while ((match = inlineRegex.exec(cleanedContent)) !== null) {
    const label = cleanInline(match[1])
    const value = cleanInline(match[2])
    if (
      label &&
      value &&
      !/^(PREGUNTA|RESPUESTA|REGLA|SECCI[OÓ]N)$/i.test(label)
    ) {
      items.push({ label, value })
    }
  }

  return items
}

function parseFaqSection(content: string): FaqItem[] {
  const items: FaqItem[] = []
  const regex =
    /PREGUNTA:\s*([\s\S]*?)\s*RESPUESTA:\s*([\s\S]*?)(?=\s*PREGUNTA:|\s*REGLA:|\s*SECCI[OÓ]N:|$)/gi
  let match

  while ((match = regex.exec(content)) !== null) {
    const question = cleanInline(match[1])
    const answer = cleanInline(match[2])
    if (question && answer) {
      items.push({ question, answer })
    }
  }

  return items
}

function parseRulesSection(content: string): string[] {
  const rules: string[] = []
  const regex = /REGLA:\s*([\s\S]*?)(?=\s*REGLA:|\s*SECCI[OÓ]N:|$)/gi
  let match

  while ((match = regex.exec(content)) !== null) {
    const rule = cleanInline(match[1])
    if (rule) rules.push(rule)
  }

  return rules
}

/** Formato oficial: DOCUMENTO DE CONOCIMIENTO PARA TÓTEM con secciones. */
export function parseTotemKnowledgeDocument(text: string): TotemKnowledgeDocument {
  const normalized = normalizeDocumentText(text)
  const sections = extractSections(normalized)

  let generalInfo: GeneralInfoItem[] = []
  let items: FaqItem[] = []
  let rules: string[] = []

  for (const section of sections) {
    const title = section.title.toUpperCase()

    if (title.includes("INFORMAC") && title.includes("GENERAL")) {
      generalInfo = parseGeneralInfoSection(section.content)
      continue
    }

    if (title.includes("PREGUNTAS") && title.includes("FRECUENT")) {
      items = parseFaqSection(section.content)
      continue
    }

    if (title.includes("REGLAS")) {
      rules = parseRulesSection(section.content)
    }
  }

  if (items.length === 0) items = parseFaqSection(normalized)
  if (generalInfo.length === 0) {
    const infoSection = normalized.split(/SECCI[OÓ]N:\s*PREGUNTAS FRECUENTES/i)[0]
    generalInfo = parseGeneralInfoSection(infoSection)
  }
  if (rules.length === 0) rules = parseRulesSection(normalized)
  if (items.length === 0) items = parseLegacyFaqText(normalized)

  return { generalInfo, items, rules }
}

export function parseFaqText(text: string): FaqItem[] {
  return parseTotemKnowledgeDocument(text).items
}

function parseLegacyFaqText(text: string): FaqItem[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim()
  if (!cleaned) return []

  const strategies = [parseQuestionMarkFormat, parseNumberedFaqFormat]

  for (const strategy of strategies) {
    const items = strategy(cleaned)
    if (items.length > 0) return items
  }

  return []
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

export function buildFaqSearchParagraphs(
  text: string,
  items: FaqItem[],
  generalInfo: GeneralInfoItem[] = [],
  rules: string[] = []
): string[] {
  const paragraphs = new Set<string>()

  for (const info of generalInfo) {
    paragraphs.add(`${info.label}: ${info.value}`)
    paragraphs.add(info.value)
  }

  for (const item of items) {
    paragraphs.add(`${item.question}. ${item.answer}`)
    paragraphs.add(item.answer)
  }

  for (const paragraph of splitPdfParagraphs(text)) {
    paragraphs.add(paragraph)
  }

  for (const rule of rules) {
    if (!/no se encontr[oó]/i.test(rule)) {
      paragraphs.add(rule)
    }
  }

  return Array.from(paragraphs).filter((p) => p.length >= 20)
}

function splitPdfParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 40)
}
