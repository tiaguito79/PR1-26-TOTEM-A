// src/pages/TotemScreen.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import FaqView from "../components/FaqView";
import GestureDetector from "../components/GestureDetector";
import VoiceAssistant from "../components/VoiceAssistant";
import TotemTemplateView from "../components/TotemTemplateView";
import TotemLogin from "../components/TotemLogin";
import TotemMaintenanceView from "../components/TotemMaintenanceView";
import { getTotemDisplaySession } from "../services/api";
import {
  clearTotemSession,
  getTotemSessionToken,
} from "../utils/totemSession";

export default function TotemScreen() {
  const [showFaq, setShowFaq] = useState(false);
  const [totem, setTotem] = useState(null);
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [faq, setFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const timeoutRef = useRef(null);

  const loadTotemData = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getTotemSessionToken();
    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }

    try {
      const data = await getTotemDisplaySession();
      setTotem(data.totem || null);
      setMedia(data.media || { images: [], videos: [] });
      setFaq(data.faq || null);
      setNeedsLogin(false);
      console.log(
        "Tótem cargado:",
        data.totem?.nombre,
        data.totem?.plantillaId,
        data.faq
      );
    } catch (err) {
      console.error("Error cargando datos:", err);
      if (
        err.message?.includes("401") ||
        err.message?.toLowerCase().includes("sesión") ||
        err.message?.toLowerCase().includes("autorizado")
      ) {
        clearTotemSession();
      }
      setError(err.message || "No se pudo cargar el tótem");
      setNeedsLogin(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTotemData();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loadTotemData]);

  const activarFAQ = useCallback(() => {
    setShowFaq(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowFaq(false), 30000);
  }, []);

  const extenderSesionFaq = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowFaq(false), 30000);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    loadTotemData();
  }, [loadTotemData]);

  if (loading) {
    return (
      <div className="screen-center">
        <h1>Cargando información del tótem...</h1>
      </div>
    );
  }

  if (needsLogin) {
    return <TotemLogin onLoginSuccess={handleLoginSuccess} errorMessage={error} />;
  }

  if (totem?.estado === "En Mantenimiento") {
    return <TotemMaintenanceView totem={totem} />;
  }

  if (totem?.estado === "Inactivo") {
    return (
      <TotemMaintenanceView
        totem={{
          ...totem,
          nombre: `${totem.nombre} (inactivo)`,
        }}
      />
    );
  }

  return (
    <div className="totem-screen">
      {showFaq ? (
        <>
          <FaqView faq={faq} totemName={totem?.nombre} />
          <VoiceAssistant onActivarFaq={extenderSesionFaq} faqData={faq} />
        </>
      ) : (
        <TotemTemplateView totem={totem} media={media} />
      )}
      <GestureDetector onDetect={activarFAQ} />
    </div>
  );
}
