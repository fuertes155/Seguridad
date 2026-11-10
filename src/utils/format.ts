// JavaScript usa milisegundos: multiplica el timestamp por 1.000 y presenta la hora de Colombia.
export const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

// Formatea la fecha en la misma zona horaria usada en el detalle y el informe.
export const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
  });

// Calcula texto relativo para lectura rápida; la hora exacta permanece disponible en el detalle.
export const relative = (ts: number, now = Date.now() / 1000) => {
  const s = Math.max(0, Math.floor(now - ts));
  return s < 60
    ? "Hace unos segundos"
    : s < 3600
      ? `Hace ${Math.floor(s / 60)} min`
      : `Hace ${Math.floor(s / 3600)} h`;
};
