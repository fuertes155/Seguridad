# LANZADOR LOCAL: inicia o detiene únicamente los dos servicios de este proyecto.
# Es el punto de entrada de los archivos .cmd; conserva la evidencia en .runtime.
"""Local launcher: owns only the two HoneyShield server processes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'.runtime'
DATA.mkdir(exist_ok=True)
PYTHON=ROOT/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
PROCESSES=DATA/'processes.json'

# Comprueba /health y la identidad del servicio; un puerto ocupado por otra aplicación no cuenta como sano.
def healthy(port,service):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/health',timeout=1) as r:
            return json.load(r).get('service')==service
    except Exception:return False

# Reutiliza servicios saludables; inicia los ausentes con el Python de .venv y espera su disponibilidad.
def start():
    if not (ROOT/'dist'/'index.html').exists():
        raise RuntimeError('Falta la interfaz compilada. Ejecuta INSTALAR-HONEYSHIELD.cmd primero.')
    if not PYTHON.exists():
        raise RuntimeError('Falta el entorno Python. Ejecuta INSTALAR-HONEYSHIELD.cmd primero.')
    state=json.loads(PROCESSES.read_text()) if PROCESSES.exists() else {}
    for name,port in [('admin',8840),('decoy',8841)]:
        if healthy(port,'honeyshield-'+name):continue
        # Uvicorn sirve FastAPI. 127.0.0.1 limita el acceso al equipo local.
        # --no-proxy-headers evita confiar en IP declarada por el cliente; --no-access-log reduce datos en consola.
        command=[str(PYTHON),'-m','uvicorn','backend.'+name+':app','--host','127.0.0.1','--port',str(port),'--no-proxy-headers','--no-access-log']
        with (DATA/(name+'.log')).open('a',encoding='utf-8') as output:
            # Proceso independiente y oculto en Windows, con salida en un archivo de registro privado.
            process=subprocess.Popen(command,cwd=ROOT,stdout=output,stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,creationflags=(subprocess.CREATE_NO_WINDOW|subprocess.CREATE_NEW_PROCESS_GROUP) if os.name=='nt' else 0,start_new_session=os.name!='nt')
        # Espera acotada de arranque: comprueba salud y detecta si el proceso terminó con error.
        for _ in range(60):
            if healthy(port,'honeyshield-'+name):break
            if process.poll() is not None:raise RuntimeError(f'No pudo iniciar {name}. Consulta .runtime/{name}.log; el puerto {port} podría estar ocupado.')
            time.sleep(.3)
        else:raise RuntimeError(f'No respondió {name}. Consulta .runtime/{name}.log.')
        # Conserva PID y puerto para poder detener solo estos servicios después.
        state[name]={'pid':process.pid,'port':port}
        PROCESSES.write_text(json.dumps(state))

# Genera un token de acceso de un solo uso con 120 segundos de vigencia.
# Guarda solo su hash y entrega el token al navegador en el fragmento #ticket; no se imprime en consola.
def ticket_url():
    token=secrets.token_urlsafe(32)
    (DATA/'launch.json').write_text(json.dumps({'hash':hashlib.sha256(token.encode()).hexdigest(),'expires':time.time()+120}),encoding='utf-8')
    return 'http://127.0.0.1:8840/#ticket='+token

# Lee los PID creados por este lanzador y comprueba su comando antes de terminar procesos.
# No elimina SQLite, credenciales ni informes; retirar processes.json solo limpia el registro de procesos.
def stop():
    if not PROCESSES.exists():return
    state=json.loads(PROCESSES.read_text())
    for name,info in state.items():
        if not healthy(info['port'],'honeyshield-'+name):continue
        # Only stop a PID whose command line belongs to this checkout and service.
        # En Windows valida que el PID corresponda al intérprete de este proyecto y al módulo esperado.
        if os.name=='nt':
            ps="Get-CimInstance Win32_Process -Filter 'ProcessId = %d' | Select-Object -ExpandProperty CommandLine"%info['pid']
            found=subprocess.run(['powershell','-NoProfile','-Command',ps],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW).stdout
            if 'backend.'+name+':app' in found and str(PYTHON).lower() in found.lower():
                os.kill(info['pid'],signal.SIGTERM)
        else:
            try:
                cmd=Path(f"/proc/{info['pid']}/cmdline").read_text().replace('\x00',' ')
                if 'backend.'+name+':app' in cmd and str(PYTHON) in cmd:os.kill(info['pid'],signal.SIGTERM)
            except OSError:pass
    PROCESSES.unlink(missing_ok=True)

# Solo se ejecuta al invocar el archivo. --stop detiene; --no-browser inicia sin abrir la interfaz.
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--stop',action='store_true')
    args=parser.parse_args()
    try:
        if args.stop:
            stop();print('HoneyShield detenido. Las evidencias permanecen guardadas.')
        else:
            start()
            if not args.no_browser:webbrowser.open(ticket_url())
            print('HoneyShield activo en http://127.0.0.1:8840')
            print('Portal señuelo en http://127.0.0.1:8841')
    except Exception as exc:
        print(str(exc));sys.exit(1)
