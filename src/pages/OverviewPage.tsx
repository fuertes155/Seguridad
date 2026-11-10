import { type HoneyShieldController } from "../hooks/useHoneyShield";
import { type State } from "../types";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  ExternalLink,
  FlaskConical,
  Network,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { ActivityChart } from "../components/charts/ActivityChart";
import { DetectionRing } from "../components/charts/DetectionRing";
import { EventsTable } from "../components/events/EventsTable";

// Vista overview: conserva los datos, controles y acciones de la pantalla original.
type Props = Pick<
  HoneyShieldController,
  "changePage" | "data" | "live" | "health" | "setSelection" | "m"
> & { data: State };
export function OverviewPage({
  changePage,
  data,
  live,
  health,
  setSelection,
  m,
}: Props) {
  return (
    <>
      <section className="command-banner">
        <div className="command-copy">
          <span className="command-label">
            <span className={"status-light " + (!live ? "off" : "")} />{" "}
            {live ? "OBSERVACIÓN EN TIEMPO REAL" : "CONECTANDO AL LABORATORIO"}
          </span>
          <h2>
            Entiende cada señal.
            <br />
            <span>Responde con evidencia.</span>
          </h2>
          <p>
            Del primer intento a la respuesta. Todo lo que ocurre en NovaTech,
            en un solo lugar.
          </p>
          <div className="command-actions">
            <button
              className="button primary"
              onClick={() => changePage("lab")}
            >
              <FlaskConical size={17} /> Abrir laboratorio{" "}
              <ArrowRight size={16} />
            </button>
            <a
              className="button command-secondary"
              href={data.decoy_url}
              target="_blank"
              rel="noreferrer"
            >
              Visitar portal señuelo <ExternalLink size={15} />
            </a>
          </div>
        </div>
        <div className="command-visual" aria-hidden="true">
          <div className="radar-orbit orbit-outer" />
          <div className="radar-orbit orbit-middle" />
          <div className="radar-orbit orbit-inner" />
          <div className="radar-axis axis-x" />
          <div className="radar-axis axis-y" />
          <div className="radar-core">
            <ShieldCheck size={43} strokeWidth={1.4} />
          </div>
          <span className="radar-point point-one" />
          <span className="radar-point point-two" />
          <span className="radar-point point-three" />
          <div className="radar-label">
            <span className={"tiny-dot " + (!health.decoy ? "off" : "")} />{" "}
            NovaTech · {health.decoy ? "Conectado" : "Sin conexión"}
          </div>
        </div>
      </section>
      <div className="overview-status">
        <div>
          <span className={"status-light " + (live ? "" : "off")} />
          <strong>
            {live ? "Monitoreo activo" : "Reconectando al monitoreo"}
          </strong>
          <span className="muted">/</span>
          <span>NovaTech · Portal web</span>
        </div>
        <span className="muted">
          Últimas 24 horas <Clock3 size={13} />
        </span>
      </div>
      <div className="metrics-grid">
        {[
          {
            label: "Eventos registrados",
            key: "events",
            icon: Activity,
            sub: "Solicitudes recibidas por el señuelo",
            color: "amber",
          },
          {
            label: "Alertas generadas",
            key: "alerts",
            icon: ShieldAlert,
            sub: `${m.open_alerts} pendientes de revisión`,
            color: "red",
          },
          {
            label: "Orígenes observados",
            key: "sources",
            icon: Network,
            sub: "Clientes únicos en las últimas 24 h",
            color: "blue",
          },
          {
            label: "Solicitudes bloqueadas",
            key: "blocked_requests",
            icon: ShieldCheck,
            sub: `${m.blocks} bloqueos activos`,
            color: "green",
          },
        ].map((card) => (
          <div className={"metric-card " + card.color} key={card.key}>
            <div className="metric-top">
              <span>{card.label}</span>
              <span className="metric-icon">
                <card.icon size={20} />
              </span>
            </div>
            <div className="metric-value">
              {m[card.key]?.toLocaleString("es-CO") || "0"}
              <div className="mini-spark" aria-hidden="true">
                {data.history.slice(-8).map((h, i) => (
                  <i
                    key={i}
                    style={{
                      height: Math.max(
                        3,
                        Math.min(
                          29,
                          h[
                            card.key as
                              | "events"
                              | "alerts"
                              | "sources"
                              | "blocked_requests"
                          ] *
                            2 +
                            3,
                        ),
                      ),
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="metric-sub">{card.sub}</span>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>Actividad del señuelo</h2>
              <p>Eventos y alertas a lo largo del día</p>
            </div>
            <span className="subtle-tag">
              <Clock3 size={13} /> Últimas 24 h
            </span>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot amber" />
              Eventos
            </span>
            <span>
              <i className="legend-dot red" />
              Alertas
            </span>
            <span className="chart-total">
              {m.events} <small>solicitudes</small>
            </span>
          </div>
          <ActivityChart history={data.history} />
        </section>
        <section className="panel distribution-panel">
          <div className="panel-header">
            <div>
              <h2>Mapa de detecciones</h2>
              <p>Alertas por regla activada</p>
            </div>
            <Shield size={17} className="muted" />
          </div>
          <DetectionRing categories={data.categories} total={m.alerts} />
          <div className="distribution-list">
            {[
              {
                id: "SQL-01",
                label: "SQL Injection",
                color: "red",
              },
              {
                id: "AUTH-01",
                label: "Accesos repetidos",
                color: "amber",
              },
              {
                id: "DECOY-01",
                label: "Recurso señuelo",
                color: "blue",
              },
            ].map((c) => (
              <div key={c.id}>
                <span>
                  <i className={"legend-dot " + c.color} />
                  {c.label}
                </span>
                <strong>
                  {data.categories.find((x) => x.rule_id === c.id)?.count || 0}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="attention-strip">
        <span className="attention-icon">
          <ShieldAlert size={23} />
        </span>
        <div>
          <h3>
            {m.open_alerts
              ? `${m.open_alerts} alertas esperan tu revisión`
              : "Tu bandeja de revisión está al día"}
          </h3>
          <p>
            {m.open_alerts
              ? "Consulta la evidencia y decide el siguiente paso."
              : "Las nuevas detecciones aparecerán aquí."}
          </p>
        </div>
        <button className="text-button" onClick={() => changePage("alerts")}>
          Revisar alertas <ArrowRight size={16} />
        </button>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div className="inline-heading">
            <h2>Últimos eventos</h2>
            <span className="live-label">
              <i className="tiny-dot" />
              {live ? "EN VIVO" : "RECONECTANDO"}
            </span>
          </div>
          <button className="text-button" onClick={() => changePage("events")}>
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
        {
          <EventsTable
            events={data.events.slice(0, 5)}
            small={true}
            setSelection={setSelection}
          />
        }
      </section>
      <div className="lab-banner">
        <div className="lab-banner-icon">
          <FlaskConical size={25} />
        </div>
        <div>
          <div className="eyebrow">DE LA TEORÍA A LA EVIDENCIA</div>
          <h3>Una buena defensa también se pone a prueba.</h3>
          <p>
            Ejecuta un escenario y sigue cada evento desde el primer intento.
          </p>
        </div>
        <button className="button secondary" onClick={() => changePage("lab")}>
          Abrir laboratorio <ArrowUpRight size={16} />
        </button>
      </div>
    </>
  );
}
