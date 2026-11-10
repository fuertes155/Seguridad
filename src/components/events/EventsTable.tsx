import { type Event, type Selection } from "../../types";
import { Activity, ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { kindNames } from "../../config/labels";
import { Source } from "../common/Source";
import { Badge } from "../common/Badge";
import { fmtTime } from "../../utils/format";
import { Empty } from "../common/Empty";

// Tabla reutilizada por el resumen y la búsqueda; abre la evidencia por su ID.
export function EventsTable({
  events,
  small = false,
  setSelection,
}: {
  events: Event[];
  small?: boolean;
  setSelection: (value: Selection) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="events-table">
        <thead>
          <tr>
            <th>EVENTO</th>
            <th>ORIGEN</th>
            <th>SEVERIDAD</th>
            <th>HORA</th>
            <th aria-label="Detalles" />
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              onClick={() => setSelection({ type: "event", id: e.id })}
            >
              <td>
                <div className={"event-cell " + e.severity}>
                  <span className="event-symbol">
                    {e.kind === "blocked" ? (
                      <ShieldCheck size={16} />
                    ) : e.rule_id ? (
                      <ShieldAlert size={16} />
                    ) : (
                      <Activity size={16} />
                    )}
                  </span>
                  <div>
                    <strong>{kindNames[e.kind] || e.kind}</strong>
                    <code>
                      {e.method} {e.path}
                    </code>
                  </div>
                </div>
              </td>
              <td>
                <Source source={e.source} />
              </td>
              <td>
                <Badge severity={e.severity} />
              </td>
              <td>
                <span className="mono muted">{fmtTime(e.ts)}</span>
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Ver evento ${e.id}`}
                  onClick={(ev) => {
                    // Evita que el clic del botón se propague al manejador de la misma fila.
                    ev.stopPropagation();
                    setSelection({ type: "event", id: e.id });
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && (
        <Empty
          title={
            small
              ? "Tu laboratorio está escuchando"
              : "No hay eventos para esta búsqueda"
          }
          detail={
            small
              ? "Ejecuta una prueba y observa cómo llegan las primeras señales."
              : "Ajusta los filtros o ejecuta una prueba desde el laboratorio."
          }
        />
      )}
    </div>
  );
}
