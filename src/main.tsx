// Entrada de React. App compone las vistas; interface.css importa los estilos en orden.
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./interface.css";

createRoot(document.getElementById("root")!).render(<App />);
