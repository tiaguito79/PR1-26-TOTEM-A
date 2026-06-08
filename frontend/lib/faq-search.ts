import type { FaqItem } from "@/lib/pdf-service"

export function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function scoreTextMatch(query: string, candidate: string) {
  const queryNorm = normalizeSearchText(query)
  const candidateNorm = normalizeSearchText(candidate)
  if (!queryNorm || !candidateNorm) return 0

  const queryWords = queryNorm.split(" ").filter((w) => w.length > 2)
  if (queryWords.length === 0) return 0

  let score = 0
  for (const word of queryWords) {
    if (candidateNorm.includes(word)) score += 2
  }

  if (candidateNorm.includes(queryNorm)) score += 6

  return score
}

export function findBestFaqAnswer(
  query: string,
  items: FaqItem[],
  paragraphs: string[] = []
) {
  let bestScore = 0
  let bestAnswer: string | null = null

  for (const item of items) {
    const questionScore = scoreTextMatch(query, item.question) * 2
    const answerScore = scoreTextMatch(query, item.answer)
    const combinedScore = scoreTextMatch(query, `${item.question} ${item.answer}`)
    const total = Math.max(questionScore, answerScore, combinedScore)

    if (total > bestScore) {
      bestScore = total
      bestAnswer = item.answer
    }
  }

  for (const paragraph of paragraphs) {
    const score = scoreTextMatch(query, paragraph)
    if (score > bestScore) {
      bestScore = score
      bestAnswer = trimForSpeech(paragraph)
    }
  }

  if (bestScore >= 2 && bestAnswer) {
    return trimForSpeech(bestAnswer)
  }

  return null
}

export function trimForSpeech(text: string, maxLength = 320) {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned

  const slice = cleaned.slice(0, maxLength)
  const lastStop = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(";"))
  if (lastStop > 80) return `${slice.slice(0, lastStop + 1).trim()}`
  return `${slice.trim()}...`
}
