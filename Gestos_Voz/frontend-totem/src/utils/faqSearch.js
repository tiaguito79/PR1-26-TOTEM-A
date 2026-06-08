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

function obtenerMensajeSinRespuesta(faqData) {
  const rules = faqData?.rules || [];
  const reglaDocumento = rules.find((rule) =>
    /no se encontr[oó]|no existe informaci[oó]n/i.test(rule)
  );

  if (reglaDocumento) {
    return reglaDocumento.replace(/^[^:]+:\s*/i, "").trim() || reglaDocumento;
  }

  return "No encontré información sobre eso en el documento de conocimiento.";
}

export function buscarRespuestaFaq(mensajeUsuario, faqData) {
  const items = faqData?.items || [];
  const generalInfo = faqData?.generalInfo || [];
  const paragraphs = faqData?.paragraphs || [];
  const sinRespuesta = obtenerMensajeSinRespuesta(faqData);

  if (
    items.length === 0 &&
    generalInfo.length === 0 &&
    paragraphs.length === 0
  ) {
    if (faqData?.hasPdf) {
      return "Tengo el PDF cargado, pero no pude leer su contenido. El administrador debe volver a subir el documento con texto seleccionable.";
    }
    return "No tengo un documento de conocimiento cargado para este tótem. Contacta al administrador.";
  }

  let mejorPuntaje = 0;
  let mejorRespuesta = null;

  for (const info of generalInfo) {
    const porEtiqueta = puntuarCoincidencia(mensajeUsuario, info.label) * 2;
    const porValor = puntuarCoincidencia(mensajeUsuario, info.value);
    const combinado = puntuarCoincidencia(
      mensajeUsuario,
      `${info.label} ${info.value}`
    );
    const total = Math.max(porEtiqueta, porValor, combinado);

    if (total > mejorPuntaje) {
      mejorPuntaje = total;
      mejorRespuesta = info.value;
    }
  }

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

  return sinRespuesta;
}
