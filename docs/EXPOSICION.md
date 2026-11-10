# HoneyShield: guion de exposición

**Título:** Diseño e implementación de un honeypot web con monitoreo en tiempo real y respuesta controlada a intentos de intrusión.

**Pregunta:** ¿Cómo registrar y distinguir comportamientos sospechosos en un portal señuelo, y verificar una medida de contención con evidencias reproducibles?

**Objetivo general:** Construir y evaluar un laboratorio web capaz de registrar solicitudes, generar alertas mediante reglas explicables y aplicar bloqueos temporales, conservando evidencia de cada acción.

**Objetivos específicos:** implementar un señuelo aislado; definir tres reglas; visualizar eventos en vivo; verificar bloqueos; evaluar tráfico normal y sospechoso; documentar límites y resultados.

## Preparación

1. Abre INICIAR-HONEYSHIELD.cmd.
2. Comprueba “Señuelo conectado” y “Conexión en vivo”.
3. Ten abiertas dos ventanas: el panel y el portal NovaTech.
4. Mantén las tres reglas activas y AUTH-01 en 5 intentos / 60 segundos.
5. No necesitas borrar pruebas anteriores: cada escenario crea un cliente `lab-*` nuevo. Explica que los totales generales son acumulados.

## Secuencia sugerida: 10 minutos

| Tiempo     | Acción                                      | Idea que debes explicar                                                                                              |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00  | Presentar NovaTech y HoneyShield            | Un honeypot es un recurso señuelo para observar actividad. Los documentos son ficticios; las solicitudes son reales. |
| 1:00–2:00  | Mostrar las dos aplicaciones                | El portal observa las interacciones y el panel conserva evidencia. La administración está separada.                  |
| 2:00–3:00  | Ejecutar “Navegación normal”                | Dos solicitudes deben registrarse sin activar alertas.                                                               |
| 3:00–4:00  | Ejecutar “Accesos repetidos”                | Cinco fallos dentro de la ventana producen una alerta agrupada. No se guardan contraseñas.                           |
| 4:00–5:00  | Ejecutar “Indicio de SQL Injection”         | Se reconoce una entrada compatible con SQL. No se ejecuta una consulta peligrosa ni se demuestra un acceso exitoso.  |
| 5:00–6:00  | Abrir la alerta y su evidencia              | Mostrar fecha, origen, regla y evento relacionado.                                                                   |
| 6:00–7:00  | Ejecutar “Contención verificable”           | La siguiente solicitud del cliente recibe HTTP 429; el administrador sigue conectado.                                |
| 7:00–8:00  | Desbloquear desde Respuesta                 | El control es temporal y reversible; queda registrado en la bitácora.                                                |
| 8:00–9:00  | Mostrar reconocimiento Nmap y diseño de red | Un puerto abierto no equivale a una vulnerabilidad. Packet Tracer demuestra segmentación por separado.               |
| 9:00–10:00 | Exportar el informe                         | Las afirmaciones deben estar respaldadas por registros y pruebas.                                                    |

## Preguntas que conviene dominar

- **¿Es un antivirus?** No; es un laboratorio de engaño y observación centrado en tráfico web hacia un señuelo.
- **¿Detecta cualquier ataque?** No. Tiene tres reglas con cobertura acotada y puede producir falsos positivos o falsos negativos.
- **¿Bloquea toda la red?** No. Rechaza solicitudes al portal desde el origen indicado mientras el bloqueo está activo.
- **¿Por qué no basta Nmap?** Reconoce puertos y servicios; las reglas web interpretan solicitudes recibidas por nuestra aplicación. Un escaneo TCP no garantiza eventos HTTP.
- **¿SQL Injection tuvo éxito?** Se detectó un indicio. El portal devuelve una respuesta controlada; no ejecuta el contenido como SQL.
- **¿Qué significa `lab-*`?** Identifica un cliente de prueba autenticado. No es una IP ni un usuario externo real.
- **¿Dónde están las evidencias?** En SQLite y en las exportaciones PDF/CSV. Cada alerta referencia el evento que la originó.
- **¿Cuál fue el aporte propio?** Integración del señuelo, reglas, historial persistente, interfaz en vivo, respuesta verificable y escenarios reproducibles.

## Evaluación adicional que puedes presentar

Define un conjunto fijo de entradas normales y sospechosas y etiqueta antes cuáles esperas que activen reglas. Luego informa verdaderos positivos, falsos positivos, verdaderos negativos y falsos negativos. La precisión es VP/(VP+FP), y la sensibilidad VP/(VP+FN), únicamente cuando sus denominadores sean distintos de cero. Un solo recorrido correcto no permite afirmar que el sistema detecta todos los ataques.

Para latencia, mide desde el envío de la solicitud hasta que aparece en el panel. El WebSocket notifica actualizaciones cada 2 segundos; no es una garantía universal de tiempo de respuesta. Diferencia tiempo de recepción, generación de alerta y actualización visual.


## Defensa del código: recorrido para los tres integrantes

Esta guía complementa las diapositivas y los guiones individuales. En el editor se puede usar
Ctrl+F para localizar los nombres de función indicados. La división es para explicar el proyecto,
no para atribuir a una sola persona la autoría de cada archivo.

### Luis: arquitectura, solicitudes y persistencia

1. Abre `launch.py` y muestra `start`: inicia dos procesos Uvicorn, uno por servicio. Un puerto es
   un punto de acceso al proceso; no equivale a una máquina diferente. El lanzador reutiliza servicios saludables.
2. Abre `backend/decoy.py` y muestra `instrument`: el middleware consulta el bloqueo, deja responder
   a la ruta con `call_next` o devuelve 429, y envía el evento a `/internal/events`.
3. Sigue `ingest` en `backend/admin.py`: Pydantic valida el evento y `Depends(collector)` comprueba la clave.
4. En `backend/store.py`, muestra `db`, `init` y `record_event`. `with` administra la transacción;
   `commit` confirma y `rollback` revierte ante error. `alerts.event_id` conserva el vínculo con `events.id`.

Frase para explicarlo: "La solicitud se atiende en NovaTech. El administrador recibe sus datos,
evalúa reglas y conserva evidencia en SQLite. El panel presenta esa información".

### Samuel: React, SQL-01 y AUTH-01

1. En `src/services/api.ts`, muestra `api`; después abre `src/hooks/useLabData.ts` para mostrar `refresh`.
   `fetch` hace la petición, `await` espera su resultado y `setData` actualiza el estado que React representa.
   TypeScript ayuda a detectar errores de tipos al compilar.
2. En `useLabData.ts`, muestra el efecto del WebSocket: `onmessage` provoca una consulta de estado.
   No se transmiten todos los eventos por el socket; llega un aviso periódico. Hay limpieza de temporizadores
   y conexión. `src/App.tsx` compone las pantallas de `src/pages`; `src/main.tsx` solo inicia React.
3. En `sql_signal`, explica normalización, expresiones regulares y `any`. Una coincidencia es un
   indicio de sintaxis. En `search` del señuelo, `matches` compara texto con una lista: no ejecuta la entrada como SQL.
4. En `record_event`, explica `count + 1`: el intento actual todavía no está insertado. `recent`
   evita otra alerta del mismo origen y regla dentro de la ventana, aunque la primera ya esté revisada.

Frase para explicarlo: "La interfaz no decide la detección: representa lo que evaluó el servidor.
AUTH-01 agrupa eventos; SQL-01 reconoce patrones concretos y no garantiza cubrir toda variante".

Para explicar la organización: "Separamos pantallas, componentes compartidos, conexión con la API y estilos
para que cada archivo tenga una responsabilidad clara. Los hooks reúnen la lógica de React; las pantallas
reciben los datos mediante propiedades. La separación conserva el diseño, las funciones y la forma de iniciar
HoneyShield. `src/interface.css` importa los estilos de `src/styles` en el orden que necesitan".

### Juan: señuelo, contención, seguridad y comprobación

1. En `trap`, muestra la lista de rutas ficticias. Una coincidencia produce un evento `resource` y
   HTTP 403. No hay un respaldo real detrás de `/backups/nomina.zip`.
2. En `create_block` y `active_block`, explica `expires_at`: el bloqueo requiere origen coincidente,
   estado activo y hora de vencimiento posterior a la actual. El portal responde 429 mientras esté vigente.
3. Compara `unblock` y `resolve`: retirar contención modifica `blocks`; revisar modifica `alerts`.
   No se cambian reglas del firewall de Windows.
4. En `issue_session`, distingue token aleatorio, hash guardado y cookie. En `login`, scrypt verifica
   la contraseña del analista; no es cifrado reversible. El archivo privado `acceso.txt` conserva el acceso
   inicial de la instalación, mientras las contraseñas ficticias enviadas a NovaTech no se registran.
5. En `export_pdf`, muestra `snapshot`, `escape` y el límite de cuarenta alertas. En `test_system.py`,
   muestra que la fixture utiliza otra carpeta y puertos, y que cada `assert` comprueba un resultado observable.

Frase para explicarlo: "Una alerta, un bloqueo y una revisión son estados distintos. Los probamos
mediante solicitudes reales y conservamos la evidencia para comprobar las afirmaciones".

### Conceptos cortos que conviene poder explicar

| Concepto | Significado aplicado al proyecto |
| --- | --- |
| `@app.get` / `@app.post` | Decoradores que vinculan una función con un método HTTP y una ruta. |
| `Depends(auth)` | FastAPI comprueba la sesión antes de ejecutar una operación protegida. |
| `BaseModel` y `Field` | Contratos de entrada y límites validados por Pydantic en el servidor. |
| `async` / `await` | Permiten esperar operaciones de entrada/salida sin bloquear todo el bucle de eventos. |
| `with` / `finally` | Aseguran limpieza de recursos o ejecución del cierre incluso ante errores. |
| Parámetros `?` en SQL | Separan las instrucciones de los valores y evitan concatenar entradas como código SQL. |
| `useState` | Conserva datos de interfaz entre representaciones de React. |
| `useEffect` | Sincroniza efectos como conexión, temporizadores, foco o tema y permite limpiarlos. |
| `map` / `filter` | Transforman o seleccionan elementos de listas, por ejemplo filas y eventos visibles. |
| `textContent` | Inserta texto en el portal sin interpretarlo como etiquetas HTML. |
| CSS y media queries | Cambian apariencia y disposición según ancho; no ejecutan la detección. |
| HTTP 200 / 401 / 403 / 429 / 503 | Respuesta correcta / credenciales o sesión inválidas / acceso denegado / limitación temporal / servicio no disponible. |
| `lab-*` | Identificador de una prueba autenticada; no es una dirección IP ni una persona. |

Para ensayar: elige una función, explica qué recibe, qué verifica, qué cambia y qué devuelve.
Después muestra qué prueba respalda esa explicación. Si una captura tiene otro número HS o EV,
busca la evidencia por regla, origen y hora; los identificadores aumentan con nuevas solicitudes.
