import { type HoneyShieldController } from "../../hooks/useHoneyShield";
import {
  CheckCheck,
  CircleHelp,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "../common/Badge";
import { kindNames } from "../../config/labels";
import { Source } from "../common/Source";
import { fmtDate, fmtTime } from "../../utils/format";

// Presenta esta parte de la interfaz y delega las acciones al controlador.
type Props = Pick<
  HoneyShieldController,
  | "setSelection"
  | "busy"
  | "block"
  | "resolve"
  | "activeBlocks"
  | "selectedEvent"
  | "selectedAlert"
>;
export function EvidenceDrawer({
  setSelection,
  busy,
  block,
  resolve,
  activeBlocks,
  selectedEvent,
  selectedAlert,
}: Props) {
  return (
    <div className="drawer-overlay" onClick={() => setSelection(null)}>
      <section
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-heading">
          <span className="eyebrow">EVIDENCIA DEL LABORATORIO</span>
          <button
            className="icon-button"
            aria-label="Cerrar detalles"
            onClick={() => setSelection(null)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="detail-icon">
          <ShieldAlert size={28} />
        </div>
        <div className="detail-meta">
          <Badge severity={(selectedAlert || selectedEvent)!.severity} />
          <code>
            {selectedAlert
              ? `HS-${String(selectedAlert.id).padStart(4, "0")}`
              : `EV-${String(selectedEvent!.id).padStart(4, "0")}`}
          </code>
        </div>
        <h2 id="detail-title">
          {selectedAlert?.title || kindNames[selectedEvent!.kind]}
        </h2>
        <p className="detail-description">
          {selectedAlert?.evidence || selectedEvent?.detail}
        </p>
        <dl className="detail-fields">
          <div>
            <dt>Origen observado</dt>
            <dd>
              <Source source={(selectedAlert || selectedEvent)!.source} />
            </dd>
          </div>
          <div>
            <dt>Fecha y hora</dt>
            <dd>
              {fmtDate((selectedAlert || selectedEvent)!.ts)} ·{" "}
              {fmtTime((selectedAlert || selectedEvent)!.ts)}
            </dd>
          </div>
          <div>
            <dt>Regla</dt>
            <dd>
              <code>
                {(selectedAlert || selectedEvent)!.rule_id ||
                  "Sin regla activada"}
              </code>
            </dd>
          </div>
          {selectedEvent && (
            <>
              <div>
                <dt>Solicitud</dt>
                <dd>
                  <code>
                    {selectedEvent.method} {selectedEvent.path}
                  </code>
                </dd>
              </div>
              <div>
                <dt>Respuesta HTTP</dt>
                <dd>{selectedEvent.status}</dd>
              </div>
            </>
          )}
          {selectedAlert && (
            <>
              <div>
                <dt>Evento de origen</dt>
                <dd>EV-{String(selectedAlert.event_id).padStart(4, "0")}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {selectedAlert.status === "open"
                    ? "Pendiente de revisión"
                    : "Resuelta"}
                </dd>
              </div>
            </>
          )}
        </dl>
        <div className="detail-note">
          <CircleHelp size={17} />
          <p>
            Una alerta describe una coincidencia con una regla. No confirma
            acceso exitoso ni identifica a una persona.
          </p>
        </div>
        <div className="drawer-actions">
          {selectedAlert?.status === "open" && (
            <button
              className="button primary wide"
              disabled={!!busy}
              onClick={() => resolve(selectedAlert.id)}
            >
              <CheckCheck size={16} />
              Marcar como revisada
            </button>
          )}
          <button
            className="button secondary wide"
            disabled={
              !!busy ||
              activeBlocks.some(
                (b) => b.source === (selectedAlert || selectedEvent)!.source,
              )
            }
            onClick={() => block((selectedAlert || selectedEvent)!.source)}
          >
            <ShieldCheck size={16} />
            {activeBlocks.some(
              (b) => b.source === (selectedAlert || selectedEvent)!.source,
            )
              ? "Origen contenido"
              : "Bloquear origen · 5 min"}
          </button>
        </div>
      </section>
    </div>
  );
}
