import { useCallback, useEffect, useMemo, useState } from "react";

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return { timeStr, dateStr };
}

function MediaSlot({ src, type = "image", className = "", children }) {
  if (!src) {
    return (
      <div className={`tpl-media-slot tpl-media-empty ${className}`}>
        <span>Sin contenido</span>
      </div>
    );
  }

  return (
    <div className={`tpl-media-slot ${className}`}>
      {type === "image" ? (
        <img src={src} alt="" className="tpl-media-fill" draggable={false} />
      ) : (
        <video
          src={src}
          className="tpl-media-fill"
          muted
          playsInline
          loop
          autoPlay
        />
      )}
      {children}
    </div>
  );
}

function VideoPlayer({ src, index, playing, onToggle, className = "" }) {
  if (!src) return null;

  return (
    <div
      className={`tpl-video-player ${className}`}
      onClick={(e) => {
        const video = e.currentTarget.querySelector("video");
        onToggle(index, video);
      }}
    >
      <video src={src} className="tpl-media-fill" muted playsInline loop />
      <div className={`tpl-video-overlay ${playing ? "playing" : ""}`}>
        <span className="tpl-play-icon">{playing ? "❚❚" : "▶"}</span>
      </div>
    </div>
  );
}

function ImageCarousel({ images, index, onPrev, onNext, className = "" }) {
  const validImages = images.filter(Boolean);

  if (validImages.length === 0) {
    return (
      <div className={`tpl-media-slot tpl-media-empty ${className}`}>
        <span>Sin imágenes</span>
      </div>
    );
  }

  const current = validImages[index % validImages.length];

  return (
    <MediaSlot src={current} className={`tpl-carousel ${className}`}>
      {validImages.length > 1 && (
        <>
          <button
            type="button"
            className="tpl-carousel-btn left"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="tpl-carousel-btn right"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
          >
            ›
          </button>
          <div className="tpl-carousel-dots">
            {validImages.map((_, i) => (
              <span
                key={i}
                className={`tpl-dot ${i === index % validImages.length ? "active" : ""}`}
              />
            ))}
          </div>
        </>
      )}
    </MediaSlot>
  );
}

function InfoBlocks({ infoBloques }) {
  if (!infoBloques?.length) {
    return (
      <div className="tpl-info-blocks">
        <div className="tpl-info-block">
          <p className="tpl-info-title">Horarios de atención</p>
          <p>Lun - Vie: 08:00 - 18:00</p>
          <p>Sáb: 09:00 - 13:00</p>
        </div>
        <div className="tpl-info-block">
          <p className="tpl-info-title">Avisos</p>
          <p>
            Bienvenido. Abre la mano frente a la cámara para ver las preguntas
            frecuentes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tpl-info-blocks">
      {infoBloques.map((bloque, i) => (
        <div className="tpl-info-block" key={i}>
          <p className="tpl-info-title">{bloque.titulo}</p>
          {bloque.contenido.split("\n").map((line, j) => (
            <p key={j}>{line}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function TemplateShell({ totem, children }) {
  const { timeStr, dateStr } = useClock();

  return (
    <div className="template-layout">
      <header className="totem-topbar">
        <div className="topbar-left">
          <div className="totem-logo">T</div>
          <div className="topbar-titles">
            <span className="totem-brand">TOTEM</span>
            <span className="totem-subtitle">{totem?.nombre || "Pantalla"}</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="topbar-time">{timeStr}</span>
          <span className="topbar-dot">•</span>
          <span className="topbar-date">{dateStr}</span>
        </div>
      </header>

      {totem?.plantillaNombre && (
        <div className="template-badge">{totem.plantillaNombre}</div>
      )}

      <div className="template-body">{children}</div>
    </div>
  );
}

function ClasicaLayout({ carouselImages, videoSlots, carouselIndex, goPrev, goNext, videoPlaying, toggleVideo, infoBloques }) {
  return (
    <>
      <div className="tpl-media-stack">
        <ImageCarousel
          images={carouselImages}
          index={carouselIndex}
          onPrev={goPrev}
          onNext={goNext}
          className="h-carousel-md"
        />
        <VideoPlayer
          src={videoSlots[0]}
          index={0}
          playing={!!videoPlaying[0]}
          onToggle={toggleVideo}
          className="h-video-sm"
        />
      </div>
      <InfoBlocks infoBloques={infoBloques} />
    </>
  );
}

function EventosLayout({ carouselImages, videoSlots, carouselIndex, goPrev, goNext, videoPlaying, toggleVideo, infoBloques }) {
  return (
    <>
      <div className="tpl-media-stack">
        <ImageCarousel
          images={carouselImages}
          index={carouselIndex}
          onPrev={goPrev}
          onNext={goNext}
          className="h-carousel-md"
        />
        <div className="tpl-video-row">
          <VideoPlayer
            src={videoSlots[0]}
            index={0}
            playing={!!videoPlaying[0]}
            onToggle={toggleVideo}
            className="h-video-xs"
          />
          <VideoPlayer
            src={videoSlots[1]}
            index={1}
            playing={!!videoPlaying[1]}
            onToggle={toggleVideo}
            className="h-video-xs"
          />
        </div>
      </div>
      <InfoBlocks infoBloques={infoBloques} />
    </>
  );
}

function PromocionalLayout({ imageSlots, videoSlots, videoPlaying, toggleVideo, infoBloques }) {
  return (
    <>
      <div className="tpl-media-stack">
        {imageSlots[0] && (
          <MediaSlot src={imageSlots[0]} className="h-hero-lg">
            <div className="tpl-promo-overlay" />
            <div className="tpl-promo-caption">
              <p className="tpl-promo-title">Oferta Especial</p>
              <p className="tpl-promo-sub">Promoción por tiempo limitado</p>
            </div>
          </MediaSlot>
        )}
        {imageSlots[1] && <MediaSlot src={imageSlots[1]} className="h-banner-sm" />}
        <VideoPlayer
          src={videoSlots[0]}
          index={0}
          playing={!!videoPlaying[0]}
          onToggle={toggleVideo}
          className="h-video-sm"
        />
      </div>
      <InfoBlocks infoBloques={infoBloques} />
    </>
  );
}

function MinimalLayout({ carouselImages, carouselIndex, goPrev, goNext, infoBloques }) {
  return (
    <>
      <ImageCarousel
        images={carouselImages}
        index={carouselIndex}
        onPrev={goPrev}
        onNext={goNext}
        className="h-carousel-lg"
      />
      <InfoBlocks infoBloques={infoBloques} />
    </>
  );
}

function CorporativaLayout({ carouselImages, videoSlots, carouselIndex, goPrev, goNext, videoPlaying, toggleVideo, infoBloques }) {
  return (
    <>
      <div className="tpl-media-stack">
        <ImageCarousel
          images={carouselImages}
          index={carouselIndex}
          onPrev={goPrev}
          onNext={goNext}
          className="h-carousel-md"
        />
        <div className="tpl-video-row">
          <VideoPlayer
            src={videoSlots[0]}
            index={0}
            playing={!!videoPlaying[0]}
            onToggle={toggleVideo}
            className="h-video-xs"
          />
          <VideoPlayer
            src={videoSlots[1]}
            index={1}
            playing={!!videoPlaying[1]}
            onToggle={toggleVideo}
            className="h-video-xs"
          />
        </div>
      </div>
      <InfoBlocks infoBloques={infoBloques} />
    </>
  );
}

function DirectorioLayout({ videoSlots, videoPlaying, toggleVideo, infoBloques }) {
  return (
    <>
      <div className="tpl-directorio-header">
        <p className="tpl-directorio-title">Directorio de Servicios</p>
        <p className="tpl-directorio-sub">Ubicaciones y contactos</p>
      </div>
      <VideoPlayer
        src={videoSlots[0]}
        index={0}
        playing={!!videoPlaying[0]}
        onToggle={toggleVideo}
        className="h-video-lg"
      />
      <InfoBlocks infoBloques={infoBloques} />
    </>
  );
}

export default function TotemTemplateView({ totem, media }) {
  const templateId = totem?.plantillaId || "clasica";
  const imageSlots = media?.images || [];
  const videoSlots = media?.videos || [];
  const infoBloques = totem?.info_bloques || [];

  const carouselImages = useMemo(
    () => imageSlots.filter(Boolean),
    [imageSlots]
  );

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState({});

  useEffect(() => {
    setCarouselIndex(0);
    setVideoPlaying({});
  }, [templateId, imageSlots, videoSlots]);

  useEffect(() => {
    if (carouselImages.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const goPrev = useCallback(() => {
    setCarouselIndex(
      (prev) => (prev - 1 + carouselImages.length) % carouselImages.length
    );
  }, [carouselImages.length]);

  const goNext = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  }, [carouselImages.length]);

  const toggleVideo = useCallback((index, videoEl) => {
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
      setVideoPlaying((p) => ({ ...p, [index]: true }));
    } else {
      videoEl.pause();
      setVideoPlaying((p) => ({ ...p, [index]: false }));
    }
  }, []);

  const layoutProps = {
    carouselImages,
    imageSlots,
    videoSlots,
    carouselIndex,
    goPrev,
    goNext,
    videoPlaying,
    toggleVideo,
    infoBloques,
  };

  let content;
  switch (templateId) {
    case "directorio":
      content = <DirectorioLayout {...layoutProps} />;
      break;
    case "promocional":
      content = <PromocionalLayout {...layoutProps} />;
      break;
    case "minimal":
      content = <MinimalLayout {...layoutProps} />;
      break;
    case "eventos":
      content = <EventosLayout {...layoutProps} />;
      break;
    case "corporativa":
      content = <CorporativaLayout {...layoutProps} />;
      break;
    default:
      content = <ClasicaLayout {...layoutProps} />;
  }

  return <TemplateShell totem={totem}>{content}</TemplateShell>;
}
