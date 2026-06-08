export default function TotemMaintenanceView({
  totem,
  mode = "maintenance",
  onBackToLogin,
  onRetry,
}) {
  const isInactive = mode === "inactive";

  return (
    <div className="totem-maintenance">
      <div className="totem-maintenance-card">
        <span className="totem-maintenance-icon">{isInactive ? "⏸️" : "🛠️"}</span>
        <h1>{isInactive ? "Tótem inactivo" : "Tótem en mantenimiento"}</h1>
        <p>
          <strong>{totem?.nombre || "Dispositivo"}</strong>{" "}
          {isInactive
            ? "no está habilitado para mostrar contenido."
            : "está temporalmente fuera de servicio."}
        </p>
        <p className="totem-maintenance-sub">
          {isInactive ? (
            <>
              El administrador debe cambiar el estado a <strong>Activo</strong> en el panel.
              Luego puedes volver a iniciar sesión con las credenciales del tótem.
            </>
          ) : (
            <>
              El acceso fue verificado correctamente. Cuando el administrador cambie el estado
              a <strong>Activo</strong>, pulsa <strong>Reintentar</strong> o inicia sesión de nuevo.
            </>
          )}
        </p>
        {totem?.totem_id && (
          <code className="totem-maintenance-code">{totem.totem_id}</code>
        )}

        <div className="totem-maintenance-actions">
          {onRetry && (
            <button type="button" className="totem-maintenance-btn secondary" onClick={onRetry}>
              Reintentar
            </button>
          )}
          {onBackToLogin && (
            <button type="button" className="totem-maintenance-btn primary" onClick={onBackToLogin}>
              Volver e iniciar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
