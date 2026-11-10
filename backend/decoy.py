# NOVATECH: servicio señuelo HTTP. En modo local escucha en 127.0.0.1:8841.
# No administra la base de evidencia: consulta bloqueos y envía registros a HoneyShield.
# Sus cuentas y documentos son ficticios; el login siempre rechaza credenciales.
import hmac
import json
import re
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .config import ADMIN_URL, ROOT, SETTINGS

# Abre un cliente HTTP reutilizable al iniciar FastAPI y lo cierra al apagar el servicio.
# X-Collector-Key autentica el canal interno; trust_env=False evita proxies heredados del entorno.
@asynccontextmanager
async def lifespan(app):
    app.state.client = httpx.AsyncClient(base_url=ADMIN_URL,timeout=5,trust_env=False,headers={'X-Collector-Key':SETTINGS['collector_key']})
    yield
    await app.state.client.aclose()

# Desactiva la documentación automática y limita los nombres de host aceptados.
app = FastAPI(title='NovaTech · señuelo',docs_url=None,redoc_url=None,openapi_url=None,lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1','localhost','decoy','testserver'])

# Normalmente devuelve la IP de la conexión. Solo acepta un origen lab-* con ID y clave válidos.
# Una cabecera enviada por un visitante no basta para fingir un cliente del laboratorio.
def identity(request):
    run = request.headers.get('x-honeyshield-run','')
    if re.fullmatch('[a-f0-9]{20}',run) and hmac.compare_digest(request.headers.get('x-honeyshield-lab-key',''),SETTINGS['collector_key']):
        return 'lab-'+run[:8], run
    return request.client.host, None

# Middleware: consultar bloqueo -> atender o rechazar -> enviar el evento al colector.
# request.state.event transporta información entre el middleware y la función de la ruta.
@app.middleware('http')
async def instrument(request: Request, call_next):
    # Excluye solicitudes técnicas de salud e icono para no contaminar la evidencia.
    if request.url.path == '/health': return await call_next(request)
    # Excluye solicitudes técnicas de salud e icono para no contaminar la evidencia.
    if request.url.path == '/favicon.ico': return Response(status_code=204)
    source, run_id = identity(request)
    try:
        # Pregunta al administrador por el bloqueo antes de permitir que la ruta procese la solicitud.
        result = await app.state.client.get('/internal/block',params={'source':source})
        result.raise_for_status()
        blocked = result.json()['block']
    # Si no se puede comprobar la contención, responde 503 en lugar de continuar sin control.
    except (httpx.HTTPError,ValueError):
        return JSONResponse({'message':'El laboratorio se está iniciando. Intenta nuevamente.'},status_code=503)
    # Registro inicial por solicitud; cada ruta puede añadir tipo, detalle y texto candidato.
    request.state.event = {'source':source,'method':request.method,'path':request.url.path,'status':200,'kind':'visit','detail':'Visita al portal de demostración.','candidate':'','run_id':run_id}
    # El rechazo temporal es HTTP 429. No modifica el firewall ni bloquea el panel del analista.
    if blocked:
        request.state.event.update(kind='blocked',detail='Solicitud rechazada por un bloqueo temporal activo.',status=429)
        response = JSONResponse({'message':'Acceso temporalmente restringido por el laboratorio.','retry_after':max(1,int(blocked['expires_at']-__import__('time').time()))},status_code=429)
    else:
        # La ruta crea su respuesta; después se conserva su estado HTTP real.
        response = await call_next(request)
        request.state.event['status'] = response.status_code
    try:
        # La llamada se espera: no se considera registrado el evento antes de la respuesta del colector.
        logged = await app.state.client.post('/internal/events',json=request.state.event)
        logged.raise_for_status()
    # Si falla la persistencia, informa HTTP 503; no simula que la evidencia quedó guardada.
    except httpx.HTTPError:
        return JSONResponse({'message':'El registro de evidencias no está disponible. Reintenta cuando el laboratorio esté listo.'},status_code=503)
    # Cabeceras defensivas: sin inferir MIME, sin marcos y sin caché.
    # La CSP del portal admite scripts/estilos inline porque este HTML los incluye.
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Cache-Control']='no-store'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    return response

# Comprobación ligera para saber que este servicio responde; no genera evidencia de navegación.
@app.get('/health')
def health(): return {'status':'ok','service':'honeyshield-decoy'}

# Lee el cuerpo por fragmentos con límite de 8 KiB y exige un objeto JSON.
# El límite se verifica al leer, no solo mediante la cabecera Content-Length.
async def body(request):
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content)>8192: raise ValueError('Solicitud demasiado grande.')
    data = json.loads(content)
    if not isinstance(data,dict): raise ValueError('Formato no válido.')
    return data

# GET / y GET /login sirven la misma página HTML de demostración.
@app.get('/')
@app.get('/login')
async def portal():
    return HTMLResponse((ROOT/'backend'/'portal.html').read_text(encoding='utf-8'))

# POST /login registra un fallo y devuelve 401; no valida cuentas corporativas reales.
# Del cuerpo solo se utiliza username como candidato; la contraseña no se añade al evento.
@app.post('/login')
async def login(request: Request):
    try:
        data = await body(request)
        username = str(data.get('username',''))[:500]
    except (ValueError,TypeError):
        return JSONResponse({'message':'Revisa el formato de la solicitud.'},status_code=400)
    request.state.event.update(kind='auth_failure',detail='Intento de inicio de sesión rechazado. La contraseña no se almacena.',candidate=username)
    return JSONResponse({'message':'No pudimos validar tus credenciales. Este portal utiliza cuentas ficticias de laboratorio.'},status_code=401)

# POST /search filtra una lista de documentos ficticios usando comparación de texto.
# El contenido recibido se observa para detección, pero no se ejecuta como SQL.
@app.post('/search')
async def search(request: Request):
    try:
        data = await body(request)
        query = str(data.get('query',''))[:1000]
    except (ValueError,TypeError):
        return JSONResponse({'message':'Revisa el formato de la solicitud.'},status_code=400)
    request.state.event.update(kind='search',detail='Consulta al buscador de documentos ficticios.',candidate=query)
    docs = [{'title':'Manual de bienvenida','type':'Guía corporativa','date':'Septiembre 2026'}, {'title':'Política de trabajo remoto','type':'Recursos humanos','date':'Octubre 2026'}, {'title':'Calendario de formación','type':'Desarrollo profesional','date':'Noviembre 2026'}]
    # La búsqueda normal usa "in" sobre los títulos. Por eso una entrada SQL no consulta una base de documentos.
    matches = [d for d in docs if query.lower() in d['title'].lower() or not query.strip()]
    message = '1 documento encontrado.' if len(matches) == 1 else f'{len(matches)} documentos encontrados.'
    return {'results':matches,'message':message}

# Ruta de captura final: recursos señuelo conocidos reciben 403; rutas desconocidas, 404.
# No lee archivos del disco ni entrega respaldos reales.
@app.get('/{path:path}')
async def trap(path: str, request: Request):
    # Lista acotada de rutas ficticias que activa el tipo resource y la regla DECOY-01.
    if path in {'admin','admin/','backups/nomina.zip','backup.sql','.env','config','wp-admin'}:
        request.state.event.update(kind='resource',detail='Acceso a una ruta señuelo reservada. No se entregaron datos reales.')
        return JSONResponse({'message':'Recurso reservado. Se requiere autorización adicional.'},status_code=403)
    request.state.event.update(detail='Solicitud a una ruta inexistente.')
    return JSONResponse({'message':'Recurso no encontrado.'},status_code=404)
