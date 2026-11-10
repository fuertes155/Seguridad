import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import { Hexagon } from "lucide-react";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<HoneyShieldController, "live">;
export function AppFooter({ live }: Props) {
  return (
    <footer className="main-footer">
      <span>
        <Hexagon size={12} /> HoneyShield <b>v1.0</b>
      </span>
      <span>Laboratorio académico · Evidencia antes que suposiciones</span>
      <span>
        <span className={"tiny-dot " + (!live ? "off" : "")} />
        {live ? "Conexión en vivo" : "Sin conexión en vivo"}
      </span>
    </footer>
  );
}
