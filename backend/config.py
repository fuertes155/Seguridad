# CONFIGURACIÓN COMPARTIDA: rutas, credenciales iniciales y direcciones de los servicios.
# Los valores privados se crean en .runtime; no deben incluirse en la entrega del código.
import hashlib
import json
import os
import secrets
from pathlib import Path

# __file__ localiza el proyecto independientemente de la carpeta desde la que se ejecute.
ROOT = Path(__file__).resolve().parents[1]
# La variable de entorno permite a las pruebas utilizar una carpeta temporal aislada.
DATA = Path(os.environ.get('HONEYSHIELD_DATA', ROOT / '.runtime'))
DATA.mkdir(parents=True, exist_ok=True)

# Carga la configuración existente; solo crea credenciales si config.json aún no existe.
# Devuelve un diccionario con salt, hash de contraseña y clave del colector.
def settings():
    path = DATA / 'config.json'
    if not path.exists():
        # Generador criptográfico: crea una contraseña distinta para cada instalación.
        password = secrets.token_urlsafe(18)
        salt = secrets.token_hex(16)
        # scrypt deriva un hash con salt: no es cifrado reversible. n, r y p fijan su costo de cálculo.
        # La clave del colector autentica eventos internos y es distinta de la contraseña del analista.
        cfg = {'salt': salt, 'password_hash': hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex(), 'collector_key': secrets.token_urlsafe(32)}
        path.write_text(json.dumps(cfg), encoding='utf-8')
        # Este archivo privado sí contiene la contraseña inicial legible para el dueño del equipo.
        # Es diferente de las contraseñas ensayadas en NovaTech, que no se guardan.
        (DATA / 'acceso.txt').write_text('HoneyShield - acceso local\nUsuario: analista\nContraseña: ' + password + '\n\nAbre INICIAR-HONEYSHIELD.cmd para entrar automáticamente.\n', encoding='utf-8')
        try:
            # Intenta restringir permisos del archivo; el efecto depende del sistema operativo.
            path.chmod(0o600)
            # Este archivo privado sí contiene la contraseña inicial legible para el dueño del equipo.
            # Es diferente de las contraseñas ensayadas en NovaTech, que no se guardan.
            (DATA / 'acceso.txt').chmod(0o600)
        except OSError:
            pass
    cfg = json.loads(path.read_text(encoding='utf-8'))
    # El entorno permite configurar la clave del colector, sin escribirla en el código.
    cfg['collector_key'] = os.environ.get('HONEYSHIELD_COLLECTOR_KEY', cfg['collector_key'])
    return cfg

# Se carga una vez al importar el módulo. Los valores por defecto corresponden al modo local.
SETTINGS = settings()
ADMIN_URL = os.environ.get('HONEYSHIELD_ADMIN_URL', 'http://127.0.0.1:8840')
DECOY_URL = os.environ.get('HONEYSHIELD_DECOY_URL', 'http://127.0.0.1:8841')
# Dirección del portal que se entrega al navegador; por defecto usa el puerto local 8841.
PUBLIC_DECOY_URL = os.environ.get('HONEYSHIELD_PUBLIC_DECOY_URL', 'http://127.0.0.1:8841')
