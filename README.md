# HoneyShield

Laboratorio web de detección y respuesta a actividad sospechosa. Incluye un portal señuelo NovaTech, tres reglas explicables, un panel en tiempo real, contención temporal y exportación de evidencias.

**Entrega verificada:** ejecución local en Windows, compilación de producción y 20 pruebas de integración aprobadas. Consulta [el estado de validación](docs/VALIDACION.md) y [el guion de exposición](docs/EXPOSICION.md).

## Descargar e instalar desde GitHub

1. En [fuertes155/Seguridad](https://github.com/fuertes155/Seguridad), selecciona **Code → Download ZIP** y extrae la carpeta, o clona el repositorio con Git.
2. Instala Python 3.12+ y Node.js 22.12+ con npm, disponibles en la terminal de Windows.
3. Dentro de la carpeta descargada, ejecuta **INSTALAR-HONEYSHIELD.cmd**. Prepara el entorno Python, instala las dependencias y compila la interfaz.
4. Cuando termine, abre **INICIAR-HONEYSHIELD.cmd** para iniciar HoneyShield y acceder al panel.

El repositorio contiene las fuentes, pruebas, documentación y lanzadores. Cada instalación genera sus propias
credenciales y base de datos en `.runtime`. Las dependencias, la compilación y los resultados locales de `output`
no se publican en Git: se generan al instalar, compilar, ejecutar pruebas o exportar informes.

## Abrir en este equipo

Haz doble clic en **INICIAR-HONEYSHIELD.cmd**. Inicia los dos servicios y abre una sesión de analista con un enlace de un solo uso. Los datos se conservan entre ejecuciones.

- Panel: <http://127.0.0.1:8840>
- Portal señuelo: <http://127.0.0.1:8841>
- Para detener los procesos iniciados por el lanzador: **DETENER-HONEYSHIELD.cmd**.
- El usuario es `analista`. La contraseña aleatoria se crea en `.runtime/acceso.txt`; no se incluye en el código.

El primer montaje en otro equipo requiere Python 3.12+ y Node 22.12+ con npm. Ejecuta **INSTALAR-HONEYSHIELD.cmd** y después el lanzador. La instalación descarga dependencias. Una vez instalado, el modo local funciona sin Internet.

El lanzador ejecuta dos procesos Python/Uvicorn locales: la API del panel en el puerto 8840 y el portal NovaTech en el 8841. La carpeta `.runtime` conserva la base de datos y las credenciales privadas; se excluye de Git y de los ZIP de entrega.

## Primera demostración, paso a paso

1. Abre **Laboratorio → Ejecutar recorrido**.
2. Se enviarán solicitudes HTTP reales al señuelo para cinco escenarios: tráfico normal, accesos fallidos, indicio SQL, recurso señuelo y contención.
3. Con las reglas iniciales activas, el recorrido produce **11 eventos y 4 alertas**. La solicitud final recibe HTTP 429. Estos valores corresponden al recorrido aislado; otras visitas o pruebas incrementan los totales.
4. En **Eventos en vivo**, filtra por detecciones o bloqueados. Abre un evento para ver la evidencia.
5. En **Alertas**, revisa el contexto, marca una alerta como revisada o bloquea su origen por 5 minutos.
6. En **Respuesta**, comprueba el vencimiento del bloqueo y la bitácora. Puedes desbloquear antes del vencimiento.
7. En **Reglas de detección**, ajusta el umbral de accesos fallidos o activa/desactiva reglas. Desactivar una regla no detiene el registro de eventos.
8. Exporta el informe PDF desde la cabecera, o el CSV desde **Eventos en vivo**.

Para explicar cada detección, entra a **Reglas de detección → Ver diagrama**. Selecciona AUTH-01,
DECOY-01 o SQL-01 y utiliza **Siguiente paso**, **Anterior** o los nodos del recorrido. La guía muestra
la solicitud, el control de bloqueo, la evaluación, SQLite y la actualización del panel. También explica
la decisión manual de bloquear por cinco minutos. Lee la configuración guardada y refleja las reglas
desactivadas; recorrerla no envía solicitudes ni genera evidencia.

También puedes abrir el portal y escribir manualmente en el buscador o intentar iniciar sesión con datos ficticios. Las contraseñas nunca se guardan. Todas las cuentas y documentos NovaTech son ficticios.

## Qué hace cada parte

```text
Navegador o cliente de prueba
           |
           v
Portal NovaTech (8841) -- eventos autenticados --> API HoneyShield (8840)
           ^                                          |
           | consulta de bloqueos                     +--> SQLite
           +------------------------------------------+
                                                      |
                                                      +--> WebSocket --> Panel React
```

- **Señuelo:** responde de forma controlada, consulta bloqueos y envía eventos a la API mediante HTTP autenticado. La API administra el registro de evidencias en SQLite.
- **Motor:** analiza entradas y ventanas temporales. Las consultas a SQLite usan parámetros.
- **Panel:** consume registros reales. No hay cifras iniciales inventadas ni generadores de alertas desconectados del portal.
- **Clientes `lab-*`:** identifican escenarios autenticados. Son etiquetas de prueba, no IP reales. Solicitudes externas sin el secreto del laboratorio se identifican por su IP de conexión; los encabezados `X-Forwarded-For` no se confían.
- **Administración:** sesión de 12 horas, cookie HttpOnly y SameSite Strict, validación de origen en operaciones de escritura y collector con secreto independiente de la sesión.

## Reglas iniciales

| Regla    | Condición                                | Severidad | Límite                                                                            |
| -------- | ---------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| AUTH-01  | 5 fallos del mismo origen en 60 segundos | Media     | No identifica personas ni todas las formas de acceso automatizado.                |
| SQL-01   | Combinaciones concretas de sintaxis SQL  | Alta      | Detecta indicios, no demuestra explotación ni sustituye consultas parametrizadas. |
| DECOY-01 | Acceso a rutas reservadas ficticias      | Media     | Una visita puede ser exploratoria; requiere interpretación.                       |

Las alertas de autenticación se agrupan por origen y ventana para evitar una alerta por cada fallo posterior. El bloqueo es manual o parte explícita del escenario de contención. Su alcance es el portal web, no el firewall del equipo.

## Desarrollo

```powershell
# Consola 1
.\.venv\Scripts\python.exe -m uvicorn backend.admin:app --host 127.0.0.1 --port 8840 --no-proxy-headers --no-access-log
# Consola 2
.\.venv\Scripts\python.exe -m uvicorn backend.decoy:app --host 127.0.0.1 --port 8841 --no-proxy-headers --no-access-log
# Consola 3: interfaz con recarga automática
npm run dev
```

En desarrollo usa <http://127.0.0.1:5173> y la contraseña de `.runtime/acceso.txt`. El proxy de Vite conecta la API y el WebSocket.

```powershell
npm run build
.\.venv\Scripts\python.exe -m pytest tests -q
```

Las pruebas crean su propia carpeta temporal, base de datos y dos servicios en puertos libres. No borran ni modifican las evidencias de tu laboratorio.

## Reconocimiento con Nmap

Solo sobre este laboratorio local:

```powershell
& 'C:\Program Files (x86)\Nmap\nmap.exe' -sT -sV --version-light -p 8840,8841 127.0.0.1
```

La validación realizada en este equipo encontró ambos puertos abiertos y etiquetó los servicios como `unknown`. Eso no demuestra una vulnerabilidad ni la ausencia de ella. Un escaneo TCP puede no producir solicitudes HTTP interpretables por el detector. La captura de paquetes o detección de escaneos requeriría un sensor de red adicional.

## Archivos

| Ubicación                                 | Contenido                                                       |
| ----------------------------------------- | --------------------------------------------------------------- |
| `src/main.tsx`, `src/App.tsx`              | Inicio de React y composición del panel.                        |
| `src/pages/`                             | Una pantalla por archivo: resumen, eventos, alertas, respuesta, laboratorio, reglas y acceso. |
| `src/components/`                        | Navegación, tablas, gráficos, detalle de evidencia y elementos compartidos. |
| `src/hooks/`                             | Sesión, sincronización en vivo, acciones, tema, notificaciones y foco. |
| `src/components/rules/`, `src/config/ruleFlows.ts` | Controles de reglas y diagramas educativos de AUTH-01, DECOY-01 y SQL-01. |
| `src/services/api.ts`                    | Peticiones JSON y tratamiento de errores HTTP.                  |
| `src/types.ts`, `src/config/`, `src/utils/` | Contratos TypeScript, etiquetas, navegación y formatos de fecha. |
| `src/interface.css`, `src/styles/`        | Índice de estilos y archivos separados por sección y tamaño de pantalla. |
| `backend/admin.py`                        | Autenticación, API, escenarios, bloqueos y exportaciones.       |
| `backend/decoy.py`, `backend/portal.html` | Portal señuelo instrumentado.                                   |
| `backend/novatech.css`                   | Paleta azul noche, violeta y cian de NovaTech; estilos de escritorio, móvil y estados de respuesta. |
| `backend/store.py`                        | SQLite, reglas y registro transaccional.                        |
| `tests/test_system.py`                    | Pruebas de integración.                                         |
| `.runtime/`                               | Datos privados, credenciales, registros de servicio y sesiones. |
| `docs/EXPOSICION.md`                      | Guion y secuencia de demostración.                              |
| `docs/REDES.md`                           | Topología propuesta y pruebas para Packet Tracer.               |
| `output/evidence/`                        | Evidencias locales generadas durante la validación.             |

## Alcance académico

El objetivo es demostrar observación, detección explicable y respuesta controlada. El señuelo no necesita ser realmente vulnerable ni ejecutar consultas peligrosas. Hay posibles falsos positivos y falsos negativos. La IP identifica una conexión, no una persona. El informe PDF incluye hasta 40 alertas recientes, la pantalla de eventos hasta 100 y el CSV hasta 10.000; estos límites se indican en la interfaz y el informe.

La topología Packet Tracer es una demostración de red separada. No se afirma que la aplicación controle VLAN ni que se conecte automáticamente a Packet Tracer.

Referencias: [honeypots, NIST](https://csrc.nist.gov/glossary/term/honeypot), [registros, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [prevención SQL, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), [salida XML de Nmap](https://nmap.org/book/output-formats-xml-output.html).


## Lectura del código comentado para la exposición

El código fuente incorpora comentarios en español por función y bloque lógico. Explican propósito,
datos de entrada, efectos y decisiones que conviene comprender; no es necesario memorizar cada símbolo.
Consulta también la sección de defensa del código en [EXPOSICION.md](docs/EXPOSICION.md).

| Orden | Archivo | Qué seguir en el código |
| --- | --- | --- |
| 1 | `backend/decoy.py` | `instrument`, `login`, `search` y `trap`: solicitud, respuesta y envío del evento. |
| 2 | `backend/store.py` | `record_event`, `sql_signal`, `active_block`: reglas, evidencia y contención vigente. |
| 3 | `backend/admin.py` | `ingest`, `snapshot`, `create_block`, `resolve`, `live` y exportaciones. |
| 4 | `src/services/api.ts`, `src/hooks/useLabData.ts` | `api`, `refresh`, WebSocket y limpieza de conexiones y temporizadores. |
| 5 | `src/hooks/useLabActions.ts`, `src/pages/`, `src/components/` | Acciones del analista y representación de los datos recibidos. |
| 6 | `backend/portal.html` | `draw`, `submit` y manejadores de los formularios ficticios. |
| 7 | `tests/test_system.py` | Preparación aislada y el comportamiento que demuestra cada prueba. |

Los comentarios no se agregan a bibliotecas descargadas (`node_modules`, `.venv`), archivos compilados
(`dist`), datos privados (`.runtime`) o cachés. Esos archivos no son el código fuente escrito para el proyecto.

### Cómo está dividida la interfaz

`main.tsx` carga los estilos y monta `App`. `App.tsx` compone la estructura común y muestra la pantalla
seleccionada. Cada archivo de `pages` recibe únicamente los datos y las acciones que utiliza; los elementos
reutilizables están en `components`. Los comentarios explicativos en español se conservan en estos módulos.

`useHoneyShield` coordina los hooks especializados. `useSession` comprueba el acceso; `useLabData` consulta
la API y mantiene el WebSocket; `useLabActions` ejecuta escenarios, bloqueos, revisiones y exportaciones.
`useTheme`, `useToast` y `useOverlay` gestionan respectivamente la apariencia, los avisos y el foco de los
paneles de detalle. Las reglas de detección siguen evaluándose en el servidor Python.

`interface.css` solo importa los archivos de `styles` en el orden original. Allí se separan variables,
botones, estructura, tablas y secciones; `styles/responsive` contiene los ajustes por tamaño y accesibilidad.
El orden de las importaciones conserva la prioridad de las reglas CSS.

NovaTech tiene una hoja independiente en `backend/novatech.css`. Sus variables `:root` reúnen los colores
de fondos, textos, botones, campos y mensajes. El portal la carga desde `/assets/novatech.css`; esa solicitud
técnica no genera eventos de navegación. Los cambios de estilos se ven al recargar NovaTech.

La ejecución sigue siendo la misma: `INICIAR-HONEYSHIELD.cmd` abre los dos servicios. Después de editar
archivos de `src`, ejecuta `npm run build` y recarga el panel para usar la compilación actualizada.

### Configuración JSON y archivos generados

JSON no admite comentarios estándar. Por compatibilidad, los archivos JSON conservan su formato y
su explicación se encuentra aquí:

| Archivo / propiedad | Explicación |
| --- | --- |
| `package.json`: `name`, `version`, `private` | Identificación del proyecto; `private` evita publicarlo accidentalmente con npm. |
| `type: module` | Utiliza módulos JavaScript con `import` y `export`. |
| `scripts.dev` | Inicia Vite en la interfaz local para desarrollar la UI. |
| `scripts.build` | Ejecuta la comprobación TypeScript (`tsc -b`) y luego compila con Vite. |
| `scripts.preview` | Previsualiza la compilación local; no sustituye los dos servicios FastAPI. |
| `dependencies` | React, React DOM e iconos utilizados por la interfaz. |
| `devDependencies` | Herramientas de compilación, tipos y formato; no son reglas de seguridad del servidor. |
| `package-lock.json` | Árbol de versiones y hashes generado por npm; `npm ci` lo utiliza para reproducir dependencias. |
| `tsconfig.json`: `target`, `lib` | Nivel ES2022 y tipos de las funciones del lenguaje y del navegador. |
| `module`, `moduleResolution` | Módulos ESNext y resolución adaptada a un empaquetador como Vite. |
| `jsx: react-jsx` | Transformación de JSX para React. |
| `strict` | Comprobaciones estrictas de tipos; no validan por sí solas los datos recibidos en ejecución. |
| `noEmit`, `isolatedModules` | TypeScript verifica sin generar la distribución; Vite se encarga de compilar módulos. |
| `skipLibCheck` | Evita revisar internamente las declaraciones de tipos de las bibliotecas instaladas. |
| `useDefineForClassFields` | Semántica estándar de los campos de clase al analizar/transformar código. |
| `allowImportingTsExtensions`, `resolveJsonModule` | Permiten referencias a archivos TypeScript e importación de JSON. |
| `include: [src]` | Delimita el código de aplicación revisado por esta configuración. |
| `tsconfig.tsbuildinfo` | Caché de TypeScript generada automáticamente; no se edita para documentar funciones. |
