import { useEffect, useState } from "react";
import { getTotemCatalog } from "../services/api";
import { buildTotemUrl, openTotemRef, resolveTotemRef } from "../utils/totemRef";

export default function TotemSelector({ errorMessage = "", attemptedRef = "" }) {
  const [totems, setTotems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [manualRef, setManualRef] = useState(attemptedRef || resolveTotemRef());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTotemCatalog();
        setTotems(Array.isArray(data.totems) ? data.totems : []);
        setListError("");
      } catch (err) {
        setListError(err.message || "No se pudo cargar la lista de tótems");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    if (manualRef.trim()) openTotemRef(manualRef);
  };

  return (
    <div className="totem-selector">
      <div className="totem-selector-card">
        <span className="totem-selector-tag">PANTALLA TÓTEM</span>
        <h1>Selecciona el tótem a mostrar</h1>
        <p className="totem-selector-lead">
          Cada dispositivo puede mostrar un tótem distinto. Elige uno de la lista
          o usa el código <strong>totem_id</strong> del panel de administración.
        </p>

        {errorMessage && (
          <div className="totem-selector-alert">
            <strong>No se pudo cargar el tótem{attemptedRef ? ` "${attemptedRef}"` : ""}.</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        <form className="totem-selector-form" onSubmit={handleManualSubmit}>
          <label htmlFor="totem-ref-input">Código del tótem</label>
          <div className="totem-selector-form-row">
            <input
              id="totem-ref-input"
              type="text"
              placeholder="Ej: TOTEM-4521 o MongoDB _id"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
            />
            <button type="submit">Abrir</button>
          </div>
          <p className="totem-selector-hint">
            También puedes usar la URL:{" "}
            <code>{buildTotemUrl("TOTEM-4521")}</code>
          </p>
        </form>

        <div className="totem-selector-list-header">
          <h2>Tótems activos</h2>
          <span>{loading ? "..." : `${totems.length} disponibles`}</span>
        </div>

        {loading && <p className="totem-selector-status">Cargando tótems...</p>}
        {listError && <p className="totem-selector-status error">{listError}</p>}

        {!loading && !listError && totems.length === 0 && (
          <p className="totem-selector-status">
            No hay tótems activos. Crea uno en el panel de administración.
          </p>
        )}

        <div className="totem-selector-grid">
          {totems.map((totem) => (
            <button
              key={totem.id}
              type="button"
              className="totem-selector-item"
              onClick={() => openTotemRef(totem.totem_id || totem.id)}
            >
              <div className="totem-selector-item-top">
                <strong>{totem.nombre}</strong>
                <span>{totem.plantillaNombre || totem.plantilla}</span>
              </div>
              <code>{totem.totem_id}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
