import { severityNames } from "../../config/labels";

// Muestra texto y color de severidad; el color por sí solo no es la única indicación.
export function Badge({ severity }: { severity: string }) {
  return (
    <span className={"badge " + severity}>
      <i />
      {severityNames[severity] || severity}
    </span>
  );
}
