export default function TotemMaintenanceView({ totem }) {
  return (
    <div className="totem-maintenance">
      <div className="totem-maintenance-card">
        <span className="totem-maintenance-icon">🛠️</span>
        <h1>Tótem en mantenimiento</h1>
        <p>
          <strong>{totem?.nombre || "Dispositivo"}</strong> está temporalmente fuera de
          servicio.
        </p>
        <p className="totem-maintenance-sub">
          El acceso fue verificado correctamente. Cuando el administrador cambie el estado
          a <strong>Activo</strong>, el contenido se mostrará automáticamente al recargar.
        </p>
        {totem?.totem_id && (
          <code className="totem-maintenance-code">{totem.totem_id}</code>
        )}
      </div>
    </div>
  );
}
