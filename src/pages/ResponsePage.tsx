import { type HoneyShieldController } from "../hooks/useHoneyShield";
import { type State } from "../types";
import {
  ArrowRight,
  CircleHelp,
  Clock3,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Empty } from "../components/common/Empty";
import { Source } from "../components/common/Source";
import { api } from "../services/api";
import { fmtDate, fmtTime } from "../utils/format";

// Vista response: conserva los datos, controles y acciones de la pantalla original.
type Props = Pick<
  HoneyShieldController,
  "data" | "busy" | "act" | "activeBlocks"
> & { data: State };
export function ResponsePage({ data, busy, act, activeBlocks }: Props) {
  return (
    <>
      <div className="response-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                Contención activa{" "}
                <span className="count-badge">{activeBlocks.length}</span>
              </h2>
              <p>Bloqueos limitados al portal señuelo</p>
            </div>
            <ShieldCheck size={19} className="green-text" />
          </div>
          {!activeBlocks.length ? (
            <Empty
              icon={ShieldCheck}
              title="Sin bloqueos activos"
              detail="Puedes contener un origen desde el detalle de una alerta o un evento."
            />
          ) : (
            <div className="blocks-list">
              {activeBlocks.map((b) => (
                <div className="block-card" key={b.id}>
                  <div className="block-top">
                    <Source source={b.source} />
                    <span className="badge low">
                      <i />
                      Contenido
                    </span>
                  </div>
                  <p>{b.reason}</p>
                  <div className="block-bottom">
                    <span>
                      <Clock3 size={13} />
                      Vence en {Math.ceil((b.expires_at - data.now) / 60)} min
                    </span>
                    <button
                      className="text-button"
                      disabled={!!busy}
                      onClick={() =>
                        act(
                          "unblock",
                          () =>
                            api("/blocks/" + b.id, {
                              method: "DELETE",
                            }),
                          "Bloqueo retirado. El origen puede volver a acceder.",
                        )
                      }
                    >
                      Desbloquear <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Bitácora del analista</h2>
              <p>Acciones y cambios recientes</p>
            </div>
            <FileText size={17} className="muted" />
          </div>
          <div className="audit-timeline">
            {data.audit.map((a) => (
              <div className="audit-item" key={a.id}>
                <span className="audit-dot" />
                <div>
                  <p>{a.detail}</p>
                  <time>
                    {fmtDate(a.ts)} · {fmtTime(a.ts)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="info-note">
        <CircleHelp size={17} />
        <p>
          El bloqueo actúa sobre el origen observado por el portal. Una IP puede
          representar varios usuarios; los identificadores <code>lab-*</code>
          {
            " corresponden a clientes de prueba. La administración permanece separada."
          }
        </p>
      </div>
    </>
  );
}
