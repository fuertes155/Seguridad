@echo off
REM Localiza el proyecto asociado a este archivo.
cd /d "%~dp0"
REM Pide al lanzador terminar sus procesos comprobados; no borra evidencias.
".venv\Scripts\python.exe" launch.py --stop
REM Permite leer un posible error antes de cerrar la ventana.
if errorlevel 1 pause
