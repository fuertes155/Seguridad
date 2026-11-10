import { useEffect, useRef, useState } from "react";

// Notificación temporal compartida por las acciones.
export function useToast() {
  const [toast, setToast] = useState("");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mensaje temporal: reinicia el temporizador para que la notificación más reciente permanezca cinco segundos.
  const notify = (s: string) => {
    setToast(s);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  };
  // Cancela el aviso pendiente al desmontar la aplicación.
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  return { toast, setToast, notify };
}
