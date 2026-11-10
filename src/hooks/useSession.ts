import { useEffect, useState } from "react";
import { api } from "../services/api";

// Comprueba la sesión o consume el ticket local de un solo uso.
export function useSession() {
  // null significa comprobando sesión; false muestra login; true permite mostrar el panel.
  const [signed, setSigned] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    // Recupera la sesión existente o consume el enlace temporal generado por launch.py.
    const initialize = async () => {
      const ticket = new URLSearchParams(location.hash.slice(1)).get("ticket");
      if (ticket) {
        // Retira el ticket de la barra de direcciones después de leerlo; la API verifica su validez.
        history.replaceState(null, "", location.pathname);
        try {
          await api("/auth/launch", {
            method: "POST",
            body: JSON.stringify({ ticket }),
          });
        } catch {}
      }
      try {
        await api("/auth/session");
        // La bandera active evita actualizar el componente si se desmontó durante la petición.
        if (active) setSigned(true);
      } catch {
        // La bandera active evita actualizar el componente si se desmontó durante la petición.
        if (active) setSigned(false);
      }
    };
    initialize();
    return () => {
      active = false;
    };
  }, []);

  return { signed, setSigned };
}
