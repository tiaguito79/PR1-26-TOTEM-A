export const SEDES = [
  { id: "cochabamba", name: "Cochabamba" },
  { id: "santa-cruz", name: "Santa Cruz" },
  { id: "la-paz", name: "La Paz" },
] as const

export type SedeId = (typeof SEDES)[number]["id"]

export const SEDE_IDS = SEDES.map((s) => s.id)

export function getSedeName(sedeId: string): string {
  return SEDES.find((s) => s.id === sedeId)?.name ?? sedeId
}

export function getSedeIdFromCampus(campusId: string): string {
  const normalized = campusId.trim().toLowerCase()
  const byId = SEDES.find((s) => s.id === normalized)
  if (byId) return byId.id
  const byName = SEDES.find((s) => s.name.toLowerCase() === normalized)
  if (byName) return byName.id
  return campusId
}

export function sedeMatchesCampusId(sedeId: string, campusId: string): boolean {
  const sede = SEDES.find((s) => s.id === sedeId)
  if (!sede) return campusId === sedeId
  return campusId === sede.id || campusId === sede.name
}

export function buildTotemSedeFilter(sedeId: string) {
  const sede = SEDES.find((s) => s.id === sedeId)
  if (!sede) return { campus_id: sedeId }
  return { campus_id: { $in: [sede.id, sede.name] } }
}

export function isValidSedeId(value: string): value is SedeId {
  return SEDE_IDS.includes(value as SedeId)
}
