import { type HoneyShieldController } from "../hooks/useHoneyShield";
import { type State } from "../types";
import { CircleHelp, SlidersHorizontal } from "lucide-react";
import { RuleCard } from "../components/rules/RuleCard";
import { api } from "../services/api";

// Vista rules: conserva los datos, controles y acciones de la pantalla original.
type Props = Pick<HoneyShieldController, "data" | "busy" | "act"> & {
  data: State;
};
export function RulesPage({ data, busy, act }: Props) {
  return (
    <>
      <div className="rules-intro">
        <span className="square-icon">
          <SlidersHorizontal size={23} />
        </span>
        <div>
          <h3>
            {data.rules.filter((r) => r.enabled).length} de 3 reglas activas
          </h3>
          <p>
            Las reglas generan indicios explicables. Sus resultados deben
            contrastarse con tráfico normal.
          </p>
        </div>
      </div>
      <div className="rules-list">
        {data.rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            busy={!!busy}
            save={(values) =>
              act(
                "rule",
                () =>
                  api("/rules/" + rule.id, {
                    method: "PATCH",
                    body: JSON.stringify(values),
                  }),
                "Configuración de la regla actualizada.",
              )
            }
          />
        ))}
      </div>
      <div className="info-note">
        <CircleHelp size={17} />
        <p>
          Desactivar una regla mantiene el registro de solicitudes, pero detiene
          sus alertas. Los cambios quedan registrados en la bitácora del
          analista.
        </p>
      </div>
    </>
  );
}
