// src/pages/TotemScreen.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import FaqView from "../components/FaqView";
import GestureDetector from "../components/GestureDetector";
import VoiceAssistant from "../components/VoiceAssistant";
import TotemTemplateView from "../components/TotemTemplateView";
import { getTotemDisplay } from "../services/api";
import { resolveTotemRef } from "../utils/totemRef";
import TotemSelector from "../components/TotemSelector";

export default function TotemScreen() {
  const [showFaq, setShowFaq] = useState(false);
  const [totem, setTotem] = useState(null);
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [faq, setFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totemRef, setTotemRef] = useState("");
  const [needsSelection, setNeedsSelection] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const ref = resolveTotemRef();
    setTotemRef(ref);

    if (!ref) {
      setNeedsSelection(true);
      setLoading(false);
      return undefined;
    }

    const loadData = async () => {
      try {
        const data = await getTotemDisplay(ref);
        setTotem(data.totem || null);
        setMedia(data.media || { images: [], videos: [] });
        setFaq(data.faq || null);
        setError("");
        setNeedsSelection(false);
        console.log(
          "Tótem cargado:",
          data.totem?.nombre,
          data.totem?.plantillaId,
          data.faq
        );
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError(err.message || "No se pudo cargar el tótem");
        setNeedsSelection(true);
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

  if (needsSelection) {
    return (
      <TotemSelector errorMessage={error} attemptedRef={totemRef} />
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