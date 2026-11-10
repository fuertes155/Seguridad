import { type HoneyShieldController } from "../hooks/useHoneyShield";
import { type State } from "../types";
import {
  ArrowUpRight,
  CheckCheck,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "../components/common/Badge";
import { Source } from "../components/common/Source";
import { relative } from "../utils/format";
import { Empty } from "../components/common/Empty";

// Vista alerts: conserva los datos, controles y acciones de la pantalla original.
type Props = Pick<
  HoneyShieldController,
  "data" | "setSelection" | "filter" | "setFilter" | "m"
> & { data: State };
export function AlertsPage({
  data,
  setSelection,
  filter,
  setFilter,
  m,
}: Props) {
  return (
    <>
      <div className="section-summary">
        <div>
          <ShieldAlert size={19} />
          <strong>{m.open_alerts}</strong>
          <span>alertas pendientes</span>
        </div>
        <p>
          Una coincidencia es un indicio. Revisa el contexto antes de
          clasificarla.
        </p>
      </div>
      <div className="filter-tabs standalone">
        {[
          ["all", "Todas"],
          ["open", "Pendientes"],
          ["resolved", "Resueltas"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="alert-list">
        {data.alerts
          .filter((a) => filter === "all" || a.status === filter)
          .map((a) => (
            <article className={"alert-card " + a.severity} key={a.id}>
              <div className="alert-symbol">
                <ShieldAlert size={21} />
              </div>
              <div className="alert-main">
                <div className="alert-meta">
                  <code>HS-{String(a.id).padStart(4, "0")}</code>
                  <Badge severity={a.severity} />
                  <span
                    className={
                      "state-label " +
                      (a.status === "resolved" ? "resolved" : "")
                    }
                  >
                    {a.status === "resolved" ? (
                      <CheckCheck size={13} />
                    ) : (
                      <span className="tiny-dot" />
                    )}
                    {a.status === "resolved" ? "Resuelta" : "Pendiente"}
                  </span>
                </div>
                <h3>
                  <button
                    onClick={() => setSelection({ type: "alert", id: a.id })}
                  >
                    {a.title}
                  </button>
                </h3>
                <p>{a.evidence}</p>
                <div className="alert-bottom">
                  <Source source={a.source} />
                  <span>Regla {a.rule_id}</span>
                  <span>{relative(a.ts, data.now)}</span>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label={`Abrir alerta HS-${a.id}`}
                onClick={() => setSelection({ type: "alert", id: a.id })}
              >
                <ArrowUpRight size={19} />
              </button>
            </article>
          ))}
      </div>
      {!data.alerts.filter((a) => filter === "all" || a.status === filter)
        .length && (
        <div className="panel">
          <Empty
            icon={ShieldCheck}
            title="Sin alertas en esta vista"
            detail="Las detecciones aparecerán aquí con su contexto y evidencia."
          />
        </div>
      )}
    </>
  );
}
