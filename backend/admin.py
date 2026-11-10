# HONEYSHIELD: API del analista, colector interno y entrega del panel React en el puerto 8840.
# /api requiere sesión en sus operaciones protegidas; /internal requiere la clave del colector.
# FastAPI valida los modelos Pydantic antes de ejecutar las funciones de cada ruta.
import asyncio
import csv
import hashlib
import hmac
import io
import json
import secrets
import threading
import time
from datetime import datetime, timezone, timedelta
from html import escape

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .config import ADMIN_URL, DATA, DECOY_URL, PUBLIC_DECOY_URL, ROOT, SETTINGS
from . import store

app = FastAPI(title='HoneyShield · administración', docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1','localhost','admin','testserver'])
COOKIE = 'honeyshield_session'
ALLOWED_ORIGINS = {ADMIN_URL, 'http://127.0.0.1:5173', 'http://localhost:5173'}
# Límite de acceso al panel, independiente de AUTH-01 del señuelo; se reinicia con el proceso.
attempts = {}
# Un candado impide consumir dos veces el mismo ticket en peticiones simultáneas.
ticket_lock = threading.Lock()
# El bloqueo asíncrono permite una ejecución guiada a la vez.
scenario_lock = asyncio.Lock()

# Calcula SHA-256 para tokens aleatorios; las contraseñas del analista se derivan con scrypt.
def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

# Acepta únicamente tokens cuyo hash esté en SQLite y cuya sesión no haya vencido.
def session_valid(token):
    if not token:
        return False
    return bool(store.rows('SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>?', (digest(token),time.time())))

# Dependencia de FastAPI para proteger rutas del analista; una sesión ausente o vencida produce 401.
def auth(request: Request):
    if not session_valid(request.cookies.get(COOKIE)):
        raise HTTPException(401, 'Inicia sesión para continuar.')

# Autentica al señuelo con un secreto independiente. compare_digest evita comparación temprana carácter a carácter.
def collector(request: Request):
    if not hmac.compare_digest(request.headers.get('x-collector-key',''), SETTINGS['collector_key']):
        raise HTTPException(401, 'Collector authentication required')

# Middleware de administración: verifica Origin en escrituras /api y el tamaño declarado del cuerpo.
# Añade cabeceras de seguridad a las respuestas que pasan por el procesamiento normal.
@app.middleware('http')
async def guard(request: Request, call_next):
    # La cabecera Origin debe coincidir con la del panel para acciones que modifican datos.
    # Esto complementa la sesión y ayuda a evitar solicitudes de otros sitios (CSRF).
    if request.method in {'POST','PUT','PATCH','DELETE'} and request.url.path.startswith('/api/'):
        if request.headers.get('origin') not in ALLOWED_ORIGINS:
            return JSONResponse({'detail':'Origen de solicitud no permitido.'}, status_code=403)
    try:
        # Límite sobre Content-Length declarado; el portal aplica además su propio límite al leer el cuerpo.
        body_size = int(request.headers.get('content-length','0') or 0)
    except ValueError:
        return JSONResponse({'detail':'Longitud de solicitud no válida.'}, status_code=400)
    if body_size > 16384:
        return JSONResponse({'detail':'Solicitud demasiado grande.'}, status_code=413)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:8840 ws://localhost:8840; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    if request.url.path.startswith(('/api/','/internal/')):
        response.headers['Cache-Control'] = 'no-store'
    return response

# Crea un token aleatorio, guarda su hash y entrega la cookie de sesión por 43.200 s (12 horas).
# HttpOnly impide leerla con JavaScript; SameSite Strict limita su envío entre sitios.
def issue_session(response):
    token = secrets.token_urlsafe(32)
    with store.db() as c:
        c.execute('DELETE FROM sessions WHERE expires_at<?', (time.time(),))
        c.execute('INSERT INTO sessions VALUES(?,?)', (digest(token),time.time()+43200))
    response.set_cookie(COOKIE,token,max_age=43200,httponly=True,samesite='strict',path='/api')
    return {'ok':True, 'user':'Analista local'}

# Modelo del formulario real del analista: limita la longitud de usuario y contraseña.
class Login(BaseModel):
    username: str = Field(max_length=80)
    password: str = Field(max_length=200)

# Autenticación del analista, distinta del login ficticio de NovaTech.
# Limita fallos por IP en memoria, verifica scrypt y crea una sesión al acertar.
@app.post('/api/auth/login')
def login(data: Login, request: Request, response: Response):
    source = request.client.host
    now = time.time()
    recent = [t for t in attempts.get(source,[]) if t > now-60]
    if len(recent) >= 5:
        raise HTTPException(429, 'Espera un minuto antes de volver a intentarlo.')
    # Usa el mismo salt y parámetros de la instalación para comparar el hash, sin recuperar la contraseña.
    candidate = hashlib.scrypt(data.password.encode(), salt=bytes.fromhex(SETTINGS['salt']), n=16384,r=8,p=1).hex()
    if data.username != 'analista' or not hmac.compare_digest(candidate,SETTINGS['password_hash']):
        attempts[source] = recent+[now]
        raise HTTPException(401,'Usuario o contraseña incorrectos.')
    attempts.pop(source,None)
    store.audit('session.login','Sesión del analista iniciada.')
    return issue_session(response)

# Modelo para recibir el token temporal que produce el lanzador local.
class Ticket(BaseModel):
    ticket: str = Field(max_length=200)

# Intercambia un enlace temporal por una sesión. Comprueba hash, vencimiento y consumo de un solo uso.
@app.post('/api/auth/launch')
def launch(data: Ticket, response: Response):
    with ticket_lock:
        path = DATA / 'launch.json'
        try:
            ticket = json.loads(path.read_text())
        except (OSError,ValueError):
            raise HTTPException(401,'El enlace de inicio venció. Abre INICIAR-HONEYSHIELD.cmd de nuevo.')
        if ticket['expires'] < time.time() or not hmac.compare_digest(ticket['hash'],digest(data.ticket)):
            raise HTTPException(401,'El enlace de inicio venció. Abre INICIAR-HONEYSHIELD.cmd de nuevo.')
        # Consumir el ticket lo invalida. El archivo guarda su hash, no el token recibido.
        path.unlink()
    store.audit('session.launch','Acceso local mediante enlace de un solo uso.')
    return issue_session(response)

# Permite a React comprobar que su cookie todavía corresponde a una sesión válida.
@app.get('/api/auth/session', dependencies=[Depends(auth)])
def session():
    return {'user':'Analista local'}

# Revoca el hash en SQLite y borra la cookie; ambas acciones son necesarias para cerrar la sesión.
@app.post('/api/auth/logout', dependencies=[Depends(auth)])
def logout(request: Request, response: Response):
    with store.db() as c:
        c.execute('DELETE FROM sessions WHERE token_hash=?',(digest(request.cookies[COOKIE]),))
    response.delete_cookie(COOKIE,path='/api')
    return {'ok':True}

# Identifica al servicio para el lanzador y las comprobaciones de disponibilidad.
@app.get('/health')
def health():
    return {'status':'ok','service':'honeyshield-admin','version':'1.0.0'}

# Contrato del evento interno: longitudes, estado HTTP y tipos permitidos.
# El candidato puede ser texto de búsqueda o usuario; no hay campo de contraseña.
class Event(BaseModel):
    source: str = Field(min_length=1,max_length=80)
    method: str = Field(max_length=10)
    path: str = Field(max_length=500)
    status: int = Field(ge=100,le=599)
    kind: str = Field(pattern='^(visit|search|auth_failure|resource|blocked)$')
    detail: str = Field(default='',max_length=1000)
    candidate: str = Field(default='',max_length=2000)
    run_id: str | None = Field(default=None,max_length=40)

# Recibe un evento del colector autenticado y delega su evaluación/persistencia en store.record_event.
@app.post('/internal/events', dependencies=[Depends(collector)])
def ingest(event: Event):
    return store.record_event(event.model_dump())

# Devuelve el bloqueo vigente que el middleware de NovaTech debe aplicar al origen.
@app.get('/internal/block', dependencies=[Depends(collector)])
def check_block(source: str):
    return {'block':store.active_block(source)}

# Construye la respuesta de /api/state: métricas, series temporales y listas recientes.
# Eventos/alertas/orígenes usan 24 h; pendientes incluye todas las alertas abiertas; bloqueos exige vigencia.
def snapshot():
    now = time.time()
    start = now-86400
    with store.db() as c:
        metrics = {
            'events': c.execute('SELECT count(*) FROM events WHERE ts>=?',(start,)).fetchone()[0],
            'alerts': c.execute('SELECT count(*) FROM alerts WHERE ts>=?',(start,)).fetchone()[0],
            'open_alerts': c.execute("SELECT count(*) FROM alerts WHERE status='open'").fetchone()[0],
            'sources': c.execute('SELECT count(DISTINCT source) FROM events WHERE ts>=?',(start,)).fetchone()[0],
            'blocks': c.execute('SELECT count(DISTINCT source) FROM blocks WHERE active=1 AND expires_at>?',(now,)).fetchone()[0],
            'blocked_requests': c.execute("SELECT count(*) FROM events WHERE kind='blocked' AND ts>=?",(start,)).fetchone()[0],
            'runs': c.execute("SELECT count(*) FROM runs WHERE status='completed'").fetchone()[0],
        }
        # Se agrupan las últimas 24 horas en 12 intervalos de 7.200 s (dos horas).
        history = []
        for i in range(12):
            lo = start+i*7200; hi = lo+7200
            history.append({'ts':lo,'events':c.execute('SELECT count(*) FROM events WHERE ts>=? AND ts<?',(lo,hi)).fetchone()[0], 'alerts':c.execute('SELECT count(*) FROM alerts WHERE ts>=? AND ts<?',(lo,hi)).fetchone()[0], 'sources':c.execute('SELECT count(DISTINCT source) FROM events WHERE ts>=? AND ts<?',(lo,hi)).fetchone()[0], 'blocked_requests':c.execute("SELECT count(*) FROM events WHERE kind='blocked' AND ts>=? AND ts<?",(lo,hi)).fetchone()[0]})
    rules = store.rows('SELECT * FROM rules ORDER BY id')
    for r in rules:
        r['config'] = json.loads(r['config']); r['enabled'] = bool(r['enabled'])
    return {'now':now,'metrics':metrics,'history':history,
            # Las listas se limitan para mantener una respuesta pequeña; no son toda la base de datos.
            'events':store.rows('SELECT * FROM events ORDER BY id DESC LIMIT 100'),
            'alerts':store.rows('SELECT * FROM alerts ORDER BY id DESC LIMIT 100'),
            'blocks':store.rows('SELECT * FROM blocks ORDER BY id DESC LIMIT 50'),
            'rules':rules,'audit':store.rows('SELECT * FROM audit ORDER BY id DESC LIMIT 15'),
            'runs':store.rows('SELECT * FROM runs ORDER BY started_at DESC LIMIT 15'),
            'categories':store.rows('SELECT rule_id,count(*) as count FROM alerts WHERE ts>=? GROUP BY rule_id',(start,)),
            'decoy_url':PUBLIC_DECOY_URL}

# Entrega al panel una fotografía actual de SQLite; no fabrica eventos de ejemplo.
@app.get('/api/state', dependencies=[Depends(auth)])
def state():
    return snapshot()

# Comprueba la salud HTTP del señuelo. El panel usa este dato para mostrar conectado/desconectado.
@app.get('/api/status', dependencies=[Depends(auth)])
async def status():
    try:
        async with httpx.AsyncClient(timeout=2,trust_env=False) as client:
            r = await client.get(DECOY_URL+'/health')
            decoy = r.status_code == 200 and r.json().get('service') == 'honeyshield-decoy'
    except Exception:
        decoy = False
    return {'admin':True,'decoy':decoy,'database':True}

# Canal WebSocket autenticado con verificación de Origin.
# Envía un aviso cada dos segundos; React vuelve a consultar /api/state, no recibe aquí todos los eventos.
@app.websocket('/api/live')
async def live(ws: WebSocket):
    if ws.headers.get('origin') not in ALLOWED_ORIGINS or not session_valid(ws.cookies.get(COOKIE)):
        await ws.close(code=1008); return
    await ws.accept()
    try:
        while session_valid(ws.cookies.get(COOKIE)):
            await ws.send_json({'type':'refresh','at':time.time()})
            # Es una frecuencia de aviso, no una garantía de latencia extremo a extremo.
            await asyncio.sleep(2)
        await ws.close(code=1008)
    except (WebSocketDisconnect,RuntimeError):
        pass

# Límites del servidor para AUTH-01: 2-20 fallos y ventana de 10-300 segundos.
class RuleUpdate(BaseModel):
    enabled: bool
    threshold: int = Field(default=5,ge=2,le=20)
    window: int = Field(default=60,ge=10,le=300)

# Activa/desactiva una regla y guarda su configuración; anota el cambio en la bitácora.
@app.patch('/api/rules/{rule_id}', dependencies=[Depends(auth)])
def update_rule(rule_id: str, data: RuleUpdate):
    with store.db() as c:
        rule = c.execute('SELECT * FROM rules WHERE id=?',(rule_id,)).fetchone()
        if not rule: raise HTTPException(404,'Regla no encontrada.')
        # Solo la regla de autenticación utiliza umbral y ventana; las demás conservan config vacío.
        cfg = {'threshold':data.threshold,'window':data.window} if rule['kind']=='auth' else {}
        c.execute('UPDATE rules SET enabled=?,config=? WHERE id=?',(int(data.enabled),json.dumps(cfg),rule_id))
    store.audit('rule.update',f"{rule_id}: {'activada' if data.enabled else 'desactivada'}.")
    return {'ok':True}

# Datos para contención: origen observado, duración de 1-60 minutos y motivo opcional.
class BlockRequest(BaseModel):
    source: str = Field(min_length=1,max_length=80)
    minutes: int = Field(default=5,ge=1,le=60)
    reason: str = Field(default='Contención manual desde el panel.',max_length=200)

# Requiere un origen ya observado. Desactiva bloqueos previos de ese origen y crea uno con vencimiento.
def create_block(source, minutes, reason):
    if not store.rows('SELECT 1 FROM events WHERE source=? LIMIT 1',(source,)):
        raise HTTPException(400,'Solo se pueden bloquear orígenes observados por el señuelo.')
    now = time.time()
    with store.db() as c:
        c.execute('UPDATE blocks SET active=0 WHERE source=? AND active=1',(source,))
        # time.time() usa segundos Unix; minutos * 60 fija expires_at. El middleware consulta ese límite.
        cur = c.execute('INSERT INTO blocks(source,created_at,expires_at,reason) VALUES(?,?,?,?)',(source,now,now+minutes*60,reason))
        block_id = cur.lastrowid
    store.audit('block.create',f'{source}: bloqueo por {minutes} minutos.')
    return block_id

# Ruta del botón Bloquear origen; la interfaz solicita cinco minutos.
@app.post('/api/blocks', dependencies=[Depends(auth)])
def block(data: BlockRequest):
    return {'id':create_block(data.source,data.minutes,data.reason)}

# Retira la contención marcando active=0, conserva el historial y registra el retiro en la bitácora.
@app.delete('/api/blocks/{block_id}', dependencies=[Depends(auth)])
def unblock(block_id: int):
    with store.db() as c:
        row = c.execute('SELECT * FROM blocks WHERE id=?',(block_id,)).fetchone()
        if not row: raise HTTPException(404,'Bloqueo no encontrado.')
        c.execute('UPDATE blocks SET active=0 WHERE id=?',(block_id,))
    store.audit('block.release',f"{row['source']}: bloqueo retirado por el analista.")
    return {'ok':True}

# Marca una alerta abierta como resuelta y guarda la hora. No cambia los bloqueos del origen.
@app.patch('/api/alerts/{alert_id}/resolve', dependencies=[Depends(auth)])
def resolve(alert_id: int):
    with store.db() as c:
        cur = c.execute("UPDATE alerts SET status='resolved',resolved_at=? WHERE id=? AND status='open'",(time.time(),alert_id))
        if not cur.rowcount: raise HTTPException(404,'La alerta ya fue resuelta o no existe.')
    store.audit('alert.resolve',f'Alerta HS-{alert_id:04d} revisada y resuelta.')
    return {'ok':True}

SCENARIOS = {'normal':'Navegación normal','auth':'Accesos repetidos','sql':'Indicio de SQL Injection','resource':'Recurso señuelo','containment':'Prueba de contención'}

# Ejecuta solicitudes HTTP reales contra el señuelo con un identificador lab-* autenticado.
# Serializa escenarios para que sus pruebas no se solapen; persiste inicio, resultado y evidencia.
@app.post('/api/scenarios/{scenario}', dependencies=[Depends(auth)])
async def run_scenario(scenario: str):
    if scenario not in SCENARIOS: raise HTTPException(404,'Escenario no encontrado.')
    if scenario_lock.locked(): raise HTTPException(409,'Ya hay una prueba en curso.')
    async with scenario_lock:
        # La etiqueta lab-* separa la prueba de las acciones manuales de 127.0.0.1; no representa una IP real.
        run_id = secrets.token_hex(10)
        source = 'lab-'+run_id[:8]
        expected = {'normal':'Sin alertas','auth':'AUTH-01 si la regla está activa','sql':'SQL-01 si la regla está activa','resource':'DECOY-01 si la regla está activa','containment':'Respuesta HTTP 429 tras el bloqueo'}[scenario]
        with store.db() as c:
            c.execute('INSERT INTO runs(id,started_at,scenario,source,expected,status) VALUES(?,?,?,?,?,?)',(run_id,time.time(),SCENARIOS[scenario],source,expected,'running'))
        error = None
        try:
            async with httpx.AsyncClient(timeout=8,trust_env=False,headers={'X-Honeyshield-Lab-Key':SETTINGS['collector_key'],'X-Honeyshield-Run':run_id}) as client:
                # Ayudante del escenario: envía una solicitud y considera error un fallo de servicio (5xx).
                # Las respuestas esperadas de rechazo 401, 403 y 429 también son resultados válidos de las pruebas.
                async def send(method,path,body=None):
                    result = await client.request(method,DECOY_URL+path,json=body)
                    if result.status_code >= 500: raise RuntimeError('El señuelo no pudo registrar la solicitud.')
                    await asyncio.sleep(.18)
                    return result
                # Control de referencia: navegar y buscar texto normal debe producir eventos sin detecciones.
                if scenario=='normal':
                    await send('GET','/')
                    await send('POST','/search',{'query':'manual de bienvenida'})
                # Lee el umbral guardado para enviar exactamente esa cantidad de fallos ficticios.
                elif scenario=='auth':
                    cfg = json.loads(store.rows("SELECT config FROM rules WHERE id='AUTH-01'")[0]['config'])
                    for _ in range(cfg['threshold']):
                        await send('POST','/login',{'username':'prueba@novatech.local','password':'dato-ficticio'})
                # La cadena es un dato de prueba enviado por HTTP; no se ejecuta como SQL en este escenario.
                elif scenario=='sql':
                    await send('POST','/search',{'query':"' OR 1=1 --"})
                else:
                    await send('GET','/backups/nomina.zip')
                    # Este escenario sí crea explícitamente un bloqueo y verifica una siguiente respuesta 429.
                    if scenario=='containment':
                        create_block(source,5,'Contención verificada mediante una solicitud real del laboratorio.')
                        result = await send('GET','/login')
                        if result.status_code != 429: raise RuntimeError('El bloqueo no produjo la respuesta esperada.')
        except Exception as exc:
            error = 'No fue posible completar la prueba. Comprueba que el portal señuelo está iniciado.' if isinstance(exc,httpx.HTTPError) else str(exc)[:160]
        with store.db() as c:
            c.execute('UPDATE runs SET finished_at=?,status=?,error=? WHERE id=?',(time.time(),'failed' if error else 'completed',error,run_id))
        store.audit('lab.run',f"{SCENARIOS[scenario]}: {'fallida' if error else 'completada'} ({source}).")
        if error: raise HTTPException(503,error)
        return {'id':run_id,'source':source,'events':store.rows('SELECT * FROM events WHERE run_id=?',(run_id,))}

# Exporta hasta 10.000 eventos a CSV con fecha UTC y neutralización de fórmulas de hoja de cálculo.
@app.get('/api/export/events.csv', dependencies=[Depends(auth)])
def export_csv():
    output = io.StringIO(newline='')
    writer = csv.writer(output)
    writer.writerow(['id','fecha_utc','origen','metodo','ruta','estado_http','tipo','severidad','regla','detalle'])
    for e in store.rows('SELECT * FROM events ORDER BY id LIMIT 10000'):
        values = [e['id'],datetime.fromtimestamp(e['ts'],timezone.utc).isoformat(),e['source'],e['method'],e['path'],e['status'],e['kind'],e['severity'],e['rule_id'] or '',e['detail']]
        # Anteponer una comilla evita que Excel interprete valores que empiezan por =, +, -, @, tab o retorno como fórmula.
        writer.writerow([("'"+v if v and v[0] in '=+-@\t\r' else v) if isinstance(v,str) else v for v in values])
    return Response('\ufeff'+output.getvalue(),media_type='text/csv; charset=utf-8',headers={'Content-Disposition':'attachment; filename="honeyshield-eventos.csv"'})

# Construye en memoria el informe ReportLab a partir de snapshot.
# Incluye como máximo 40 alertas recientes; es una fotografía del estado, no un informe que se actualice solo.
@app.get('/api/export/report.pdf', dependencies=[Depends(auth)])
def export_pdf():
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
    out = io.BytesIO()
    doc = SimpleDocTemplate(out,pagesize=(595,842),rightMargin=44,leftMargin=44,topMargin=48,bottomMargin=48,title='HoneyShield - Informe de actividad')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='HsTitle',fontName='Helvetica-Bold',fontSize=26,leading=30,textColor=colors.HexColor('#142331'),spaceAfter=12))
    styles.add(ParagraphStyle(name='HsBody',fontName='Helvetica',fontSize=9,leading=14,spaceAfter=8))
    styles.add(ParagraphStyle(name='HsSmall',fontName='Helvetica',fontSize=8,leading=11))
    data = snapshot()
    # escape evita que el texto de evidencia se interprete como etiquetas dentro de Paragraph.
    p = lambda text: Paragraph(escape(str(text)),styles['HsBody'])
    local_zone = timezone(timedelta(hours=-5))
    severity_labels = {'high':'Alta','medium':'Media','low':'Baja','info':'Informativa'}
    status_labels = {'open':'Pendiente','resolved':'Resuelta','completed':'Completada','running':'En curso','failed':'Fallida'}
    flow = [Paragraph('HoneyShield',styles['HsTitle']),p('INFORME DE ACTIVIDAD DEL LABORATORIO'),p('Generado: '+datetime.now(local_zone).strftime('%Y-%m-%d %H:%M')+' · Colombia (UTC-5)'),
            p('Alcance: portal señuelo local y pruebas controladas. Los registros corresponden a solicitudes recibidas. Las alertas son indicios y no prueban una explotación exitosa.'),Spacer(1,12)]
    metrics = data['metrics']
    table = Table([['Eventos (24 h)','Alertas (24 h)','Pendientes','Bloqueos activos'],[str(metrics['events']),str(metrics['alerts']),str(metrics['open_alerts']),str(metrics['blocks'])]],colWidths=[127,127,127,126])
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#142331')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('BACKGROUND',(0,1),(-1,1),colors.HexColor('#f5f3ed')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    flow += [table,Spacer(1,22),Paragraph('Hallazgos y evidencias',styles['Heading2'])]
    # Se limita el tamaño del PDF y se mantiene visible ese alcance en el pie de página.
    alerts = data['alerts'][:40]
    if not alerts: flow.append(p('No hay alertas registradas. Esto no garantiza ausencia de vulnerabilidades.'))
    for a in alerts:
        when = datetime.fromtimestamp(a['ts'],local_zone).strftime('%Y-%m-%d %H:%M:%S')
        flow.append(KeepTogether([p(f"HS-{a['id']:04d} | {a['title']} | Severidad: {severity_labels[a['severity']]}"),p(f"Origen: {a['source']} | Regla: {a['rule_id']} | Estado: {status_labels[a['status']]} | Evento: {a['event_id']}"),p(f"Fecha: {when} (UTC-5)"),p(a['evidence']),Spacer(1,6)]))
    if len(alerts) >= 3:
        flow += [PageBreak(),Paragraph('Metodología y validación',styles['HsTitle'])]
    flow += [Spacer(1,10),Paragraph('Reglas y límites de la evaluación',styles['Heading2'])]
    for r in data['rules']: flow.append(p(f"{r['id']} - {r['name']}: {'activa' if r['enabled'] else 'inactiva'}. {r['description']}"))
    flow.append(p('Los orígenes lab-* son identificadores de clientes de prueba autenticados, no direcciones IP. El detector web no identifica por sí solo un escaneo TCP. El bloqueo limita el acceso al señuelo; no modifica el firewall del equipo.'))
    flow += [Paragraph('Pruebas recientes',styles['Heading2'])]
    for r in data['runs'][:10]: flow.append(p(f"{r['scenario']} | {status_labels[r['status']]} | {r['source']} | Esperado: {r['expected']}"))
    flow += [Spacer(1,12),Paragraph('Acciones recientes del analista',styles['Heading2'])]
    for a in data['audit'][:6]:
        when = datetime.fromtimestamp(a['ts'],local_zone).strftime('%H:%M:%S')
        flow.append(p(f"{when} (UTC-5) | {a['detail']}"))
    flow.append(p('Criterio de interpretación: contrastar alertas con solicitudes normales, revisar falsos positivos y repetir las pruebas tras modificar reglas. Este informe documenta las evidencias disponibles, no certifica la seguridad de una red.'))
    # Dibuja identificación y número de página en cada hoja del PDF generado.
    def footer(canvas, document):
        canvas.setFillColor(colors.HexColor('#66717c')); canvas.setFont('Helvetica',8)
        canvas.drawString(44,26,'HoneyShield / Evidencias del laboratorio / Máximo 40 alertas recientes')
        canvas.drawRightString(551,26,str(document.page))
    doc.build(flow,onFirstPage=footer,onLaterPages=footer)
    return Response(out.getvalue(),media_type='application/pdf',headers={'Content-Disposition':'attachment; filename="honeyshield-informe.pdf"'})

# Sirve archivos compilados de dist y usa index.html como entrada de la aplicación React.
# Resuelve la ruta y comprueba que permanezca dentro de dist para evitar acceso a otros archivos.
@app.get('/{path:path}')
def frontend(path: str):
    directory = (ROOT/'dist').resolve()
    target = (directory/path).resolve()
    if not target.is_relative_to(directory): raise HTTPException(404)
    # Las rutas /api o /internal inexistentes deben fallar; no deben devolver accidentalmente el HTML del panel.
    if path.startswith(('api/','internal/')): raise HTTPException(404)
    if target.is_file(): return FileResponse(target)
    if (directory/'index.html').exists(): return FileResponse(directory/'index.html')
    return JSONResponse({'detail':'Ejecuta npm run build para preparar la interfaz.'},status_code=503)
