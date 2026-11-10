import { useTheme } from "./useTheme";
import { useSession } from "./useSession";
import { useLabData } from "./useLabData";
import { useToast } from "./useToast";
import { useLabActions } from "./useLabActions";
import { useState } from "react";
import { type Page } from "../types";
import { useOverlay } from "./useOverlay";
import { nav } from "../config/navigation";

// Coordina navegación y hooks especializados. Las reglas de detección permanecen en Python.
export function useHoneyShield() {
  const { theme, setTheme } = useTheme();
  const { signed, setSigned } = useSession();
  const { data, live, health, error, refresh } = useLabData(signed);
  const { toast, setToast, notify } = useToast();
  const { busy, act, run, tour, block, resolve, exportFile } = useLabActions(
    refresh,
    notify,
  );
  const [page, setPage] = useState<Page>("overview");

  const [sidebar, setSidebar] = useState(false);

  // Solo conserva tipo e ID seleccionado; el detalle se obtiene del estado actualizado.
  const [selection, setSelection] = useState<{
    type: "event" | "alert";
    id: number;
  } | null>(null);

  const [filter, setFilter] = useState("all");

  const [search, setSearch] = useState("");

  // Al cambiar de vista, limpia filtros y selección para no arrastrar contexto de otra pantalla.
  const changePage = (p: Page) => {
    setPage(p);
    setFilter("all");
    setSearch("");
    setSidebar(false);
    setSelection(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useOverlay(selection, sidebar, setSelection, setSidebar);
  const currentNav = nav.find((n) => n.id === page)!;

  const m = data?.metrics || {};

  // Usa la hora del servidor (data.now) para no depender del reloj local al indicar vigencia.
  const activeBlocks =
    data?.blocks.filter((b) => b.active && b.expires_at > data.now) || [];

  // Busca la evidencia por ID en las listas actuales; las listas se limitan a los registros recientes.
  const selectedEvent =
    selection?.type === "event"
      ? data?.events.find((e) => e.id === selection.id)
      : undefined;

  const selectedAlert =
    selection?.type === "alert"
      ? data?.alerts.find((a) => a.id === selection.id)
      : undefined;
  return {
    theme,
    setTheme,
    signed,
    setSigned,
    page,
    changePage,
    sidebar,
    setSidebar,
    data,
    live,
    health,
    toast,
    setToast,
    error,
    refresh,
    selection,
    setSelection,
    busy,
    filter,
    setFilter,
    search,
    setSearch,
    act,
    run,
    tour,
    block,
    resolve,
    exportFile,
    currentNav,
    m,
    activeBlocks,
    selectedEvent,
    selectedAlert,
  };
}

// Cada vista recibe solo las propiedades que necesita de este controlador.
export type HoneyShieldController = ReturnType<typeof useHoneyShield>;
