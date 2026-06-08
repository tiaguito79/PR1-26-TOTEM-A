import { getApiBaseUrl } from "../services/api";

function resolvePdfUrl(pdfUrl) {
  if (!pdfUrl) return null;
  if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) return pdfUrl;
  return `${getApiBaseUrl()}${pdfUrl.startsWith("/") ? pdfUrl : `/${pdfUrl}`}`;
}

export default function FaqView({ faq, totemName }) {
  const items = faq?.items || [];
  const generalInfo = faq?.generalInfo || [];
  const rules = faq?.rules || [];
  const pdfHref = resolvePdfUrl(faq?.pdfUrl);
  const hasPdf = Boolean(pdfHref);
  const hasContent = items.length > 0 || generalInfo.length > 0;

  return (
    <div className="faq-layout">
      <header className="totem-topbar">
        <div className="topbar-left">
          <div className="totem-logo">T</div>
          <span className="totem-brand">{totemName || "TOTEM"}</span>
        </div>

        <div className="topbar-right">
          <span className="topbar-time">Preguntas Frecuentes</span>
          <span className="topbar-dot">•</span>
          <span className="topbar-icon">ℹ️</span>
        </div>
      </header>

      <section className="faq-hero">
        <div className="faq-hero-overlay" />
        <div className="faq-hero-content">
          <span className="faq-hero-tag">AYUDA</span>
          <h1>{faq?.title || "Preguntas Frecuentes"}</h1>
          <p>
            Información extraída del documento de conocimiento. Pregunta en voz alta
            sobre horarios, ubicación, contacto o cualquier consulta del PDF.
          </p>
          {hasPdf && (
            <a
              className="faq-pdf-link"
              href={pdfHref}
              target="_blank"
              rel="noreferrer"
            >
              📄 Ver documento PDF{faq.pdfName ? `: ${faq.pdfName}` : ""}
            </a>
          )}
        </div>
      </section>

      {generalInfo.length > 0 && (
        <section className="faq-section">
          <h2 className="section-title">Información General</h2>
          <div className="faq-info-grid">
            {generalInfo.map((info, index) => (
              <article className="faq-info-card" key={`${info.label}-${index}`}>
                <span className="faq-info-label">{info.label}</span>
                <p>{info.value}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="faq-section">
        <h2 className="section-title">Preguntas Frecuentes</h2>

        {items.length === 0 ? (
          <div className="faq-empty-card">
            <h3>
              {hasPdf
                ? "No se detectaron preguntas en el PDF"
                : "No hay preguntas frecuentes disponibles"}
            </h3>
            <p>
              {hasPdf
                ? "Verifica que el PDF use el formato PREGUNTA:/RESPUESTA: dentro de la sección PREGUNTAS FRECUENTES."
                : "El administrador aún no ha cargado el documento de conocimiento para este tótem."}
            </p>
          </div>
        ) : (
          <div className="faq-dashboard-grid">
            {items.map((item, index) => (
              <article className="faq-dashboard-card" key={index}>
                <div className="faq-card-top">
                  <span className="faq-bullet">•</span>
                  <span className="faq-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {rules.length > 0 && (
        <section className="faq-section faq-rules-section">
          <h2 className="section-title">Reglas del asistente</h2>
          <div className="faq-rules-list">
            {rules.map((rule, index) => (
              <p className="faq-rule-item" key={index}>
                {rule}
              </p>
            ))}
          </div>
        </section>
      )}

      {!hasContent && !hasPdf && (
        <section className="faq-section">
          <div className="faq-empty-card">
            <h3>Sin documento de conocimiento</h3>
            <p>Sube el PDF en el panel de administración al crear o editar el tótem.</p>
          </div>
        </section>
      )}
    </div>
  );
}
