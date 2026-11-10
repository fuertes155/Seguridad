import { useEffect, useState } from "react";

// Tema visual persistido; no modifica los datos del laboratorio.
export function useTheme() {
  // Recuerda la preferencia visual; si localStorage no está disponible, usa el tema claro.
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("honeyshield-theme") === "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    // El atributo data-theme activa las variables CSS del tema seleccionado.
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("honeyshield-theme", theme);
    } catch {}
  }, [theme]);

  return { theme, setTheme };
}
