/** Fecha local en formato YYYY-MM-DD (para inputs type="date"). */
export function getTodayDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function validateTotemContentDates(
  startDate: string,
  endDate: string,
  today = getTodayDateString()
): string | null {
  if (!startDate?.trim() || !endDate?.trim()) {
    return "Debes seleccionar el rango de fechas del contenido."
  }

  if (startDate < today) {
    return "La fecha de inicio no puede ser anterior a hoy."
  }

  if (endDate < startDate) {
    return "La fecha límite no puede ser anterior a la fecha de inicio."
  }

  return null
}
