import { buscarRespuestaFaq } from "../utils/faqSearch";

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

      const respuesta = buscarRespuestaFaq(mensaje, faqData);
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

const hablar = (texto) => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "es-ES";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
};