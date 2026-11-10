import { FlaskConical, Network } from "lucide-react";

// Distingue visualmente clientes lab-* de conexiones por IP, sin atribuir identidad a personas.
export function Source({ source }: { source: string }) {
  return (
    <span className="source">
      <span className="source-avatar">
        {source.startsWith("lab-") ? (
          <FlaskConical size={12} />
        ) : (
          <Network size={12} />
        )}
      </span>
      <code>{source}</code>
    </span>
  );
}
