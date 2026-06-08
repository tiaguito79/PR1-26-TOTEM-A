export default function FaqView({ faq, totemName }) {
  const items = faq?.items || [];

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
            Encuentra respuestas rápidas a las dudas más comunes de los usuarios
            del tótem.
          </p>
        </div>
      </section>

      <section className="faq-section">
        <h2 className="section-title">Consultas Disponibles</h2>

        {items.length === 0 ? (
          <div className="faq-empty-card">
            <h3>No hay preguntas frecuentes disponibles</h3>
            <p>
              El administrador aún no ha cargado información para este tótem.
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