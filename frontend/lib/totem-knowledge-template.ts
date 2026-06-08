export const TOTEM_KNOWLEDGE_TEMPLATE = `DOCUMENTO DE CONOCIMIENTO PARA TÓTEM
Formato recomendado para que el sistema extraiga información y responda preguntas.
SECCIÓN: INFORMACIÓN GENERAL
Nombre de la institución: Universidad Ejemplo
Dirección: Av. Principal 123
Horario de atención: Lunes a Viernes de 08:00 a 18:00
SECCIÓN: PREGUNTAS FRECUENTES
PREGUNTA: ¿Cuál es el horario de atención?
RESPUESTA: La atención es de lunes a viernes de 08:00 a 18:00.
PREGUNTA: ¿Dónde se encuentra la institución?
RESPUESTA: La institución está ubicada en Av. Principal 123.
PREGUNTA: ¿Cómo puedo contactar soporte?
RESPUESTA: Puede escribir a soporte@ejemplo.com o llamar al 70000000.
SECCIÓN: REGLAS
REGLA: Si no se encuentra información en el documento, indica que no existe información disponible.`

export function downloadTotemKnowledgeTemplate() {
  const blob = new Blob([TOTEM_KNOWLEDGE_TEMPLATE], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "Totem_FAQ_Ejemplo.txt"
  link.click()
  URL.revokeObjectURL(url)
}
