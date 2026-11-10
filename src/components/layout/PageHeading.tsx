import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import { ArrowDownToLine, Play } from "lucide-react";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<
  HoneyShieldController,
  "page" | "health" | "busy" | "tour" | "exportFile"
>;
export function PageHeading({ page, health, busy, tour, exportFile }: Props) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          HONEYSHIELD /{" "}
          {page === "lab"
            ? "EXPERIMENTACIÓN CONTROLADA"
            : page === "rules"
              ? "MOTOR DE DETECCIÓN"
              : "SECURITY OPERATIONS"}
        </div>
        <h1>
          {page === "overview"
            ? "Tu centro de operaciones."
            : page === "events"
              ? "Eventos en tiempo real."
              : page === "alerts"
                ? "Alertas y evidencias."
                : page === "response"
                  ? "Respuesta y contención."
                  : page === "lab"
                    ? "Pon la defensa a prueba."
                    : "Detección con criterio."}
        </h1>
        <p>
          {page === "overview"
            ? "Visibilidad en tiempo real para entender lo que ocurre en tu señuelo."
            : page === "events"
              ? "Solicitudes reales, contexto completo y evidencia trazable."
              : page === "alerts"
                ? "Revisa cada indicio antes de tomar una decisión."
                : page === "response"
                  ? "Gestiona bloqueos temporales y consulta las acciones del analista."
                  : page === "lab"
                    ? "Cinco escenarios reproducibles. Resultados reales, sin salir del entorno local."
                    : "Tres reglas explicables. Ajusta el comportamiento y evalúa sus resultados."}
        </p>
      </div>
      <div className="heading-actions">
        {page === "lab" ? (
          <button
            className="button primary"
            disabled={!!busy || !health.decoy}
            onClick={tour}
          >
            <Play size={15} />
            {busy === "tour" ? "Ejecutando recorrido…" : "Ejecutar recorrido"}
          </button>
        ) : (
          <button
            className="button secondary"
            onClick={() => exportFile("pdf")}
          >
            <ArrowDownToLine size={15} />
            Exportar informe
          </button>
        )}
      </div>
    </div>
  );
}
