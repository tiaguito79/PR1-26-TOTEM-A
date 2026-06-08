const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "")
const TOTEM_ID = import.meta.env.VITE_TOTEM_ID || "demo-totem"

const fallbackAds = [
  {
    title: "Publicidad Institucional 1",
    mediaUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    type: "image",
    durationSeconds: 6,
    tag: "DEMO",
    description: "Modo demo: configura VITE_API_URL y VITE_TOTEM_ID",
  },
]

const fallbackFaq = {
  title: "Preguntas Frecuentes",
  items: [
    {
      question: "¿Dónde pago mi matrícula?",
      answer: "Puede realizar el pago en cajas o mediante la plataforma virtual.",
    },
    {
      question: "¿Cuál es el horario de atención?",
      answer: "Lunes a viernes de 8:00 a 18:00.",
    },
    {
      question: "¿Dónde solicito certificados?",
      answer: "En la oficina de registros o por el portal institucional.",
    },
  ],
}

export function getConfiguredTotemId() {
  return TOTEM_ID
}

export async function getTotemDisplay(totemId = TOTEM_ID) {
  const response = await fetch(`${API_URL}/api/totems/display/${encodeURIComponent(totemId)}`)
  if (!response.ok) {
    throw new Error(`No se pudo cargar el tótem (${response.status})`)
  }
  return response.json()
}

export async function getAdsByTotem(totemId = TOTEM_ID) {
  try {
    const response = await fetch(`${API_URL}/api/ads/totem/${encodeURIComponent(totemId)}`)
    if (!response.ok) throw new Error("No se pudo obtener publicidad")
    return await response.json()
  } catch (error) {
    console.warn("Usando publicidad local:", error.message)
    return fallbackAds
  }
}

export async function getFaqByTotem(totemId = TOTEM_ID) {
  try {
    const response = await fetch(`${API_URL}/api/faqs/totem/${encodeURIComponent(totemId)}`)
    if (!response.ok) throw new Error("No se pudo obtener FAQ")
    return await response.json()
  } catch (error) {
    console.warn("Usando FAQ local:", error.message)
    return fallbackFaq
  }
}
