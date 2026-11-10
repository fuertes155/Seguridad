import { Hexagon } from "lucide-react";

// Componente reutilizable de identidad visual; compact oculta el nombre cuando hay poco espacio.
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Hexagon size={29} strokeWidth={1.6} />
        <span>H</span>
      </div>
      {!compact && (
        <div>
          Honey<span>Shield</span>
          <small>SECURITY OPERATIONS</small>
        </div>
      )}
    </div>
  );
}
