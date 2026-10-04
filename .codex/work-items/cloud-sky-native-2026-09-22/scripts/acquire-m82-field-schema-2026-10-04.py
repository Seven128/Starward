"""One bounded official Field schema request for secondary-source discovery.
No existing frame downloads or source edits; unknown/error is not empty supply.
"""
from pathlib import Path
import json,hashlib,urllib.request,urllib.parse,ssl,csv,io,time,datetime
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'output/sdss-m82-secondary-field-schema-1004-r1'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
def bind(p):
 data=Path(p).read_bytes();return {'path':Path(p).relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def save(p,v):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 source=ROOT/'output/sdss-m82-stock-and-fields-1004-r1/query-receipt.json'
 old=json.loads(source.read_bytes());assert 'primaryFieldID' in urllib.parse.parse_qs(urllib.parse.urlsplit(old['requestUrl']).query)['cmd'][0]
 sql="SELECT TOP 1000 * FROM dbo.fDocColumns('Field')"
 url='https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?'+urllib.parse.urlencode({'cmd':sql,'format':'csv'})
 receipt={'scope':__doc__,'basis':bind(source),'producer':bind(Path(__file__)),'requestUrl':url,'sql':sql,
  'requestsAttempted':1,'automaticRetries':0,'redirectsAllowed':False,'maximumResponseBytes':300000,'socketTimeoutSeconds':25,
  'startedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'state':'REQUEST_STARTED','frameDownloads':0,
  'qualityOrSourceAvailability':'UNKNOWN_SCHEMA_ONLY','productionChanges':False,'otherBusinessLogicEdited':False}
 save(OUT/'request-plan.json',receipt);start=time.perf_counter()
 try:
  tls=ssl.create_default_context();assert tls.check_hostname and tls.verify_mode==ssl.CERT_REQUIRED
  opener=urllib.request.build_opener(NoRedirect(),urllib.request.HTTPSHandler(context=tls))
  with opener.open(urllib.request.Request(url,headers={'User-Agent':'Starward-offline-M82-source-discovery/1.0'}),timeout=25) as response:
   assert response.status==200 and response.geturl()==url
   raw=response.read(300001);receipt['httpStatus']=response.status
  (OUT/'field-schema.csv').write_bytes(raw);receipt['raw']=bind(OUT/'field-schema.csv')
  assert 0<len(raw)<=300000
  lines=[line for line in raw.decode('utf-8-sig').splitlines() if not line.startswith('#')]
  reader=csv.DictReader(io.StringIO('\n'.join(lines)));rows=list(reader)
  assert reader.fieldnames and 0<len(rows)<1000
  receipt.update(state='ACQUIRED_SCHEMA_ROWS_NOT_FIELD_SUPPLY',columns=reader.fieldnames,rows=rows,rowCount=len(rows))
 except Exception as e:receipt.update(state='UNAVAILABLE_OR_UNCHECKED_NOT_EMPTY',errorType=type(e).__name__)
 receipt['elapsedSeconds']=time.perf_counter()-start;save(OUT/'receipt.json',receipt)
 print(json.dumps({k:v for k,v in receipt.items() if k!='rows'},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
