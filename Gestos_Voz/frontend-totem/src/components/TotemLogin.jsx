import { useState } from "react";
import { loginTotem } from "../services/api";
import { setTotemSession } from "../utils/totemSession";

export default function TotemLogin({ onLoginSuccess, errorMessage = "" }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorMessage);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await loginTotem(usuario.trim(), contrasena);
      setTotemSession(data.token, data.totem);
      onLoginSuccess?.(data);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="totem-login">
      <div className="totem-login-card">
        <span className="totem-selector-tag">ACCESO TÓTEM</span>
        <h1>Iniciar sesión del dispositivo</h1>
        <p className="totem-login-lead">
          Usa el <strong>usuario</strong> y la <strong>contraseña</strong> que el
          administrador generó al crear este tótem en el panel.
        </p>

        {(error || errorMessage) && (
          <div className="totem-selector-alert">
            <strong>No se pudo acceder al tótem</strong>
            <p>{error || errorMessage}</p>
          </div>
        )}

        <form className="totem-login-form" onSubmit={handleSubmit}>
          <label htmlFor="totem-user">Usuario del tótem</label>
          <input
            id="totem-user"
            type="text"
            autoComplete="username"
            placeholder="Ej: TOTEM_IYCH"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />

          <label htmlFor="totem-pass">Contraseña</label>
          <div className="totem-login-password-row">
            <input
              id="totem-pass"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Contraseña segura"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
            <button
              type="button"
              className="totem-login-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button type="submit" className="totem-login-submit" disabled={loading}>
            {loading ? "Verificando..." : "Entrar al tótem"}
          </button>
        </form>

        <p className="totem-login-footnote">
          Cada pantalla física debe usar sus propias credenciales. Si las perdiste,
          solicítalas al administrador del campus.
        </p>
      </div>
    </div>
  );
}
