"""Loopback-only design demonstration. Not a production API or authentication adapter."""
import json, sqlite3, uuid, tempfile, os
from datetime import datetime,timezone
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from contextlib import contextmanager

HERE = Path(__file__).resolve().parent
BASE = json.loads((HERE / 'baseline.json').read_text(encoding='utf-8'))

class Conflict(Exception): pass

class Repository:
    def __init__(self, path):
        self.path = path
        with self.connect() as c:
            c.execute('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, owner TEXT, kind TEXT, spot TEXT, status TEXT, rev INTEGER, payload TEXT, baseline TEXT)')
            c.execute("CREATE UNIQUE INDEX IF NOT EXISTS pending_feedback ON records(owner,spot) WHERE kind='FEEDBACK' AND status='PENDING'")
            if 'updatedAt' not in [r[1] for r in c.execute('PRAGMA table_info(records)')]: c.execute('ALTER TABLE records ADD COLUMN updatedAt TEXT')
    @contextmanager
    def connect(self):
        c=sqlite3.connect(self.path,timeout=10); c.row_factory=sqlite3.Row
        try:
            with c: yield c
        finally: c.close()
    def state(self, owner):
        with self.connect() as c:
            return [self.decode(r) for r in c.execute('SELECT * FROM records WHERE owner=? ORDER BY rowid', (owner,))]
    def decode(self,r):
        d=dict(r);d['payload']=json.loads(d['payload']);d['baseline']=json.loads(d['baseline']) if d['baseline'] else None;d.pop('owner');return d
    def write(self,owner,action,body):
        with self.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            data=body['data'];fields=data.get('fields',{})
            if not fields.get('name','').strip() or not data.get('point'): raise ValueError('请填写名称并选择地址')
            # Runtime fields are discarded; only the submitted document is frozen.
            data={k:data[k] for k in ('fields','point','photos')}
            payload=json.dumps(data,ensure_ascii=False,sort_keys=True)
            if action=='feedback':
                if body.get('baseRevision')!=1: raise Conflict('正式资料已更新，请重新核对')
                if data==BASE: raise ValueError('尚未修改任何信息')
                if c.execute("SELECT id FROM records WHERE owner=? AND spot='bay' AND kind='FEEDBACK' AND status='PENDING'",(owner,)).fetchone(): raise Conflict('该观星点已有你的审核中反馈')
                identity=str(uuid.uuid4())
                c.execute('INSERT INTO records(id,owner,kind,spot,status,rev,payload,baseline) VALUES(?,?,?,?,?,?,?,?)',(identity,owner,'FEEDBACK','bay','PENDING',1,payload,json.dumps(BASE,ensure_ascii=False)))
            else:
                identity=body.get('id') or str(uuid.uuid4())
                old=c.execute('SELECT * FROM records WHERE id=? AND owner=?',(identity,owner)).fetchone()
                if body.get('id') and not old: raise Conflict('草稿不存在或不属于当前账号')
                status='DRAFT' if action=='draft' else 'PENDING'
                if old:
                    if old['status']!='DRAFT' or old['kind']!='NEW': raise Conflict('已提交记录不可编辑')
                    if body.get('revision')!=old['rev']: raise Conflict('草稿已在其他页面更新，请重新打开')
                    c.execute('UPDATE records SET payload=?,status=?,rev=rev+1 WHERE id=?',(payload,status,identity))
                else: c.execute('INSERT INTO records(id,owner,kind,spot,status,rev,payload,baseline) VALUES(?,?,?,?,?,?,?,?)',(identity,owner,'NEW',None,status,1,payload,None))
            c.execute('UPDATE records SET updatedAt=? WHERE id=?',(datetime.now(timezone.utc).isoformat(),identity))
            return self.decode(c.execute('SELECT * FROM records WHERE id=?',(identity,)).fetchone())

DB=os.environ.get('STARWARD_DESIGN_DB',str(Path(tempfile.gettempdir())/'starward-feedback-design.sqlite'))
repo=Repository(DB)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(HERE.parents[2]),**kw)
    def log_message(self,*a):pass
    def send_json(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
    def owner(self):return self.headers.get('X-Demo-Account','preview-owner')[:80]
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/design/state':return self.send_json(200,{'records':repo.state(self.owner()),'spot':BASE,'revision':1})
        return super().do_GET()
    def do_POST(self):
        action=urlparse(self.path).path.removeprefix('/api/design/')
        if action not in ('draft','new','feedback'):return self.send_json(404,{'error':'Not found'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length>3000000:raise ValueError('演示数据过大')
            body=json.loads(self.rfile.read(length))
            self.send_json(200,repo.write(self.owner(),action,body))
        except Conflict as e:self.send_json(409,{'error':str(e)})
        except (ValueError,KeyError) as e:self.send_json(400,{'error':str(e)})

if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',4284),Handler).serve_forever()

