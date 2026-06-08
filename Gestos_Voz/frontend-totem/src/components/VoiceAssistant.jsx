// src/components/VoiceAssistant.jsx
import { useEffect, useRef, useState } from "react";
import { iniciarReconocimiento, detenerReconocimiento } from "../services/speechService";

export default function VoiceAssistant({ onActivarFaq, faqData }) {
  const [estado, setEstado] = useState("iniciando");
  const [texto, setTexto] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [expandido, setExpandido] = useState(false);

  const onActivarFaqRef = useRef(onActivarFaq);
  const faqDataRef = useRef(null);

  useEffect(() => { onActivarFaqRef.current = onActivarFaq; }, [onActivarFaq]);
  useEffect(() => { faqDataRef.current = faqData; }, [faqData]);

  useEffect(() => {
    iniciarReconocimiento(
      setEstado,
      setTexto,
      setRespuesta,
      () => onActivarFaqRef.current?.(),
      () => faqDataRef.current
    );
    return () => detenerReconocimiento();
  }, []);

  useEffect(() => {
    if (texto || respuesta) setExpandido(true);
  }, [texto, respuesta]);

  const etiquetaEstado = {
    iniciando: "Iniciando",
    escuchando: "Escuchando",
    detectado: "Respondiendo",
    esperando: "Listo",
    error: "Sin micrófono",
    no_soportado: "No soportado",
  };

  const estadoClase = {
    iniciando: "idle",
    escuchando: "listening",
    detectado: "speaking",
    esperando: "idle",
    error: "error",
    no_soportado: "error",
  };

  return (
    <div className={`voice-avatar-widget ${expandido ? "expanded" : ""}`}>
      <button
        type="button"
        className="voice-avatar-trigger"
        onClick={() => setExpandido((v) => !v)}
        aria-label="Asistente de voz"
      >
        <div className={`voice-avatar-ring ${estadoClase[estado] || "idle"}`}>
          <div className="voice-avatar-face">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="url(#avatarGradient)" />
              <ellipse cx="32" cy="38" rx="16" ry="12" fill="rgba(255,255,255,0.18)" />
              <circle cx="24" cy="28" r="4" fill="#ffffff" />
              <circle cx="40" cy="28" r="4" fill="#ffffff" />
              <circle cx="24" cy="28" r="2" fill="#0d2b45" />
              <circle cx="40" cy="28" r="2" fill="#0d2b45" />
              <path
                d="M24 42 Q32 48 40 42"
                stroke="#ffffff"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="avatarGradient" x1="0" y1="0" x2="64" y2="64">
                  <stop offset="0%" stopColor="#1ec8ff" />
                  <stop offset="100%" stopColor="#00e8d0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <span className="voice-avatar-label">Asistente</span>
        <span className={`voice-avatar-status ${estadoClase[estado] || "idle"}`}>
          {etiquetaEstado[estado] || estado}
        </span>
      </button>

      {expandido && (
        <div className="voice-avatar-panel">
          <div className="voice-avatar-panel-header">
            <span>Asistente de Voz</span>
            <button
              type="button"
              className="voice-avatar-close"
              onClick={() => setExpandido(false)}
              aria-label="Cerrar panel"
            >
              ×
            </button>
          </div>

          <div className="voice-wave-container">
            <div className={`voice-wave ${estado === "escuchando" ? "active" : ""}`}>
              {[...Array(5)].map((_, i) => <span key={i} className="voice-bar" />)}
            </div>
          </div>

          {texto && (
            <div className="voice-bubble input">
              <span className="voice-bubble-label">Escuché</span>
              <p>{texto}</p>
            </div>
          )}

          {respuesta && (
            <div className="voice-bubble response">
              <span className="voice-bubble-label">Respuesta</span>
              <p>{respuesta}</p>
            </div>
          )}

          {!texto && !respuesta && (
            <p className="voice-help">
              Pregunta en voz alta sobre horarios, ubicación o contacto.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
