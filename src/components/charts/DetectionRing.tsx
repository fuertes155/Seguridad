import { type State } from "../../types";

// Gráfico SVG de proporciones por regla sobre el total de alertas de 24 horas.
export function DetectionRing({
  categories,
  total,
}: {
  categories: State["categories"];
  total: number;
}) {
  let offset = 0;
  // Longitud del círculo: 2*pi*radio. dasharray pinta la proporción y offset coloca cada segmento.
  const circumference = 2 * Math.PI * 61;
  return (
    <div className="ring-wrap">
      <svg
        viewBox="0 0 170 170"
        role="img"
        aria-label={`${total} alertas en las últimas 24 horas`}
      >
        <circle
          className="ring-track"
          cx="85"
          cy="85"
          r="61"
          fill="none"
          strokeWidth="13"
        />
        {["SQL-01", "AUTH-01", "DECOY-01"].map((id, i) => {
          const val = categories.find((c) => c.rule_id === id)?.count || 0;
          // Protege la división cuando todavía no hay alertas.
          const fraction = total ? val / total : 0;
          const el = (
            <circle
              key={id}
              className={"ring-segment segment-" + i}
              cx="85"
              cy="85"
              r="61"
              fill="none"
              strokeWidth="13"
              strokeDasharray={`${Math.max(0, fraction * circumference - 3)} ${circumference}`}
              strokeDashoffset={-offset * circumference}
              transform="rotate(-90 85 85)"
            />
          );
          offset += fraction;
          return fraction ? el : null;
        })}
      </svg>
      <div className="ring-label">
        <strong>{total || 0}</strong>
        <span>alertas registradas</span>
      </div>
    </div>
  );
}
