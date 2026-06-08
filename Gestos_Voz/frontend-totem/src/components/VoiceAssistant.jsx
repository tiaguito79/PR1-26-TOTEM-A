// src/components/VoiceAssistant.jsx
import { useEffect, useRef, useState } from "react";
import { iniciarReconocimiento, detenerReconocimiento } from "../services/speechService";

export default function VoiceAssistant({ onActivarFaq, faqData }) {
  const [estado, setEstado] = useState("iniciando");
  const [texto, setTexto] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [minimizado, setMinimizado] = useState(false);

  const onActivarFaqRef = useRef(onActivarFaq);
  const faqDataRef = useRef(null);

  // Mantiene las refs siempre actualizadas sin reiniciar el reconocimiento
  useEffect(() => { onActivarFaqRef.current = onActivarFaq; }, [onActivarFaq]);
  useEffect(() => { faqDataRef.current = faqData; }, [faqData]);

  useEffect(() => {
    iniciarReconocimiento(
      setEstado,
      setTexto,
      setRespuesta,
      () => onActivarFaqRef.current?.(),
      () => faqDataRef.current   // <-- getter que siempre devuelve el FAQ actualizado
    );
    return () => detenerReconocimiento();
  }, []);

  const etiquetaEstado = {
    iniciando:    "Iniciando...",
    escuchando:   "🎤 Escuchando...",
    detectado:    "✅ Voz detectada",
    esperando:    "⏳ Esperando voz...",
    error:        "❌ Error de micrófono",
    no_soportado: "❌ No soportado",
  };

  const colorEstado = {
    iniciando:    "#a8bbd0",
    escuchando:   "#00e8d0",
    detectado:    "#52ffa8",
    esperando:    "#a8bbd0",
    error:        "#ff7b7b",
    no_soportado: "#ff7b7b",
  };

  return (
    <div className="voice-assistant-box">
      <div className="voice-assistant-header">
        <span>Asistente de Voz</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="voice-status" style={{ color: colorEstado[estado] || "#a8bbd0" }}>
            {etiquetaEstado[estado] || estado}
          </span>
          <button
            className="voice-minimize-btn"
            onClick={() => setMinimizado((v) => !v)}
            title={minimizado ? "Expandir" : "Minimizar"}
          >
            {minimizado ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {!minimizado && (
        <div className="voice-assistant-body">
          <div className="voice-wave-container">
            <div className={`voice-wave ${estado === "escuchando" ? "active" : ""}`}>
              {[...Array(5)].map((_, i) => <span key={i} className="voice-bar" />)}
            </div>
            <span className="voice-mic-icon">🎙️</span>
          </div>

          {texto && (
            <div className="voice-bubble input">
              <span className="voice-bubble-label">Escuché:</span>
              <p>{texto}</p>
            </div>
          )}

          {respuesta && (
            <div className="voice-bubble response">
              <span className="voice-bubble-label">Respuesta:</span>
              <p>{respuesta}</p>
            </div>
          )}

          <div className="voice-help">
            Haz una pregunta en voz alta sobre las consultas disponibles.
          </div>
        </div>
      )}
    </div>
  );
}