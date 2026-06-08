import { createRequire } from "module"

const require = createRequire(import.meta.url)

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { extractText } = require("unpdf")
  const result = await extractText(new Uint8Array(buffer), { mergePages: true })
  return typeof result.text === "string" ? result.text : (result.text as string[]).join("\n")
}

export type FaqItem = { question: string; answer: string }
export type GeneralInfoItem = { label: string; value: string }

export type TotemKnowledgeDocument = {
  generalInfo: GeneralInfoItem[]
  items: FaqItem[]
  rules: string[]
}

function normalizeDocumentText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim()
}

function cleanInline(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function extractSections(text: string) {
  const sections: Array<{ title: string; content: string }> = []
  const regex = /SECCI[OÓ]N:\s*([^\n]+)\n?/gi
  const matches = [...text.matchAll(regex)]

  if (matches.length === 0) {
    return [{ title: "DOCUMENTO", content: text }]
  }

  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length
    sections.push({
      title: matches[i][1].trim(),
      content: text.slice(start, end).trim(),
    })
  }

  return sections
}

function parseGeneralInfoSection(content: string): GeneralInfoItem[] {
  const items: GeneralInfoItem[] = []
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean)

  for (const line of lines) {
    if (/^(PREGUNTA|RESPUESTA|REGLA|SECCI[OÓ]N)\b/i.test(line)) continue
    const match = line.match(/^([^:]{3,}):\s*(.+)$/)
    if (!match) continue
    items.push({
      label: match[1].trim(),
      value: match[2].trim(),
    })
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
