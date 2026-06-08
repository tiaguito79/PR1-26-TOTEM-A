export const TEMPLATE_DEFINITIONS = [
  { id: "clasica", name: "Plantilla Clásica", images: 3, videos: 1 },
  { id: "eventos", name: "Plantilla Eventos", images: 5, videos: 2 },
  { id: "promocional", name: "Plantilla Promocional", images: 2, videos: 1 },
  { id: "minimal", name: "Plantilla Minimal", images: 4, videos: 0 },
  { id: "corporativa", name: "Plantilla Corporativa", images: 3, videos: 2 },
  { id: "directorio", name: "Plantilla Directorio", images: 0, videos: 1 },
] as const

export type TemplateId = (typeof TEMPLATE_DEFINITIONS)[number]["id"]

const NAME_TO_ID: Record<string, TemplateId> = {
  "Plantilla Clásica": "clasica",
  "Plantilla Eventos": "eventos",
  "Plantilla Promocional": "promocional",
  "Plantilla Minimal": "minimal",
  "Plantilla Corporativa": "corporativa",
  "Plantilla Directorio": "directorio",
}

export function normalizePlantillaId(plantilla: string | null | undefined): TemplateId {
  if (!plantilla) return "clasica"
  if (NAME_TO_ID[plantilla]) return NAME_TO_ID[plantilla]
  const known = TEMPLATE_DEFINITIONS.find((t) => t.id === plantilla)
  if (known) return known.id
  return "clasica"
}

export function getTemplateMediaRequirements(templateId: string) {
  const template =
    TEMPLATE_DEFINITIONS.find((t) => t.id === templateId) ?? TEMPLATE_DEFINITIONS[0]
  return { images: template.images, videos: template.videos }
}

export function getTemplateDisplayName(templateId: string) {
  const template =
    TEMPLATE_DEFINITIONS.find((t) => t.id === templateId) ?? TEMPLATE_DEFINITIONS[0]
  return template.name
}
