# Estado de entrega y validación

HoneyShield está listo para ejecutarse directamente en Windows. El panel, el portal señuelo y la base de datos están funcionando. Las tres reglas iniciales están activas.

## Comprobaciones completadas

- Compilación de producción de React y TypeScript: correcta.
- 20 pruebas de integración: aprobadas, sin fallos. Resultado detallado en `output/evidence/pruebas.xml`.
- Inicio, detención y reinicio con los lanzadores: correctos. Los 11 eventos presentes antes del reinicio se conservaron exactamente. Evidencia en `output/evidence/arranque-verificado.json`.
- Recorrido desde la interfaz: cinco escenarios completados, con 11 solicitudes y cuatro alertas en ese recorrido aislado. La prueba de contención recibió HTTP 429.
- Bloqueo y desbloqueo manual desde la interfaz: correctos, con registro en la bitácora.
- Búsqueda en los eventos y búsqueda normal en el portal: correctas.
- Sesión del analista y actualización mediante WebSocket: verificadas.
- Exportaciones CSV y PDF: generadas; informe PDF revisado visualmente. La descarga desde el botón de la interfaz también se verificó y quedó en la carpeta Descargas.
- Nmap: puertos 8840 y 8841 abiertos; servicios identificados como `unknown`. No se interpreta esto como una vulnerabilidad.

Las pruebas de integración cubren acceso sin autenticación, enlace de inicio de un solo uso, rechazo de origen no autorizado, secreto del recolector, tráfico normal, umbral de acceso, ausencia de contraseñas en registros, indicios SQL, recursos señuelo, bloqueo y desbloqueo, vencimiento, reglas desactivadas, validación de parámetros, resolución persistente de alertas, encabezados falsificados, PDF, neutralización de fórmulas CSV, autenticación WebSocket, bloqueo de orígenes desconocidos, tamaño de solicitudes y cierre de sesión.

## Actualización de interfaz · 10 de noviembre de 2026

- Panel renovado con navegación lateral, resumen de alertas pendientes y accesos al laboratorio y a NovaTech.
- Temas claro y oscuro; la elección se conserva al recargar el navegador.
- Navegación inferior en móvil y menú lateral desplazable. Comprobación visual a 390 px y en escritorio a 1439 px; comprobación de ancho a 321 px sin desbordamiento de la página.
- Evidencia en un panel de detalle con encabezado fijo y cierre mediante Escape.
- Búsqueda sin coincidencias, limpieza de búsqueda, filtro de bloqueos y descarga CSV comprobados desde la interfaz.
- Escenario de navegación normal ejecutado desde la interfaz. Entrada SQL de prueba registrada como HS-0007 / EV-0026; bloqueo, rechazo, desbloqueo y resolución verificados. El portal volvió a encontrar el documento y quedó sin ese bloqueo activo.
- NovaTech presenta estados de respuesta diferenciados y retira los resultados anteriores cuando la consulta falla o se bloquea.
- Compilación de producción correcta. 20 pruebas de integración aprobadas; registro en `output/evidence/pruebas-interfaz.xml`. Consola del navegador sin errores ni advertencias durante la revisión.
- Capturas del rediseño en `output/evidence/interfaz-*.jpg`. El diseño no cambia el alcance local ni las reglas de detección del laboratorio.

## Modalidad de ejecución

La entrega utiliza ejecución local en Windows. **INICIAR-HONEYSHIELD.cmd** inicia dos procesos Python/Uvicorn: HoneyShield en `127.0.0.1:8840` y NovaTech en `127.0.0.1:8841`. **DETENER-HONEYSHIELD.cmd** detiene los procesos del proyecto.

**INSTALAR-HONEYSHIELD.cmd** prepara las dependencias en otro equipo. Los datos y las credenciales de cada instalación se conservan en `.runtime` y se excluyen de los archivos de entrega.

## Red simulada

`REDES.md` contiene la topología, comandos y matriz de verificación para Packet Tracer. No se entrega un archivo `.pkt` ni se afirma que esa simulación haya sido ejecutada. Es un complemento separado de la aplicación funcional.

## Guion rápido para usarlo

1. Iniciar: doble clic en `INICIAR-HONEYSHIELD.cmd`.
2. Demostrar: `Laboratorio → Ejecutar recorrido`.
3. Explicar: abrir una alerta y mostrar regla, evidencia y evento relacionado.
4. Contener: bloquear un origen y revisarlo en `Respuesta`.
5. Documentar: pulsar `Exportar informe`.
6. Cerrar los servicios al terminar: doble clic en `DETENER-HONEYSHIELD.cmd`.

El guion completo de diez minutos y las respuestas a preguntas frecuentes están en `EXPOSICION.md`. Los nuevos recorridos se acumulan; los totales generales no se reinician automáticamente.


## Revisión del código comentado

Comentarios explicativos en español en el código y la configuración del proyecto, sin cambios de lógica.
Se comprobó igualdad de AST Python, JavaScript emitido y estructura CSS/HTML respecto de la versión anterior.
Los JSON de dependencias y TypeScript permanecen intactos; se explican en README.md.

- `npm run build`: correcto.
- `.venv\Scripts\python.exe -m pytest tests -q --junitxml=output/evidence/pruebas-codigo-comentado.xml`: 20 pruebas aprobadas.
- Resultado guardado en `output/evidence/pruebas-codigo-comentado.xml`.
- La verificación usa datos y puertos temporales.

## Verificación de la entrega local · 10 de noviembre de 2026

- Entrega simplificada con los scripts de instalación, inicio y detención para Windows.
- `launch.py --no-browser`: correcto; ambos servicios locales activos.
- `/health` de los puertos 8840 y 8841: respuesta `status: ok`.
- 20 pruebas de integración aprobadas en 13,72 segundos después de la limpieza.
- Resultado guardado en `output/evidence/pruebas-entrega-local.xml`.

## Separación de la interfaz en módulos · 10 de noviembre de 2026

- `src/main.tsx` inicia React; `src/App.tsx` compone las pantallas. Se separaron vistas, componentes,
  hooks, acceso a la API, tipos y utilidades. Los comentarios explicativos se conservan.
- `src/interface.css` importa los estilos por sección y tamaño de pantalla, manteniendo su orden.
  El CSS compilado conserva el mismo contenido que antes de la separación.
- Compilación de producción y comprobación TypeScript con variables y parámetros sin usar: correctas.
- 20 pruebas de integración aprobadas. Resultado en `output/evidence/pruebas-modulos.xml`.
- Comparación de 11 capturas con los mismos datos y hora: imágenes idénticas en escritorio, móvil,
  tema oscuro, acceso y detalle de evidencia. Resultado en `output/evidence/comparacion-modulos.json`.
- Prueba de navegador con API y WebSocket reales: navegación, búsqueda, filtros, temas, edición de reglas,
  cinco escenarios, las tres detecciones manuales, bloqueo HTTP 429, desbloqueo, revisión de alertas,
  descargas PDF/CSV, menú móvil y cierre/inicio de sesión: correctos.
- Se corrigió el retorno del foco al botón de origen al cerrar el detalle de una alerta. Se comprobaron
  Tab, Shift+Tab y Escape, además del ancho de 321 px sin desbordamiento de la página.
- Resultado funcional en `output/evidence/interfaz-modular.json`, sin errores JavaScript no capturados.
  Los datos y servicios usados para estas pruebas fueron temporales, separados del laboratorio del usuario.
- La forma de iniciar y detener HoneyShield se conserva. README.md y EXPOSICION.md indican las nuevas
  ubicaciones de las funciones para la exposición.
