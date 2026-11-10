import { type HoneyShieldController } from "../hooks/useHoneyShield";
import { type State } from "../types";
import {
  Activity,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  Hexagon,
  LockKeyhole,
  Play,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Source } from "../components/common/Source";
import { fmtTime } from "../utils/format";
import { Empty } from "../components/common/Empty";

// Vista lab: conserva los datos, controles y acciones de la pantalla original.
type Props = Pick<
  HoneyShieldController,
  "changePage" | "data" | "health" | "busy" | "run" | "m"
> & { data: State };
export function LabPage({ changePage, data, health, busy, run, m }: Props) {
  return (
    <>
      <div className="lab-topology">
        <div>
          <span className="topology-icon">
            <Terminal size={22} />
          </span>
          <strong>Cliente de pruebas</strong>
          <small>Solicitudes HTTP reales</small>
        </div>
        <span className="topology-connector">
          <i />
          <ArrowRight size={17} />
        </span>
        <div>
          <span className="topology-icon amber">
            <Hexagon size={22} />
          </span>
          <strong>NovaTech</strong>
          <small>Portal señuelo local</small>
        </div>
        <span className="topology-connector">
          <i />
          <ArrowRight size={17} />
        </span>
        <div>
          <span className="topology-icon green">
            <ShieldCheck size={22} />
          </span>
          <strong>HoneyShield</strong>
          <small>Registro, detección y respuesta</small>
        </div>
        <a
          className="button secondary compact"
          href={data.decoy_url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir portal <ExternalLink size={14} />
        </a>
      </div>
      <div className="scenario-grid">
        {[
          {
            id: "normal",
            n: "01",
            title: "Navegación normal",
            text: "Visita el portal y busca un documento. Comprueba que el tráfico habitual no activa alertas.",
            expected: "2 eventos · sin alertas",
            icon: Activity,
            color: "green",
          },
          {
            id: "auth",
            n: "02",
            title: "Accesos repetidos",
            text: "Envía intentos fallidos hasta alcanzar el umbral configurado en la regla de autenticación.",
            expected: "Regla AUTH-01",
            icon: LockKeyhole,
            color: "amber",
          },
          {
            id: "sql",
            n: "03",
            title: "Indicio de SQL Injection",
            text: "Envía una entrada de prueba al buscador. El detector la analiza sin ejecutarla como SQL.",
            expected: "Regla SQL-01",
            icon: Database,
            color: "red",
          },
          {
            id: "resource",
            n: "04",
            title: "Recurso señuelo",
            text: "Solicita un respaldo ficticio reservado. Observa la alerta y la respuesta de acceso denegado.",
            expected: "Regla DECOY-01",
            icon: FileText,
            color: "blue",
          },
          {
            id: "containment",
            n: "05",
            title: "Contención verificable",
            text: "Registra un origen, bloquéalo durante 5 minutos y verifica que su siguiente solicitud recibe HTTP 429.",
            expected: "Bloqueo + solicitud rechazada",
            icon: ShieldCheck,
            color: "green",
          },
        ].map((s) => (
          <article className={"scenario-card " + s.color} key={s.id}>
            <div className="scenario-top">
              <span className="scenario-icon">
                <s.icon size={22} />
              </span>
              <span className="scenario-number">{s.n}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <div className="scenario-expected">
              <span className="tiny-dot" />
              {s.expected}
            </div>
            <button
              className="button secondary wide"
              disabled={!!busy || !health.decoy}
              onClick={() => run(s.id)}
            >
              {busy === s.id ? "Ejecutando…" : "Ejecutar prueba"}
              <Play size={14} />
            </button>
          </article>
        ))}
        <article className="scenario-card guide-card">
          <span className="eyebrow">EVIDENCIAS, NO SUPOSICIONES</span>
          <h3>Cierra el ciclo.</h3>
          <p>
            Abre los eventos, revisa la regla activada y exporta tu informe. Las
            reglas desactivadas registran tráfico sin generar su alerta.
          </p>
          <button className="text-button" onClick={() => changePage("events")}>
            Explorar eventos <ArrowRight size={15} />
          </button>
        </article>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial de pruebas</h2>
            <p>Resultados de las últimas ejecuciones</p>
          </div>
          <span className="subtle-tag">{m.runs} completadas</span>
        </div>
        {data.runs.length ? (
          <div className="table-scroll">
            <table className="runs-table">
              <thead>
                <tr>
                  <th>ESCENARIO</th>
                  <th>CLIENTE</th>
                  <th>RESULTADO ESPERADO</th>
                  <th>ESTADO</th>
                  <th>HORA</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.scenario}</strong>
                      {r.error && <small className="red-text">{r.error}</small>}
                    </td>
                    <td>
                      <Source source={r.source} />
                    </td>
                    <td className="muted">{r.expected}</td>
                    <td>
                      <span className={"run-state " + r.status}>
                        {r.status === "completed" ? (
                          <Check size={13} />
                        ) : (
                          <Clock3 size={13} />
                        )}{" "}
                        {r.status === "completed"
                          ? "Completada"
                          : r.status === "running"
                            ? "En curso"
                            : "Fallida"}
                      </span>
                    </td>
                    <td className="mono muted">{fmtTime(r.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={FlaskConical}
            title="Tu primera prueba empieza aquí"
            detail="Elige un escenario o ejecuta el recorrido completo."
          />
        )}
      </section>
      <div className="info-note">
        <CircleHelp size={17} />
        <p>
          Los clientes <code>lab-*</code> identifican solicitudes reales
          generadas por escenarios autorizados. Un escaneo TCP de Nmap puede no
          producir eventos HTTP; esta versión observa actividad web.
        </p>
      </div>
    </>
  );
}
