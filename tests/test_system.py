# PRUEBAS DE INTEGRACIÓN: recorren HTTP, API y SQLite con datos temporales.
# Cada assert expresa el comportamiento esperado; no alteran las evidencias de .runtime del usuario.
"""Integration acceptance tests against two real isolated HTTP services."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import sqlite3
import subprocess
import sys
import time

import httpx
import pytest

ROOT=Path(__file__).resolve().parents[1]

# Pide al sistema un puerto local libre usando el puerto 0; permite separar pruebas del laboratorio del usuario.
def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0));return s.getsockname()[1]

# Fixture compartida: crea carpeta temporal y dos servidores HTTP de prueba.
# Usa variables de entorno para aislar base, credenciales y puertos; finalmente termina sus propios procesos.
@pytest.fixture(scope='module')
def lab(tmp_path_factory):
    data=tmp_path_factory.mktemp('honeyshield-test')
    admin_port=port();decoy_port=port()
    admin=f'http://127.0.0.1:{admin_port}';decoy=f'http://127.0.0.1:{decoy_port}'
    # Redirige todos los servicios y el almacenamiento al laboratorio temporal creado por pytest.
    env=dict(os.environ,HONEYSHIELD_DATA=str(data),HONEYSHIELD_ADMIN_URL=admin,HONEYSHIELD_DECOY_URL=decoy,HONEYSHIELD_PUBLIC_DECOY_URL=decoy)
    procs=[]
    try:
        for name,p in [('admin',admin_port),('decoy',decoy_port)]:
            log=(data/(name+'.log')).open('w')
            proc=subprocess.Popen([sys.executable,'-m','uvicorn','backend.'+name+':app','--host','127.0.0.1','--port',str(p),'--no-proxy-headers','--no-access-log'],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            procs.append((proc,log))
            for _ in range(100):
                try:
                    if httpx.get(f'http://127.0.0.1:{p}/health',timeout=.5,trust_env=False).status_code==200:break
                except httpx.HTTPError:pass
                if proc.poll() is not None:pytest.fail((data/(name+'.log')).read_text())
                time.sleep(.1)
            else:pytest.fail('Service failed to start')
        token=secrets.token_urlsafe(32)
        (data/'launch.json').write_text(json.dumps({'hash':hashlib.sha256(token.encode()).hexdigest(),'expires':time.time()+60}))
        client=httpx.Client(base_url=admin,headers={'Origin':admin},trust_env=False,timeout=20)
        assert client.post('/api/auth/launch',json={'ticket':token}).status_code==200
        # Entrega a las pruebas el cliente autenticado y las direcciones del entorno aislado.
        yield {'client':client,'admin':admin,'decoy':decoy,'data':data,'token':token,'secret':json.loads((data/'config.json').read_text())['collector_key']}
        client.close()
    finally:
        # Limpia los servicios incluso si alguna prueba falla. No usa los PID del laboratorio del usuario.
        for proc,log in reversed(procs):
            proc.terminate()
            try:proc.wait(5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait()
            log.close()

# Ejecuta un escenario por la API autenticada y exige respuesta satisfactoria antes de examinar su evidencia.
def scenario(lab,name):
    result=lab['client'].post('/api/scenarios/'+name)
    assert result.status_code==200,result.text
    return result.json()

# Comprueba que las rutas de datos y exportación devuelvan 401 sin sesión.
def test_admin_requires_authentication(lab):
    for endpoint in ['/api/state','/api/status','/api/export/events.csv','/api/export/report.pdf']:
        assert httpx.get(lab['admin']+endpoint,trust_env=False).status_code==401

# Reutiliza un ticket ya consumido: la API debe rechazarlo con 401.
def test_launch_ticket_is_single_use(lab):
    result=httpx.post(lab['admin']+'/api/auth/launch',headers={'Origin':lab['admin']},json={'ticket':lab['token']},trust_env=False)
    assert result.status_code==401

# Aunque exista sesión, una escritura desde el origen del señuelo debe recibir 403.
def test_cross_origin_mutation_denied(lab):
    r=lab['client'].post('/api/scenarios/sql',headers={'Origin':lab['decoy']})
    assert r.status_code==403

# Una cookie de analista no autoriza el canal interno del colector.
def test_collector_requires_its_own_secret(lab):
    r=lab['client'].get('/internal/block',params={'source':'127.0.0.1'})
    assert r.status_code==401

# Control negativo: navegar y buscar texto normal produce eventos sin regla activada.
def test_benign_traffic_produces_no_alert(lab):
    r=scenario(lab,'normal')
    assert len(r['events'])==2
    assert all(e['rule_id'] is None for e in r['events'])

# Verifica cinco fallos, una alerta AUTH-01 y ausencia de la contraseña ficticia en la evidencia.
def test_auth_threshold_and_password_redaction(lab):
    r=scenario(lab,'auth')
    assert len(r['events'])==5
    assert sum(e['rule_id']=='AUTH-01' for e in r['events'])==1
    assert 'dato-ficticio' not in json.dumps(r)
    with sqlite3.connect(lab['data']/'honeyshield.sqlite3') as conn:
        assert 'dato-ficticio' not in str(conn.execute('SELECT detail FROM events').fetchall())

# Comprueba SQL-01 y consulta SQLite para demostrar que el evento se guardó realmente.
# La respuesta del buscador sigue siendo 200: detectar sintaxis no equivale a ejecutar SQL.
def test_sql_rule_and_persistence(lab):
    r=scenario(lab,'sql')
    assert r['events'][0]['rule_id']=='SQL-01'
    assert r['events'][0]['status']==200
    with sqlite3.connect(lab['data']/'honeyshield.sqlite3') as conn:
        assert conn.execute('SELECT count(*) FROM events WHERE run_id=?',(r['id'],)).fetchone()[0]==1

# Exige DECOY-01 y HTTP 403 al consultar el respaldo ficticio.
def test_decoy_resource_is_never_a_real_backup(lab):
    r=scenario(lab,'resource')
    assert r['events'][0]['rule_id']=='DECOY-01'
    assert r['events'][0]['status']==403

# Comprueba 429 tras contener, 200 al retirar el bloqueo y continuidad de la sesión del analista.
def test_block_enforcement_and_unblock(lab):
    r=scenario(lab,'containment')
    assert r['events'][-1]['kind']=='blocked' and r['events'][-1]['status']==429
    state=lab['client'].get('/api/state').json()
    b=next(b for b in state['blocks'] if b['source']==r['source'])
    assert lab['client'].delete('/api/blocks/'+str(b['id'])).status_code==200
    with httpx.Client(headers={'X-Honeyshield-Lab-Key':lab['secret'],'X-Honeyshield-Run':r['id']},trust_env=False) as client:
        assert client.get(lab['decoy']+'/').status_code==200
    assert lab['client'].get('/api/auth/session').status_code==200

# Adelanta el vencimiento en la base temporal para probar caducidad sin esperar cinco minutos.
def test_block_expiry(lab):
    r=scenario(lab,'containment')
    with sqlite3.connect(lab['data']/'honeyshield.sqlite3') as c:
        c.execute('UPDATE blocks SET expires_at=? WHERE source=?',(time.time()-1,r['source']));c.commit()
    r=httpx.get(lab['decoy']+'/',headers={'X-Honeyshield-Lab-Key':lab['secret'],'X-Honeyshield-Run':r['id']},trust_env=False)
    assert r.status_code==200

# Desactivar SQL-01 evita su alerta pero conserva el evento; al terminar vuelve a activar la regla.
def test_rule_disable_keeps_events(lab):
    assert lab['client'].patch('/api/rules/SQL-01',json={'enabled':False}).status_code==200
    r=scenario(lab,'sql');assert r['events'][0]['rule_id'] is None
    assert lab['client'].patch('/api/rules/SQL-01',json={'enabled':True}).status_code==200

# Rechaza umbrales fuera de límites con 422 y una regla inexistente con 404.
def test_rule_configuration_validated(lab):
    r=lab['client'].patch('/api/rules/AUTH-01',json={'enabled':True,'threshold':0,'window':1})
    assert r.status_code==422
    assert lab['client'].patch('/api/rules/not-real',json={'enabled':True}).status_code==404

# Resuelve una alerta y vuelve a consultar el estado para confirmar que el cambio persiste.
def test_alert_resolution_is_persistent(lab):
    a=next(a for a in lab['client'].get('/api/state').json()['alerts'] if a['status']=='open')
    assert lab['client'].patch(f"/api/alerts/{a['id']}/resolve").status_code==200
    updated=next(x for x in lab['client'].get('/api/state').json()['alerts'] if x['id']==a['id'])
    assert updated['status']=='resolved'

# Una IP reenviada o una clave falsa no deben cambiar la identidad observada de la conexión.
def test_forwarded_ip_and_lab_headers_cannot_be_forged(lab):
    r=httpx.get(lab['decoy']+'/',headers={'X-Forwarded-For':'8.8.8.8','X-Honeyshield-Run':'a'*20,'X-Honeyshield-Lab-Key':'invalid'},trust_env=False)
    assert r.status_code==200
    e=lab['client'].get('/api/state').json()['events'][0]
    assert e['source']=='127.0.0.1' and e['run_id'] is None

# Valida estado, firma %PDF-, tipo MIME y contenido mínimo del informe generado.
def test_report_export_is_pdf(lab):
    r=lab['client'].get('/api/export/report.pdf')
    assert r.status_code==200 and r.content.startswith(b'%PDF-') and len(r.content)>1500
    assert r.headers['content-type']=='application/pdf'

# Un dato que empieza por = debe exportarse con comilla protectora para no convertirse en fórmula.
def test_csv_formula_escape(lab):
    r=lab['client'].post('/internal/events',headers={'X-Collector-Key':lab['secret']},json={'source':'=1+1','method':'GET','path':'/','status':200,'kind':'visit','detail':'CSV escaping test'})
    assert r.status_code==200
    csv=lab['client'].get('/api/export/events.csv').text
    assert "'=1+1" in csv

# Rechaza WebSocket sin sesión; con cookie válida y origen permitido recibe un aviso refresh.
# Este caso comprueba esos dos recorridos, no todas las combinaciones posibles de origen.
def test_websocket_requires_session_and_origin(lab):
    from websockets.sync.client import connect
    from websockets.exceptions import InvalidStatus
    url=lab['admin'].replace('http:','ws:')+'/api/live'
    with pytest.raises(InvalidStatus):
        with connect(url,origin=lab['admin']):pass
    cookie='honeyshield_session='+lab['client'].cookies.get('honeyshield_session')
    with connect(url,origin=lab['admin'],additional_headers={'Cookie':cookie}) as ws:
        assert json.loads(ws.recv(timeout=3))['type']=='refresh'

# Impide crear bloqueos para orígenes que nunca fueron observados.
def test_no_unknown_source_blocking(lab):
    r=lab['client'].post('/api/blocks',json={'source':'not-observed','minutes':5})
    assert r.status_code==400

# Envía un cuerpo de más de 8 KiB y comprueba su rechazo por el lector del portal.
def test_decoy_rejects_oversized_body(lab):
    r=httpx.post(lab['decoy']+'/search',json={'query':'A'*10000},trust_env=False)
    assert r.status_code==400

# Prueba contraseña incorrecta, contraseña válida, acceso autorizado y revocación al salir.
# Las credenciales utilizadas pertenecen exclusivamente a la instalación temporal de la prueba.
def test_real_login_and_logout(lab):
    credentials=(lab['data']/'acceso.txt').read_text(encoding='utf-8')
    password=next(line.split(': ',1)[1] for line in credentials.splitlines() if line.startswith('Contraseña:'))
    with httpx.Client(base_url=lab['admin'],headers={'Origin':lab['admin']},trust_env=False) as client:
        assert client.post('/api/auth/login',json={'username':'analista','password':'wrong'}).status_code==401
        assert client.post('/api/auth/login',json={'username':'analista','password':password}).status_code==200
        assert client.get('/api/state').status_code==200
        assert client.post('/api/auth/logout').status_code==200
        assert client.get('/api/state').status_code==401
