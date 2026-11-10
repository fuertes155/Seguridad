import { type Selection } from "../types";
import { useEffect } from "react";

// Accesibilidad del menú y del detalle: scroll, Escape y retorno del foco.
export function useOverlay(
  selection: Selection,
  sidebar: boolean,
  setSelection: (value: Selection) => void,
  setSidebar: (value: boolean) => void,
) {
  useEffect(() => {
    if (!selection && !sidebar) return;
    // Al abrir menú o detalle, bloquea el scroll del fondo y lo restaura al cerrar.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [selection, sidebar]);

  useEffect(() => {
    // Escape cierra el detalle o el menú; al desmontar se retira el listener.
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(null);
        setSidebar(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!selection) return;
    // Accesibilidad: conserva el foco previo para devolverlo al cerrar el diálogo.
    const previousFocus = document.activeElement as HTMLElement | null;
    // Se enfoca después de guardar el botón de origen; autoFocus lo sustituiría antes de este efecto.
    document
      .querySelector<HTMLButtonElement>('[role="dialog"] button')
      ?.focus();
    // Mantiene Tab y Shift+Tab dentro del detalle para que el teclado no navegue por controles ocultos.
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled])",
        ),
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      previousFocus?.focus();
    };
  }, [selection]);
}
