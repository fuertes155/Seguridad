import { type RefObject } from "react";
import { BookOpen, GitBranch } from "lucide-react";
import { type Rule } from "../../types";
import { ruleFlowLabels } from "../../config/ruleFlows";
import { RuleFlowDiagram } from "./RuleFlowDiagram";

// Selector de explicaciones; utiliza las reglas guardadas y mantiene el foco de los controles.
export function RuleFlowExplorer({
  rules,
  selectedId,
  onSelect,
  headingRef,
}: {
  rules: Rule[];
  selectedId: string;
  onSelect: (id: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const rule = rules.find((item) => item.id === selectedId) ?? rules[0];
  if (!rule) return null;
  return (
    <section
      className="rule-flow-explorer panel"
      aria-labelledby="rule-flow-heading"
    >
      <div className="rule-flow-heading">
        <div>
          <span className="eyebrow">DEL INTENTO A LA RESPUESTA</span>
          <h2 id="rule-flow-heading" ref={headingRef} tabIndex={-1}>
            Qué ocurre en cada detección
          </h2>
          <p>Elige una regla y recorre el proceso paso a paso.</p>
        </div>
        <span className="rule-flow-guide-label">
          <BookOpen size={15} aria-hidden="true" />
          Guía interactiva
        </span>
      </div>
      <div
        className="rule-flow-selector"
        role="group"
        aria-label="Regla del diagrama"
      >
        {rules.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={rule.id === item.id}
            aria-controls="rule-flow-content"
            onClick={() => onSelect(item.id)}
          >
            <GitBranch size={17} aria-hidden="true" />
            <span>
              <code>{item.id}</code>
              <strong>{ruleFlowLabels[item.id] ?? item.name}</strong>
            </span>
          </button>
        ))}
      </div>
      <p className="rule-flow-disclaimer">
        Esta guía explica el funcionamiento; recorrerla no envía solicitudes ni
        crea alertas.
      </p>
      <div id="rule-flow-content">
        {/* Reinicia el paso solo al cambiar la regla o su configuración guardada, no con cada refresco. */}
        <RuleFlowDiagram
          key={`${rule.id}-${rule.enabled}-${rule.config.threshold}-${rule.config.window}`}
          rule={rule}
        />
      </div>
    </section>
  );
}
