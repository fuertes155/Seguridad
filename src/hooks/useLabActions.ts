import { useState } from "react";
import { api } from "../services/api";

// Acciones autenticadas y descargas; siempre refresca después de una mutación.
export function useLabActions(
  refresh: () => Promise<void>,
  notify: (message: string) => void,
) {
  // Conserva el estado de la acción en curso y deshabilita controles para evitar envíos duplicados.
  const [busy, setBusy] = useState("");

  // Patrón común de acción: marcar ocupado -> ejecutar API -> refrescar -> avisar -> liberar controles.
  async function act(key: string, fn: () => Promise<unknown>, message: string) {
    setBusy(key);
    try {
      await fn();
      await refresh();
      notify(message);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  // Solicita un escenario al servidor; allí se envían solicitudes reales al portal señuelo.
  async function run(id: string) {
    await act(
      id,
      () => api("/scenarios/" + id, { method: "POST" }),
      "Prueba completada. Las evidencias ya están registradas.",
    );
  }

  // Ejecuta los cinco escenarios en secuencia, esperando cada resultado para no superponer pruebas.
  async function tour() {
    setBusy("tour");
    try {
      for (const scenario of [
        "normal",
        "auth",
        "sql",
        "resource",
        "containment",
      ]) {
        await api("/scenarios/" + scenario, { method: "POST" });
        await refresh();
      }
      notify(
        "Recorrido completo: cinco escenarios ejecutados con solicitudes reales.",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  // Crea una contención de cinco minutos. La autorización y vigencia las aplica el servidor.
  const block = (source: string) =>
    act(
      "block",
      () =>
        api("/blocks", {
          method: "POST",
          body: JSON.stringify({ source, minutes: 5 }),
        }),
      "Origen bloqueado durante 5 minutos.",
    );

  // Cambia el estado de una alerta; no equivale a desbloquear su origen.
  const resolve = (id: number) =>
    act(
      "resolve",
      () => api("/alerts/" + id + "/resolve", { method: "PATCH" }),
      "Alerta marcada como revisada.",
    );

  // Descarga bytes generados por el servidor mediante Blob; no convierte una captura de pantalla en informe.
  const exportFile = async (format: "pdf" | "csv") => {
    try {
      const response = await fetch(
        "/api/export/" + (format === "pdf" ? "report.pdf" : "events.csv"),
      );
      if (!response.ok) throw new Error("No fue posible exportar el informe.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "pdf"
          ? "HoneyShield-informe.pdf"
          : "HoneyShield-eventos.csv";
      a.click();
      // Libera la URL temporal del archivo para que no permanezca ocupando recursos.
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      notify("Archivo exportado con los registros del laboratorio.");
    } catch (e) {
      notify((e as Error).message);
    }
  };

  return { busy, act, run, tour, block, resolve, exportFile };
}
