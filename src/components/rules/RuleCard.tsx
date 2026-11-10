import { type Rule } from "../../types";
import { useState } from "react";
import { Badge } from "../common/Badge";
import { Terminal } from "lucide-react";

// Editor de una regla. Los límites del formulario mejoran la experiencia; Pydantic también los valida.
export function RuleCard({
  rule,
  busy,
  save,
}: {
  rule: Rule;
  busy: boolean;
  save: (v: { enabled: boolean; threshold?: number; window?: number }) => void;
}) {
  // Estado local del formulario: el servidor solo cambia al activar la regla o guardar el umbral.
  const [threshold, setThreshold] = useState(rule.config.threshold || 5);
  const [window, setWindow] = useState(rule.config.window || 60);
  return (
    <article className="rule-card">
      <div className="rule-header">
        <div>
          <code>{rule.id}</code>
          <Badge severity={rule.severity} />
        </div>
        <button
          className={"switch " + (rule.enabled ? "on" : "")}
          role="switch"
          aria-checked={rule.enabled}
          aria-label={`${rule.enabled ? "Desactivar" : "Activar"} regla ${rule.id}`}
          disabled={busy}
          onClick={() => save({ enabled: !rule.enabled, threshold, window })}
        >
          <span />
        </button>
      </div>
      <h3>{rule.name}</h3>
      <p>{rule.description}</p>
      {rule.kind === "auth" ? (
        <div className="rule-controls">
          <label>
            Intentos fallidos
            <input
              type="number"
              min="2"
              max="20"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label>
            Ventana (segundos)
            <input
              type="number"
              min="10"
              max="300"
              value={window}
              onChange={(e) => setWindow(Number(e.target.value))}
            />
          </label>
          <button
            className="button secondary compact"
            disabled={
              busy ||
              threshold < 2 ||
              threshold > 20 ||
              window < 10 ||
              window > 300
            }
            onClick={() => save({ enabled: rule.enabled, threshold, window })}
          >
            Guardar umbral
          </button>
        </div>
      ) : (
        <div className="rule-example">
          <Terminal size={13} />
          <span>
            {rule.kind === "sqli"
              ? "Operadores lógicos · UNION SELECT · consultas encadenadas"
              : "/admin · /backups/nomina.zip · /backup.sql · /.env · /config · /wp-admin"}
          </span>
        </div>
      )}
      <div className="rule-state">
        <span className={"tiny-dot " + (!rule.enabled ? "off" : "")} />
        {rule.enabled ? "Activa y observando" : "Desactivada"}
      </div>
    </article>
  );
}
