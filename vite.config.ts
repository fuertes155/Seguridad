// CONFIGURACIÓN DE VITE: desarrollo de React y compilación de los archivos estáticos.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  // El plugin transforma React/TSX y facilita la actualización durante el desarrollo.
  plugins: [react()],
  // En desarrollo, /api se reenvía al administrador en 8840; ws:true incluye /api/live.
  // Este proxy no se utiliza cuando FastAPI sirve directamente el contenido compilado de dist.
  server: { proxy: { "/api": { target: "http://127.0.0.1:8840", ws: true } } },
  // La salida de producción se guarda en dist, que backend.admin.frontend sirve al navegador.
  build: { outDir: "dist" },
});
