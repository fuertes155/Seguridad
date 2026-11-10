// Ayudante genérico: agrega /api, envía JSON y convierte errores HTTP en mensajes utilizables.
// El navegador adjunta la cookie del mismo origen; el código no lee la cookie HttpOnly.
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!r.ok) {
    const error = await r
      .json()
      .catch(() => ({ detail: "No fue posible conectar con el laboratorio." }));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : "Revisa los datos de la solicitud.",
    );
  }
  return r.json();
}
