@echo off
REM Trabaja desde la carpeta del archivo, incluso si el usuario lo abre desde otro directorio.
cd /d "%~dp0"
echo Preparando HoneyShield...
REM Crea un entorno Python aislado para las dependencias del proyecto.
python -m venv .venv
REM Si falla el paso anterior, detiene la instalación y devuelve error.
if errorlevel 1 exit /b 1
REM Instala las versiones fijadas para reproducir el entorno.
".venv\Scripts\python.exe" -m pip install -r requirements-lock.txt
REM Si falla el paso anterior, detiene la instalación y devuelve error.
if errorlevel 1 exit /b 1
REM Instala dependencias JavaScript del package-lock; call permite volver a este script al terminar.
call npm.cmd ci --no-audit --no-fund
REM Si falla el paso anterior, detiene la instalación y devuelve error.
if errorlevel 1 exit /b 1
REM Comprueba TypeScript y compila la interfaz en dist.
call npm.cmd run build
REM Si falla el paso anterior, detiene la instalación y devuelve error.
if errorlevel 1 exit /b 1
echo Listo. Abre INICIAR-HONEYSHIELD.cmd.
