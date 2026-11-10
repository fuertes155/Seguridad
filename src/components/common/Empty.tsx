import React from "react";
import { Radio, type LucideIcon } from "lucide-react";

// Estado vacío reutilizable; explica ausencia de datos y admite una acción opcional.
export function Empty({
  title,
  detail,
  icon: Icon = Radio,
  action,
}: {
  title: string;
  detail: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span>
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
