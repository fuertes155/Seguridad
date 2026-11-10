@echo off
REM Fija la carpeta del proyecto antes de usar rutas relativas.
cd /d "%~dp0"
REM Si falta el entorno, invoca el instalador antes de iniciar los servicios.
if not exist ".venv\Scripts\python.exe" (
  call INSTALAR-HONEYSHIELD.cmd
  REM Mantiene visible el error si el lanzador no puede iniciar.
  if errorlevel 1 exit /b 1
)
REM Inicia los servicios ausentes y abre el panel con un ticket temporal de un solo uso.
".venv\Scripts\python.exe" launch.py
REM Mantiene visible el error si el lanzador no puede iniciar.
if errorlevel 1 pause
