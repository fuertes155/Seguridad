import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Database,
  GitBranch,
  Monitor,
  MousePointer2,
  RotateCcw,
  ShieldBan,
  ShieldCheck,
} from "lucide-react";
import { type Rule } from "../../types";
import { buildRuleFlow } from "../../config/ruleFlows";
import { RuleResponseFlow } from "./RuleResponseFlow";

const icons = {
  request: MousePointer2,
  guard: ShieldCheck,
  evaluate: GitBranch,
  store: Database,
  display: Monitor,
};

// Solo controla la lectura de la guía. Los botones no llaman a la API ni alteran el laboratorio.
export function RuleFlowDiagram({ rule }: { rule: Rule }) {
  const [stepIndex, setStepIndex] = useState(0);
  const flow = buildRuleFlow(rule);
  const selectedStep = flow.steps[stepIndex];
  return (
    <>
      <div className="rule-flow-context">
        <span
          className={"rule-flow-status " + (rule.enabled ? "is-on" : "is-off")}
        >
          <span className={"tiny-dot " + (!rule.enabled ? "off" : "")} />
          {rule.enabled ? "Regla activa" : "Regla desactivada"}
        </span>
        <span>Configuración guardada · {flow.condition}</span>
      </div>
      <div className="rule-flow-example">
        <strong>Ejemplo para explicar</strong>
        <p>{flow.example}</p>
      </div>
      <ol className="rule-flow-stages" aria-label={`Recorrido de ${rule.id}`}>
        {flow.steps.map((step, index) => {
          const Icon = icons[step.id];
          return (
            <li key={step.id}>
              <button
                type="button"
                className={
                  "rule-flow-stage " + (stepIndex === index ? "is-current" : "")
                }
                aria-current={stepIndex === index ? "step" : undefined}
                aria-controls="rule-flow-detail"
                aria-label={`Paso ${index + 1}: ${step.title}`}
                onClick={() => setStepIndex(index)}
              >
                <span className="rule-flow-stage-top">
                  <span>0{index + 1}</span>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <strong>{step.title}</strong>
                <small>{step.caption}</small>
              </button>
              {index < flow.steps.length - 1 && (
                <ArrowRight
                  className="rule-flow-arrow"
                  size={18}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
      <div className="rule-flow-guard">
        <ShieldBan size={17} aria-hidden="true" />
        <p>
          <strong>Si ya había un bloqueo:</strong> HTTP 429 → evento de
          solicitud bloqueada. La petición no continúa hacia la regla.
        </p>
      </div>
      <div
        className="rule-flow-outcomes"
        aria-label="Resultados posibles de la evaluación"
      >
        <div
          className={"rule-flow-outcome " + (rule.enabled ? "can-alert" : "")}
        >
          {rule.enabled ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <CircleHelp size={18} aria-hidden="true" />
          )}
          <div>
            <strong>
              {rule.enabled
                ? "Si cumple la condición"
                : "Esta regla está desactivada"}
            </strong>
            <p>
              {rule.enabled
                ? flow.match
                : `Se conserva el evento, sin generar una alerta ${rule.id}. Su respuesta HTTP habitual no cambia.`}
            </p>
          </div>
        </div>
        <div className="rule-flow-outcome">
          <Database size={18} aria-hidden="true" />
          <div>
            <strong>
              {rule.enabled
                ? "Si no corresponde una nueva alerta"
                : "El resto del laboratorio continúa"}
            </strong>
            <p>
              {rule.enabled
                ? flow.noMatch
                : "Las otras reglas activas siguen funcionando. Las alertas previas y los bloqueos vigentes se conservan."}
            </p>
          </div>
        </div>
      </div>
      <div
        id="rule-flow-detail"
        className="rule-flow-detail"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="eyebrow">
          PASO {stepIndex + 1} DE {flow.steps.length}
        </span>
        <h3>{selectedStep.title}</h3>
        <p>{selectedStep.detail}</p>
        <div className="rule-flow-takeaway">
          <CircleHelp size={17} aria-hidden="true" />
          <span>{selectedStep.takeaway}</span>
        </div>
      </div>
      <div className="rule-flow-controls">
        <button
          type="button"
          className="button secondary compact"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex(stepIndex - 1)}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          className="rule-flow-reset"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex(0)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reiniciar explicación
        </button>
        <button
          type="button"
          className="button primary compact"
          disabled={stepIndex === flow.steps.length - 1}
          onClick={() => setStepIndex(stepIndex + 1)}
        >
          Siguiente paso
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
      <RuleResponseFlow />
    </>
  );
}
