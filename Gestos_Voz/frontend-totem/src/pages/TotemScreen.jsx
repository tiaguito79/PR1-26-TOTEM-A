// src/pages/TotemScreen.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import FaqView from "../components/FaqView";
import GestureDetector from "../components/GestureDetector";
import VoiceAssistant from "../components/VoiceAssistant";
import TotemTemplateView from "../components/TotemTemplateView";
import { getConfiguredTotemId, getTotemDisplay } from "../services/api";

export default function TotemScreen() {
  const [showFaq, setShowFaq] = useState(false);
  const [totem, setTotem] = useState(null);
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [faq, setFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timeoutRef = useRef(null);

  const TOTEM_ID = getConfiguredTotemId();

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getTotemDisplay(TOTEM_ID);
        setTotem(data.totem || null);
        setMedia(data.media || { images: [], videos: [] });
        setFaq(data.faq || null);
        setError("");
        console.log(
          "Tótem cargado:",
          data.totem?.nombre,
          data.totem?.plantillaId,
          data.faq
        );
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError(err.message || "No se pudo cargar el tótem");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const activarFAQ = useCallback(() => {
    setShowFaq(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowFaq(false), 30000);
  }, []);

  const extenderSesionFaq = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowFaq(false), 30000);
  }, []);

  if (loading) {
    return (
      <div className="screen-center">
        <h1>Cargando información del tótem...</h1>
      </div>
    );
  }

  if (error && !totem) {
    return (
      <div className="screen-center">
        <h1>No se pudo conectar con el tótem</h1>
        <p>{error}</p>
        <p>Verifica VITE_API_URL y VITE_TOTEM_ID en las variables de entorno.</p>
      </div>
    );
  }

  return (
    <div className="totem-screen">
      {showFaq ? (
        <>
          <FaqView faq={faq} totemName={totem?.nombre} />
          <VoiceAssistant
            onActivarFaq={extenderSesionFaq}
            faqData={faq}
          />
        </>
      ) : (
        <TotemTemplateView totem={totem} media={media} />
      )}
      <GestureDetector onDetect={activarFAQ} />
    </div>
  );
}