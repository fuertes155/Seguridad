import React from "react";
import { useState } from "react";
import { api } from "../services/api";
import { Brand } from "../components/common/Brand";
import {
  ArrowRight,
  CircleHelp,
  Hexagon,
  LockKeyhole,
  Shield,
} from "lucide-react";

// Formulario real del analista: sus credenciales son distintas del acceso ficticio de NovaTech.
export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("analista");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Conserva el estado de la acción en curso y deshabilita controles para evitar envíos duplicados.
  const [busy, setBusy] = useState(false);
  // Evita recarga del formulario, marca la operación en curso y solo avisa onLogin tras respuesta correcta.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-screen">
      <div className="login-art">
        <Brand />
        <div className="login-copy">
          <span className="eyebrow">OBSERVA. COMPRENDE. RESPONDE.</span>
          <h1>
            La señal detrás
            <br />
            de cada intento.
          </h1>
          <p>
            Tu laboratorio de detección y respuesta.
            <br />
            Cada evento, una evidencia. Cada alerta, una explicación.
          </p>
          <div className="login-constellation">
            <Hexagon size={155} strokeWidth={0.5} />
            <Shield size={60} strokeWidth={1} />
            <span className="orbit o1" />
            <span className="orbit o2" />
            <span className="orbit o3" />
          </div>
        </div>
        <span className="login-bottom">
          HONEYSHIELD / LABORATORIO LOCAL / V1.0
        </span>
      </div>
      <div className="login-side">
        <div className="login-form">
          <span className="square-icon">
            <LockKeyhole size={23} />
          </span>
          <h2>
            Acceso al centro
            <br />
            de operaciones.
          </h2>
          <p>Inicia tu sesión de analista.</p>
          <form onSubmit={submit}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Tu contraseña local"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="button primary wide" disabled={busy}>
              {busy ? "Validando…" : "Entrar a HoneyShield"}
              <ArrowRight size={17} />
            </button>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </form>
          <div className="login-help">
            <CircleHelp size={16} />
            <p>
              Abre <strong>INICIAR-HONEYSHIELD.cmd</strong> para acceder
              automáticamente. También encontrarás tus credenciales en{" "}
              <code>.runtime/acceso.txt</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
