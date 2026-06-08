let recognitionInstance = null;
let recognitionStopped = false;

export const iniciarReconocimiento = (setEstado, setTexto, setRespuesta, onActivarFaq, getFaqData) => {
  recognitionStopped = false;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setEstado("no_soportado");
    return;
  }

  if (recognitionInstance) {
    try { recognitionInstance.stop(); } catch (_) {}
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "es-ES";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognitionInstance = recognition;

  const iniciar = () => {
    try { recognition.start(); } catch (_) {}
  };

  iniciar();

  recognition.onstart = () => setEstado("escuchando");

  recognition.onresult = (event) => {
    const mensaje = event.results[0][0].transcript;
    setTexto(mensaje);
    setEstado("detectado");

    if (event.results[0].isFinal) {
      const faqData = getFaqData?.();
      console.log("📦 faqData en el momento de hablar:", faqData);
      console.log("🎤 Mensaje:", mensaje);

      const respuesta = buscarEnFaq(mensaje, faqData);
      setRespuesta(respuesta);
      hablar(respuesta);

      if (onActivarFaq) onActivarFaq();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech" || event.error === "aborted") {
      setEstado("esperando");
    } else {
      setEstado("error");
    }
  };

  recognition.onend = () => {
    if (recognitionStopped) return;
    setEstado("esperando");
    setTimeout(() => {
      if (!recognitionStopped) iniciar();
    }, 1500);
  };
};

export const detenerReconocimiento = () => {
  recognitionStopped = true;
  if (recognitionInstance) {
    try { recognitionInstance.stop(); recognitionInstance = null; } catch (_) {}
  }
};

const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, "");

const buscarEnFaq = (mensajeUsuario, faqData) => {
  const items = faqData?.items || [];

  if (items.length === 0) {
    return "Por el momento no tengo información disponible.";
  }

  const inputNorm = normalizar(mensajeUsuario);
  const palabrasInput = inputNorm.split(" ").filter((p) => p.length > 2);

  let mejorPuntaje = 0;
  let mejorRespuesta = null;

  for (const item of items) {
    const preguntaNorm = normalizar(item.question);
    const palabrasPregunta = preguntaNorm.split(" ").filter((p) => p.length > 2);

    let coincidencias = 0;
    for (const palabra of palabrasInput) {
      if (preguntaNorm.includes(palabra)) coincidencias++;
    }
    for (const palabra of palabrasPregunta) {
      if (inputNorm.includes(palabra)) coincidencias++;
    }

    if (coincidencias > mejorPuntaje) {
      mejorPuntaje = coincidencias;
      mejorRespuesta = item.answer;
    }
  }

  if (mejorPuntaje >= 1 && mejorRespuesta) {
    return mejorRespuesta;
  }

  return "No encontré información sobre eso. Abre la mano para ver todas las preguntas frecuentes.";
};

const hablar = (texto) => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "es-ES";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
};