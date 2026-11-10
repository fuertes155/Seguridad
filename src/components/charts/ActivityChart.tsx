import { type State } from "../../types";
import { fmtTime } from "../../utils/format";

// Dibuja barras por intervalo de dos horas; las alturas se normalizan según el máximo observado.
export function ActivityChart({ history }: { history: State["history"] }) {
  // Mínimo de escala 4 evita una escala nula; una barra positiva tiene altura mínima visible.
  const max = Math.max(4, ...history.map((h) => h.events));
  return (
    <div
      className="activity-chart"
      role="img"
      aria-label={
        "Eventos por intervalos de dos horas: " +
        history
          .map(
            (h) =>
              `${fmtTime(h.ts)}: ${h.events} eventos y ${h.alerts} alertas`,
          )
          .join("; ")
      }
    >
      <div className="chart-grid">
        {[1, 0.75, 0.5, 0.25, 0].map((v) => (
          <div key={v}>
            <span>{Math.round(max * v)}</span>
            <i />
          </div>
        ))}
      </div>
      <div className="chart-bars">
        {history.map((h, i) => (
          <div className="chart-bin" key={i}>
            <div
              className="bar-pair"
              title={`${h.events} eventos · ${h.alerts} alertas`}
            >
              <span
                className="bar events"
                style={{
                  height:
                    Math.max(h.events ? 2 : 0, (h.events / max) * 100) + "%",
                }}
              />
              <span
                className="bar alerts"
                style={{
                  height:
                    Math.max(h.alerts ? 2 : 0, (h.alerts / max) * 100) + "%",
                }}
              />
            </div>
            <span className="bar-label">
              {new Date(h.ts * 1000).toLocaleTimeString("es-CO", {
                timeZone: "America/Bogota",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
