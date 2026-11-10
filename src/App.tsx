import { useHoneyShield } from "./hooks/useHoneyShield";
import { Brand } from "./components/common/Brand";
import { Login } from "./pages/LoginPage";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { PageHeading } from "./components/layout/PageHeading";
import { api } from "./services/api";
import { Empty } from "./components/common/Empty";
import { OverviewPage } from "./pages/OverviewPage";
import { EventsPage } from "./pages/EventsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ResponsePage } from "./pages/ResponsePage";
import { LabPage } from "./pages/LabPage";
import { RulesPage } from "./pages/RulesPage";
import { AppFooter } from "./components/layout/AppFooter";
import { MobileNav } from "./components/layout/MobileNav";
import { Toast } from "./components/common/Toast";
import { EvidenceDrawer } from "./components/evidence/EvidenceDrawer";

// Composición de la aplicación: sesión, estructura común y una vista por sección.
// La sincronización y las acciones se delegan a hooks especializados.
export function App() {
  const {
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
  } = useHoneyShield();
  // Distingue carga de sesión y sesión inválida para evitar mostrar datos antes de comprobar acceso.
  if (signed === null)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-line" />
        <p>Conectando con tu laboratorio…</p>
      </div>
    );
  if (!signed) return <Login onLogin={() => setSigned(true)} />;
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={() => setSidebar(false)}
        />
      )}
      <Sidebar
        setSigned={setSigned}
        page={page}
        changePage={changePage}
        sidebar={sidebar}
        setSidebar={setSidebar}
        live={live}
        health={health}
        act={act}
        m={m}
      />
      <div className="main-shell">
        <Topbar
          theme={theme}
          setTheme={setTheme}
          changePage={changePage}
          setSidebar={setSidebar}
          data={data}
          currentNav={currentNav}
          m={m}
        />
        <main className="main-content">
          <PageHeading
            page={page}
            health={health}
            busy={busy}
            tour={tour}
            exportFile={exportFile}
          />
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button
                onClick={() => {
                  refresh();
                  api("/auth/session").catch(() => setSigned(false));
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          {!data ? (
            <div className="panel">
              <Empty
                title="Conectando con el laboratorio"
                detail="Preparando tus registros y el estado de los servicios."
              />
            </div>
          ) : (
            <>
              {/* Resumen con métricas y gráficos reales de las últimas 24 h. */}
              {page === "overview" && (
                <OverviewPage
                  changePage={changePage}
                  data={data}
                  live={live}
                  health={health}
                  setSelection={setSelection}
                  m={m}
                />
              )}
              {/* Filtra los últimos 100 eventos en el navegador; el CSV tiene un alcance mayor. */}
              {page === "events" && (
                <EventsPage
                  data={data}
                  setSelection={setSelection}
                  filter={filter}
                  setFilter={setFilter}
                  search={search}
                  setSearch={setSearch}
                  exportFile={exportFile}
                />
              )}
              {/* Bandeja de detecciones: el filtro separa pendientes/resueltas, no bloqueadas/desbloqueadas. */}
              {page === "alerts" && (
                <AlertsPage
                  data={data}
                  setSelection={setSelection}
                  filter={filter}
                  setFilter={setFilter}
                  m={m}
                />
              )}
              {/* Contención activa y bitácora. Retirar un bloqueo llama a la API, no borra su historial. */}
              {page === "response" && (
                <ResponsePage
                  data={data}
                  busy={busy}
                  act={act}
                  activeBlocks={activeBlocks}
                />
              )}
              {/* Escenarios reproducibles: sus botones invocan /api/scenarios, no insertan alertas desde React. */}
              {page === "lab" && (
                <LabPage
                  changePage={changePage}
                  data={data}
                  health={health}
                  busy={busy}
                  run={run}
                  m={m}
                />
              )}
              {/* Configuración persistida en el servidor mediante PATCH /api/rules. */}
              {page === "rules" && (
                <RulesPage data={data} busy={busy} act={act} />
              )}
            </>
          )}
          <AppFooter live={live} />
        </main>
      </div>
      <MobileNav page={page} changePage={changePage} />
      {/* Notificación con role=status para comunicar el resultado de una acción. */}
      {toast && <Toast toast={toast} setToast={setToast} />}
      {/* Detalle compartido de evento/alerta; cerrar la ventana no modifica la evidencia. */}
      {selection && (selectedEvent || selectedAlert) && (
        <EvidenceDrawer
          setSelection={setSelection}
          busy={busy}
          block={block}
          resolve={resolve}
          activeBlocks={activeBlocks}
          selectedEvent={selectedEvent}
          selectedAlert={selectedAlert}
        />
      )}
    </div>
  );
}
