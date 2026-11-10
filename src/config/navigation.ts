import { type Page } from "../types";
import {
  Activity,
  FlaskConical,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

// Una misma definición alimenta la navegación de escritorio y móvil.
export const nav: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Vista general", icon: LayoutDashboard },
  { id: "events", label: "Eventos en vivo", icon: Activity },
  { id: "alerts", label: "Alertas", icon: ShieldAlert },
  { id: "response", label: "Respuesta", icon: ShieldCheck },
  { id: "lab", label: "Laboratorio", icon: FlaskConical },
  { id: "rules", label: "Reglas de detección", icon: SlidersHorizontal },
];
