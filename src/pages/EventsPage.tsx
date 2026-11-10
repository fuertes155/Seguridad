import { type HoneyShieldController } from "../hooks/useHoneyShield";
import { type State } from "../types";
import { ArrowDownToLine, Search, X } from "lucide-react";
import { EventsTable } from "../components/events/EventsTable";
import { kindNames } from "../config/labels";

// Vista events: conserva los datos, controles y acciones de la pantalla original.
type Props = Pick<
  HoneyShieldController,
  | "data"
  | "setSelection"
  | "filter"
  | "setFilter"
  | "search"
  | "setSearch"
  | "exportFile"
> & { data: State };
export function EventsPage({
  data,
  setSelection,
  filter,
  setFilter,
  search,
  setSearch,
  exportFile,
}: Props) {
  return (
    <section className="panel">
      <div className="filter-toolbar">
        <div className="filter-tabs">
          {[
            ["all", "Todos"],
            ["detection", "Detecciones"],
            ["blocked", "Bloqueados"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={filter === v ? "active" : ""}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="toolbar-end">
          <div className="search-input">
            <Search size={15} />
            <input
              aria-label="Buscar eventos"
              placeholder="Buscar origen, ruta o evento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            className="button secondary compact"
            onClick={() => exportFile("csv")}
          >
            <ArrowDownToLine size={14} />
            CSV
          </button>
        </div>
      </div>
      {
        <EventsTable
          events={data.events.filter(
            (e) =>
              (filter === "all" ||
                (filter === "detection" ? e.rule_id : e.kind === "blocked")) &&
              `${e.source} ${e.path} ${kindNames[e.kind]}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          )}
          small={false}
          setSelection={setSelection}
        />
      }
      <div className="panel-footer">
        <span>
          Se muestran los últimos 100 eventos. La exportación incluye hasta
          10.000.
        </span>
        <span className="live-label">
          <i className="tiny-dot" />
          Actualización automática
        </span>
      </div>
    </section>
  );
}
