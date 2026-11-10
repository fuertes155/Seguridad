import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import {
  ArrowUpRight,
  FlaskConical,
  Hexagon,
  LogOut,
  Radio,
  X,
} from "lucide-react";
import { Brand } from "../common/Brand";
import { nav } from "../../config/navigation";
import { api } from "../../services/api";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<
  HoneyShieldController,
  | "setSigned"
  | "page"
  | "changePage"
  | "sidebar"
  | "setSidebar"
  | "live"
  | "health"
  | "act"
  | "m"
>;
export function Sidebar({
  setSigned,
  page,
  changePage,
  sidebar,
  setSidebar,
  live,
  health,
  act,
  m,
}: Props) {
  return (
    <aside className={"sidebar " + (sidebar ? "open" : "")}>
      <button
        className="icon-button sidebar-close"
        aria-label="Cerrar navegación"
        onClick={() => setSidebar(false)}
      >
        <X size={17} />
      </button>
      <Brand />
      <div className="workspace-label">
        <span className="workspace-icon">
          <Hexagon size={15} />
        </span>
        <div>
          Laboratorio académico<small>Entorno local</small>
        </div>
        <span className="workspace-badge">LAB</span>
      </div>
      <div className="nav-label">CENTRO DE OPERACIONES</div>
      <nav>
        {nav.slice(0, 4).map((n) => (
          <button
            key={n.id}
            className={"nav-item " + (page === n.id ? "selected" : "")}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => changePage(n.id)}
          >
            <n.icon size={18} />
            <span>{n.label}</span>
            {n.id === "alerts" && m.open_alerts > 0 && <b>{m.open_alerts}</b>}
            {n.id === "events" && live && <i className="tiny-dot" />}
          </button>
        ))}
        <div className="nav-divider" />
        <div className="nav-label">ENTORNO DE PRUEBAS</div>
        {nav.slice(4).map((n) => (
          <button
            key={n.id}
            className={"nav-item " + (page === n.id ? "selected" : "")}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => changePage(n.id)}
          >
            <n.icon size={18} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-guide" onClick={() => changePage("lab")}>
          <FlaskConical size={18} />
          <span>
            De la teoría a la práctica<small>Prepara tu demostración</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <div className="sensor-status">
          <span className={"status-light " + (health.decoy ? "" : "off")} />
          <div>
            Portal NovaTech
            <small>
              {health.decoy ? "Señuelo conectado" : "Esperando al señuelo"}
            </small>
          </div>
          <Radio size={15} />
        </div>
        <div className="analyst">
          <div className="avatar">SL</div>
          <div>
            Analista local<small>Administrador</small>
          </div>
          <button
            className="icon-button"
            aria-label="Cerrar sesión"
            onClick={() =>
              act(
                "logout",
                async () => {
                  await api("/auth/logout", { method: "POST" });
                  setSigned(false);
                },
                "Sesión cerrada.",
              )
            }
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
