import { getApiBaseUrl } from "../services/api";

function resolvePdfUrl(pdfUrl) {
  if (!pdfUrl) return null;
  if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) return pdfUrl;
  return `${getApiBaseUrl()}${pdfUrl.startsWith("/") ? pdfUrl : `/${pdfUrl}`}`;
}

export default function FaqView({ faq, totemName }) {
  const items = faq?.items || [];
  const pdfHref = resolvePdfUrl(faq?.pdfUrl);
  const hasPdf = Boolean(pdfHref);

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
            Pregunta en voz alta o consulta el documento PDF cargado por el
            administrador.
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

      <section className="faq-section">
        <h2 className="section-title">Consultas Disponibles</h2>

        {items.length === 0 ? (
          <div className="faq-empty-card">
            <h3>
              {hasPdf
                ? "Pregunta con voz sobre el PDF cargado"
                : "No hay preguntas frecuentes disponibles"}
            </h3>
            <p>
              {hasPdf
                ? "El asistente de voz buscará respuestas en el contenido del PDF. También puedes abrir el documento desde el enlace superior."
                : "El administrador aún no ha cargado información para este tótem."}
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
    </div>
  );
}