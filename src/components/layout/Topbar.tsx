import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import {
  Bell,
  ChevronRight,
  ExternalLink,
  Menu,
  Moon,
  Sun,
} from "lucide-react";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<
  HoneyShieldController,
  | "theme"
  | "setTheme"
  | "changePage"
  | "setSidebar"
  | "data"
  | "currentNav"
  | "m"
>;
export function Topbar({
  theme,
  setTheme,
  changePage,
  setSidebar,
  data,
  currentNav,
  m,
}: Props) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          aria-label="Abrir menú"
          onClick={() => setSidebar(true)}
        >
          <Menu size={20} />
        </button>
        <span>Espacio de trabajo</span>
        <ChevronRight size={13} />
        <strong>{currentNav.label}</strong>
      </div>
      <div className="topbar-right">
        {data && (
          <a
            className="portal-shortcut"
            href={data.decoy_url}
            target="_blank"
            rel="noreferrer"
          >
            Abrir NovaTech <ExternalLink size={14} />
          </a>
        )}
        <span className="environment">
          <span className="tiny-dot" /> ENTORNO LOCAL
        </span>
        <div className="topbar-divider" />
        <button
          className="icon-button theme-toggle"
          aria-label={
            theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
          }
          title={theme === "light" ? "Modo oscuro" : "Modo claro"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          className="notification-button"
          aria-label="Ver alertas pendientes"
          onClick={() => changePage("alerts")}
        >
          <Bell size={18} />
          {m.open_alerts > 0 && <i />}
        </button>
        <div className="avatar small">SL</div>
      </div>
    </header>
  );
}
