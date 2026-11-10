import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import { Check, X } from "lucide-react";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<HoneyShieldController, "toast" | "setToast">;
export function Toast({ toast, setToast }: Props) {
  return (
    <div className="toast" role="status">
      <Check size={17} />
      <span>{toast}</span>
      <button aria-label="Cerrar mensaje" onClick={() => setToast("")}>
        <X size={15} />
      </button>
    </div>
  );
}
