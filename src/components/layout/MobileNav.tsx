import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import { nav } from "../../config/navigation";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<HoneyShieldController, "page" | "changePage">;
export function MobileNav({ page, changePage }: Props) {
  return (
    <nav className="mobile-nav" aria-label="Navegación rápida">
      {nav
        .filter((n) => ["overview", "events", "alerts", "lab"].includes(n.id))
        .map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => changePage(n.id)}
          >
            <n.icon size={20} />
            <span>
              {n.id === "overview"
                ? "Inicio"
                : n.id === "events"
                  ? "Eventos"
                  : n.label}
            </span>
          </button>
        ))}
    </nav>
  );
}
