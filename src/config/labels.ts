// Traduce códigos del servidor a etiquetas visibles, sin cambiar su clasificación.
export const severityNames: Record<string, string> = {
  info: "Informativo",
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

// Nombres legibles de los tipos de evento; sqli es una coincidencia de regla, no una explotación confirmada.
export const kindNames: Record<string, string> = {
  visit: "Visita al portal",
  search: "Búsqueda de documentos",
  auth_failure: "Acceso fallido",
  sqli: "Indicio de SQL Injection",
  resource: "Recurso señuelo",
  blocked: "Solicitud bloqueada",
};
