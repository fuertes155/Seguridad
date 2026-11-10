import {
  ArrowRight,
  Eye,
  ShieldBan,
  Timer,
  UserRoundCheck,
} from "lucide-react";

// Etapa opcional posterior a la detección. Ningún elemento de esta explicación ejecuta un bloqueo.
export function RuleResponseFlow() {
  return (
    <div className="rule-response-flow">
      <div className="rule-response-heading">
        <UserRoundCheck size={20} aria-hidden="true" />
        <div>
          <h3>Después, el analista decide</h3>
          <p>Una alerta no aplica el bloqueo automáticamente.</p>
        </div>
      </div>
      <div className="rule-response-paths">
        <div className="rule-response-observe">
          <Eye size={19} aria-hidden="true" />
          <div>
            <strong>Continuar observando</strong>
            <p>
              Revisar la evidencia y conservar el seguimiento, sin crear un
              bloqueo.
            </p>
          </div>
        </div>
        <div className="rule-response-block">
          <div>
            <ShieldBan size={19} aria-hidden="true" />
            <strong>Bloquear origen · 5 min</strong>
            <p>
              El analista lo solicita desde una alerta o un evento. Se guarda un
              vencimiento de 300 segundos y la acción queda en la bitácora.
            </p>
          </div>
          <ArrowRight
            className="response-flow-arrow"
            size={19}
            aria-hidden="true"
          />
          <div>
            <Timer size={19} aria-hidden="true" />
            <strong>429 hasta vencer o desbloquear</strong>
            <p>
              Las siguientes solicitudes al portal se rechazan y registran. Al
              vencer, o pulsar Desbloquear, pueden volver a atenderse.
            </p>
          </div>
        </div>
      </div>
      <p className="rule-response-footnote">
        Marcar una alerta como revisada y desbloquear su origen son acciones
        independientes.
      </p>
    </div>
  );
}
