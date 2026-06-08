function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function puntuarCoincidencia(consulta, candidato) {
  const consultaNorm = normalizar(consulta);
  const candidatoNorm = normalizar(candidato);
  if (!consultaNorm || !candidatoNorm) return 0;

  const palabras = consultaNorm.split(" ").filter((p) => p.length > 2);
  if (palabras.length === 0) return 0;

  let puntaje = 0;
  for (const palabra of palabras) {
    if (candidatoNorm.includes(palabra)) puntaje += 2;
  }
  if (candidatoNorm.includes(consultaNorm)) puntaje += 6;
  return puntaje;
}

function recortarParaVoz(texto, max = 320) {
  const limpio = String(texto || "").replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;

  const trozo = limpio.slice(0, max);
  const ultimoPunto = Math.max(trozo.lastIndexOf("."), trozo.lastIndexOf(";"));
  if (ultimoPunto > 80) return `${trozo.slice(0, ultimoPunto + 1).trim()}`;
  return `${trozo.trim()}...`;
}

export function buscarRespuestaFaq(mensajeUsuario, faqData) {
  const items = faqData?.items || [];
  const paragraphs = faqData?.paragraphs || [];

  if (items.length === 0 && paragraphs.length === 0) {
    if (faqData?.hasPdf) {
      return "Tengo un documento de preguntas frecuentes cargado, pero aún no pude extraer respuestas legibles. Consulta el PDF en pantalla.";
    }
    return "Por el momento no tengo información disponible.";
  }

  let mejorPuntaje = 0;
  let mejorRespuesta = null;

  for (const item of items) {
    const porPregunta = puntuarCoincidencia(mensajeUsuario, item.question) * 2;
    const porRespuesta = puntuarCoincidencia(mensajeUsuario, item.answer);
    const combinado = puntuarCoincidencia(
      mensajeUsuario,
      `${item.question} ${item.answer}`
    );
    const total = Math.max(porPregunta, porRespuesta, combinado);

    if (total > mejorPuntaje) {
      mejorPuntaje = total;
      mejorRespuesta = item.answer;
    }
  }

  for (const parrafo of paragraphs) {
    const puntaje = puntuarCoincidencia(mensajeUsuario, parrafo);
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorRespuesta = recortarParaVoz(parrafo);
    }
  }

  if (mejorPuntaje >= 2 && mejorRespuesta) {
    return recortarParaVoz(mejorRespuesta);
  }

  return "No encontré información sobre eso en el documento de preguntas frecuentes. Revisa las consultas listadas o el PDF disponible.";
}
