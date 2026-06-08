// src/pages/TotemScreen.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import AdCarousel from "../components/AdCarousel";
import FaqView from "../components/FaqView";
import GestureDetector from "../components/GestureDetector";
import VoiceAssistant from "../components/VoiceAssistant";
import { getConfiguredTotemId, getTotemDisplay } from "../services/api";

export default function TotemScreen() {
  const [showFaq, setShowFaq] = useState(false);
  const [ads, setAds] = useState([]);
  const [faq, setFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  const TOTEM_ID = getConfiguredTotemId();

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getTotemDisplay(TOTEM_ID);
        setAds(Array.isArray(data.ads) ? data.ads : []);
        setFaq(data.faq || null);
        console.log("Tótem cargado:", data.totem?.nombre, data.faq);
      } catch (error) {
        console.error("Error cargando datos:", error);
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
    timeoutRef.current = setTimeout(() => setShowFaq(false), 15000);
  }, []);

  if (loading) {
    return (
      <div className="screen-center">
        <h1>Cargando información del tótem...</h1>
      </div>
    );
  }

  return (
    <div className="totem-screen">
      {showFaq ? <FaqView faq={faq} /> : <AdCarousel ads={ads} />}
      <GestureDetector onDetect={activarFAQ} />
      <VoiceAssistant onActivarFaq={activarFAQ} faqData={faq} />
    </div>
  );
}