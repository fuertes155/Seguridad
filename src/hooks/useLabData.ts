import { useCallback, useEffect, useState } from "react";
import { type State } from "../types";
import { api } from "../services/api";

// Sincroniza la API, la salud del señuelo y los avisos WebSocket.
export function useLabData(signed: boolean | null) {
  // Datos obtenidos de la API. No se rellenan con incidentes inventados mientras carga.
  const [data, setData] = useState<State | null>(null);

  const [live, setLive] = useState(false);

  const [health, setHealth] = useState({ decoy: false });

  const [error, setError] = useState("");

  // Consulta el estado y actualiza React; un error queda visible sin inventar un resultado exitoso.
  const refresh = useCallback(async () => {
    try {
      const result = await api<State>("/state");
      setData(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // Abre la conexión en vivo solo después de autenticar al analista.
    if (!signed) return;
    refresh();
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout>;
    let stopped = false;
    // WebSocket usa ws/wss según el protocolo del panel y vuelve a conectar si se interrumpe.
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/live`,
      );
      socket.onopen = () => setLive(true);
      // El mensaje es un aviso periódico; vuelve a consultar /api/state para recibir los datos.
      socket.onmessage = () => refresh();
      socket.onclose = () => {
        setLive(false);
        if (!stopped) retry = setTimeout(connect, 4000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    const check = () =>
      api<{ decoy: boolean }>("/status")
        .then(setHealth)
        .catch(() => setHealth({ decoy: false }));
    check();
    // Consulta la disponibilidad del señuelo cada 12 s; no confundirla con actividad de detección.
    const timer = setInterval(check, 12000);
    // Respaldo de consulta cada 10 s aunque el aviso WebSocket no llegue.
    const fallback = setInterval(refresh, 10000);
    return () => {
      // Limpieza del efecto: cancela reconexión, intervalos y socket para evitar duplicarlos al remontar.
      stopped = true;
      clearTimeout(retry);
      clearInterval(timer);
      clearInterval(fallback);
      socket?.close();
    };
  }, [signed, refresh]);

  return { data, live, health, error, refresh };
}
