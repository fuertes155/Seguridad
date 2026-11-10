# PERSISTENCIA Y DETECCIÓN: SQLite guarda eventos, alertas, reglas y acciones del analista.
# Flujo principal: record_event -> evaluar regla -> insertar evento -> crear alerta si corresponde.
# Los signos ? de las consultas son parámetros; los valores no se concatenan al SQL.
import contextlib
import json
import re
import sqlite3
import time
from urllib.parse import unquote
from .config import DATA

DB_PATH = DATA / 'honeyshield.sqlite3'
# AUTH-01: umbral temporal; SQL-01: patrones; DECOY-01: rutas señuelo.
# Las severidades son una clasificación de estas reglas, no una prueba de daño.
DEFAULT_RULES = [
    ('AUTH-01', 'Intentos de acceso repetidos', 'auth', 'medium', {'threshold': 5, 'window': 60}, 'Agrupa fallos de autenticación del mismo origen dentro de una ventana de tiempo.'),
    ('SQL-01', 'Entrada compatible con SQL Injection', 'sqli', 'high', {}, 'Busca combinaciones de operadores y sintaxis SQL. Una coincidencia es un indicio, no una explotación confirmada.'),
    ('DECOY-01', 'Acceso a un recurso señuelo', 'resource', 'medium', {}, 'Detecta solicitudes a rutas reservadas del laboratorio: respaldos y administración ficticia.'),
]

# Administrador de contexto para usar "with db() as c".
# Confirma los cambios al terminar, revierte ante error y siempre cierra la conexión.
@contextlib.contextmanager
def db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    # Permite leer columnas por nombre en lugar de recordar su posición numérica.
    conn.row_factory = sqlite3.Row
    # Activa la integridad referencial para impedir alertas asociadas a eventos inexistentes.
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Crea tablas e índices si no existen y agrega las reglas iniciales sin sobrescribir ajustes guardados.
# alerts.event_id referencia events.id: la alerta siempre conserva su evento de origen.
# blocks guarda vencimientos; audit acciones; sessions hashes; runs ejecuciones del laboratorio.
def init():
    with db() as c:
        # WAL facilita que las lecturas convivan con una escritura; SQLite mantiene un escritor a la vez.
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript('''
        CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, ts REAL NOT NULL, source TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL, severity TEXT NOT NULL, rule_id TEXT, run_id TEXT);
        CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
        CREATE INDEX IF NOT EXISTS events_source_kind ON events(source,kind,ts);
        CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY, event_id INTEGER NOT NULL REFERENCES events(id), ts REAL NOT NULL, source TEXT NOT NULL, rule_id TEXT NOT NULL, title TEXT NOT NULL, severity TEXT NOT NULL, evidence TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', resolved_at REAL);
        CREATE TABLE IF NOT EXISTS blocks(id INTEGER PRIMARY KEY, source TEXT NOT NULL, created_at REAL NOT NULL, expires_at REAL NOT NULL, reason TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS rules(id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, severity TEXT NOT NULL, config TEXT NOT NULL, description TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, ts REAL NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, expires_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, started_at REAL NOT NULL, finished_at REAL, scenario TEXT NOT NULL, source TEXT NOT NULL, expected TEXT NOT NULL, status TEXT NOT NULL, error TEXT);
        ''')
        for rule in DEFAULT_RULES:
            c.execute('INSERT OR IGNORE INTO rules(id,name,kind,severity,config,description) VALUES(?,?,?,?,?,?)', (*rule[:4],json.dumps(rule[4]),rule[5]))

# Añade a la bitácora una acción del analista con hora Unix y descripción.
def audit(action, detail):
    with db() as c:
        c.execute('INSERT INTO audit(ts,action,detail) VALUES(?,?,?)', (time.time(),action,detail))

# Devuelve el bloqueo más reciente del origen que siga activo y no haya vencido.
# Un bloqueo vencido deja de aplicarse aunque su fila permanezca en el historial.
def active_block(source):
    with db() as c:
        row = c.execute('SELECT * FROM blocks WHERE source=? AND active=1 AND expires_at>? ORDER BY id DESC LIMIT 1', (source,time.time())).fetchone()
    return dict(row) if row else None

# Detector heurístico de sintaxis SQL. Devuelve True si coincide algún patrón.
# No ejecuta la entrada ni confirma una explotación; puede haber falsos positivos o negativos.
def sql_signal(value):
    # Recorta a 2.000 caracteres, decodifica URL dos veces y unifica mayúsculas/minúsculas.
    normalized = unquote(unquote(value[:2000])).lower()
    # Patrones: UNION SELECT; OR/AND con comparaciones; instrucciones tras punto y coma; sleep/benchmark.
    patterns = [r"\bunion\s+(?:all\s+)?select\b", r"(?:['\"]|\b)\s*(?:or|and)\s+(?:\d+\s*=\s*\d+|['\"][^'\"]*['\"]\s*=)", r";\s*(?:drop|delete|update|insert)\b", r"\b(?:sleep|benchmark)\s*\("]
    return any(re.search(p, normalized) for p in patterns)

# Limita longitud y elimina caracteres de control; no reemplaza las consultas parametrizadas.
def clean_text(value, limit=500):
    return ''.join(ch for ch in str(value) if ch >= ' ' or ch in '\t')[:limit]

# Recibe un evento validado por la API y evalúa solo las reglas habilitadas.
# La cadena if/elif asigna como máximo una regla por evento: SQL, recurso y luego autenticación.
# Conserva el evento incluso cuando ninguna regla genera alerta; no bloquea automáticamente.
def record_event(data):
    now = time.time()
    source = clean_text(data['source'], 80)
    path = clean_text(data['path'].split('?')[0], 160)
    method = data.get('method','GET')[:10]
    kind = data['kind']
    status = data['status']
    detail = clean_text(data.get('detail',''), 500)
    # Texto candidato a SQL sospechoso: consulta del buscador o nombre de usuario, nunca la contraseña.
    candidate = data.get('candidate','')[:2000]
    run_id = data.get('run_id')
    severity = 'info'
    rule_id = None
    title = None
    evidence = None
    with db() as c:
        # Obtiene el turno de escritura antes de contar e insertar, evitando carreras entre intentos simultáneos.
        c.execute('BEGIN IMMEDIATE')
        rules = {r['kind']: dict(r) for r in c.execute('SELECT * FROM rules WHERE enabled=1')}
        # No reevalúa una solicitud que ya fue detenida por contención. SQL tiene prioridad en esta cadena.
        if kind != 'blocked' and sql_signal(candidate) and 'sqli' in rules:
            r = rules['sqli']; rule_id = r['id']; severity = r['severity']; title = r['name']
            evidence = 'La entrada en ' + path + ' coincide con sintaxis SQL sospechosa. No se ejecutó como SQL. Muestra: ' + clean_text(candidate,160)
            kind = 'sqli'
            detail = evidence
        # El portal etiquetó la solicitud como recurso reservado; aquí se convierte en alerta DECOY-01.
        elif kind == 'resource' and 'resource' in rules:
            r = rules['resource']; rule_id = r['id']; severity = r['severity']; title = r['name']
            evidence = 'Se solicitó el recurso señuelo ' + path + '. El contenido es ficticio y la respuesta fue controlada.'
        elif kind == 'auth_failure' and 'auth' in rules:
            r = rules['auth']; cfg = json.loads(r['config'])
            # Cuenta fallos del mismo origen desde now-window. Suma 1 porque el evento actual aún no se insertó.
            count = c.execute('SELECT count(*) FROM events WHERE source=? AND kind=? AND ts>=?', (source,'auth_failure',now-cfg['window'])).fetchone()[0] + 1
            # Evita alertas repetidas en la misma ventana, incluso si la anterior ya fue revisada.
            recent = c.execute('SELECT 1 FROM alerts WHERE source=? AND rule_id=? AND ts>=?', (source,r['id'],now-cfg['window'])).fetchone()
            # Solo el umbral y la ausencia de una alerta reciente activan AUTH-01.
            if count >= cfg['threshold'] and not recent:
                rule_id = r['id']; severity = r['severity']; title = r['name']
                evidence = f"{count} fallos de acceso en {cfg['window']} segundos desde el mismo origen observado."
        # Un rechazo por bloqueo queda registrado con severidad baja, sin crear otra alerta.
        elif kind == 'blocked':
            severity = 'low'
        # La evidencia se persiste dentro de la misma transacción que su posible alerta.
        cur = c.execute('INSERT INTO events(ts,source,method,path,status,kind,detail,severity,rule_id,run_id) VALUES(?,?,?,?,?,?,?,?,?,?)', (now,source,method,path,status,kind,detail,severity,rule_id,run_id))
        # lastrowid proporciona el identificador que enlaza la nueva alerta con este evento.
        event_id = cur.lastrowid
        if title:
            c.execute('INSERT INTO alerts(event_id,ts,source,rule_id,title,severity,evidence) VALUES(?,?,?,?,?,?,?)', (event_id,now,source,rule_id,title,severity,evidence))
    return {'id': event_id, 'rule_id': rule_id, 'severity': severity}

# Ejecuta una consulta parametrizada y convierte sus filas en diccionarios para la API.
def rows(query, params=()):
    with db() as c:
        return [dict(r) for r in c.execute(query,params)]

# Al importar el módulo, prepara la base existente sin borrar su contenido.
init()
