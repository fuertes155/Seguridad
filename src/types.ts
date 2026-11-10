// Nombres internos permitidos para navegar entre las seis vistas sin recargar toda la página.
export type Page =
  | "overview"
  | "events"
  | "alerts"
  | "response"
  | "lab"
  | "rules";

// Actividad recibida por el señuelo: método, ruta, respuesta y posible regla. No toda actividad genera alerta.
export type Event = {
  id: number;
  ts: number;
  source: string;
  method: string;
  path: string;
  status: number;
  kind: string;
  detail: string;
  severity: string;
  rule_id: string | null;
  run_id: string | null;
};

// Detección asociada a un evento mediante event_id; su estado de revisión es independiente del bloqueo.
export type Alert = {
  id: number;
  event_id: number;
  ts: number;
  source: string;
  rule_id: string;
  title: string;
  severity: string;
  evidence: string;
  status: string;
};

// Configuración de una regla; solo autenticación utiliza threshold y window.
export type Rule = {
  id: string;
  name: string;
  kind: string;
  severity: string;
  config: { threshold?: number; window?: number };
  description: string;
  enabled: boolean;
};

// Contención por origen. Los tiempos vienen del servidor en segundos Unix, no en milisegundos.
export type Block = {
  id: number;
  source: string;
  created_at: number;
  expires_at: number;
  reason: string;
  active: number;
};

// Resultado de una prueba guiada: permite diferenciar en curso, completada y fallida.
export type Run = {
  id: string;
  started_at: number;
  finished_at: number | null;
  scenario: string;
  source: string;
  expected: string;
  status: string;
  error: string | null;
};

// Respuesta conjunta de /api/state: listas recientes, métricas y series temporales calculadas en SQLite.
export type State = {
  now: number;
  metrics: Record<string, number>;
  history: {
    ts: number;
    events: number;
    alerts: number;
    sources: number;
    blocked_requests: number;
  }[];
  events: Event[];
  alerts: Alert[];
  blocks: Block[];
  rules: Rule[];
  audit: { id: number; ts: number; action: string; detail: string }[];
  runs: Run[];
  categories: { rule_id: string; count: number }[];
  decoy_url: string;
};

// Selección de evidencia: guarda la identidad, no una copia obsoleta del registro.
export type Selection = { type: "event" | "alert"; id: number } | null;
