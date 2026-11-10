import { type Rule } from "../types";

// Contenido educativo del diagrama. Describe el servidor; no envía solicitudes ni crea evidencia.
export type FlowStepId = "request" | "guard" | "evaluate" | "store" | "display";
export type FlowStep = {
  id: FlowStepId;
  title: string;
  caption: string;
  detail: string;
  takeaway: string;
};
type RuleExplanation = {
  example: string;
  request: string;
  response: string;
  condition: string;
  evaluation: string;
  match: string;
  noMatch: string;
};

export const ruleFlowLabels: Record<string, string> = {
  "AUTH-01": "Accesos repetidos",
  "DECOY-01": "Recurso señuelo",
  "SQL-01": "Indicio SQL",
};

// AUTH utiliza la configuración persistida recibida en /api/state, no el formulario sin guardar.
function explainRule(rule: Rule): RuleExplanation {
  if (rule.kind === "auth") {
    const threshold = rule.config.threshold ?? 5;
    const window = rule.config.window ?? 60;
    return {
      example: `${threshold} intentos con prueba@novatech.local y una contraseña ficticia en ${window} segundos.`,
      request: "POST /login",
      response: "HTTP 401 · Credenciales rechazadas",
      condition: `${threshold} fallos del mismo origen en ${window} segundos`,
      evaluation: `NovaTech rechaza cada intento. HoneyShield cuenta los fallos del mismo origen durante los últimos ${window} segundos, incluido el actual. Al alcanzar ${threshold}, genera una alerta si no existe otra de AUTH-01 para ese origen dentro de la misma ventana.`,
      match: `Se alcanza el umbral de ${threshold} fallos y no hay una alerta reciente de AUTH-01: se crea una alerta vinculada al evento.`,
      noMatch:
        "Si faltan intentos o ya existe una alerta de esta regla en la ventana, se guarda el evento sin crear otra alerta.",
    };
  }
  if (rule.kind === "resource") {
    return {
      example: "Abrir /backups/nomina.zip en NovaTech.",
      request: "GET /backups/nomina.zip",
      response: "HTTP 403 · Recurso reservado",
      condition: "La ruta solicitada pertenece a los recursos señuelo",
      evaluation:
        "NovaTech reconoce una ruta reservada ficticia, prepara la respuesta 403 y etiqueta la solicitud como acceso a un recurso señuelo. HoneyShield comprueba que DECOY-01 está activa para generar su alerta.",
      match:
        "La solicitud corresponde a una ruta señuelo: se registra el evento y se crea una alerta DECOY-01.",
      noMatch:
        "Una ruta ajena a los señuelos no activa DECOY-01. Una ruta inexistente devuelve 404 y queda registrada como visita.",
    };
  }
  return {
    example: "Buscar ' OR 1=1 -- en la biblioteca de NovaTech.",
    request: "POST /search",
    response: "HTTP 200 · Resultado de búsqueda controlado",
    condition: "La entrada coincide con un patrón de sintaxis SQL sospechosa",
    evaluation:
      "NovaTech compara la búsqueda con títulos ficticios; no la ejecuta como SQL. HoneyShield normaliza la entrada y comprueba patrones como operadores lógicos, UNION SELECT o instrucciones encadenadas. Una coincidencia activa SQL-01.",
    match:
      "Coincide un patrón: se guarda la evidencia y se crea una alerta SQL-01. Esto no demuestra una explotación exitosa.",
    noMatch:
      "Si no coincide ningún patrón, SQL-01 no genera una alerta. La búsqueda sigue registrada como evento.",
  };
}

// El recorrido sigue las etapas reales: solicitud, contención, evaluación, persistencia y consulta del panel.
export function buildRuleFlow(rule: Rule) {
  const explanation = explainRule(rule);
  const steps: FlowStep[] = [
    {
      id: "request",
      title: "Llega la solicitud",
      caption: explanation.request,
      detail: `${explanation.example} La petición llega al portal NovaTech. El laboratorio identifica el origen de la conexión; los escenarios guiados utilizan identificadores lab-* autenticados.`,
      takeaway:
        "Un origen identifica una conexión o un cliente de laboratorio; no identifica por sí solo a una persona.",
    },
    {
      id: "guard",
      title: "Comprobar bloqueo",
      caption: "¿El origen está contenido?",
      detail:
        "Antes de atender la ruta, NovaTech consulta si el origen tiene un bloqueo activo y sin vencer. Si existe, devuelve HTTP 429 y registra una solicitud bloqueada. Si no existe, continúa hacia la ruta y la evaluación de la regla.",
      takeaway:
        "Una solicitud detenida por contención queda registrada sin generar otra alerta por estas reglas.",
    },
    {
      id: "evaluate",
      title: "Evaluar la regla",
      caption: rule.enabled ? explanation.condition : "Regla desactivada",
      detail: rule.enabled
        ? explanation.evaluation
        : `${rule.id} está desactivada: HoneyShield omite esta detección. NovaTech mantiene su respuesta habitual y la solicitud se conserva como evento. Las otras reglas activas siguen evaluándose cuando corresponda.`,
      takeaway: rule.enabled
        ? explanation.noMatch
        : "Desactivar una regla no borra las alertas anteriores ni retira los bloqueos que ya existan.",
    },
    {
      id: "store",
      title: "Guardar evidencia",
      caption: rule.enabled
        ? "Evento + posible alerta"
        : "Evento sin esta alerta",
      detail:
        "HoneyShield guarda el evento en SQLite: fecha, origen, ruta y respuesta HTTP. Si esta regla se activa, guarda también una alerta asociada al evento. Después del registro correcto, NovaTech entrega la respuesta al visitante.",
      takeaway: `Respuesta del ejemplo, sin bloqueo previo: ${explanation.response}. Las contraseñas ensayadas en NovaTech no se guardan.`,
    },
    {
      id: "display",
      title: "Actualizar el panel",
      caption: "Eventos en vivo y Alertas",
      detail:
        "El WebSocket avisa periódicamente y el panel consulta el estado de la API. El evento aparece en Eventos en vivo. Si se creó una alerta, aparece también en Alertas con su regla, origen y evidencia para revisión.",
      takeaway:
        "Detectar una coincidencia no bloquea automáticamente al origen. La contención es una acción aparte.",
    },
  ];
  return { ...explanation, steps };
}
