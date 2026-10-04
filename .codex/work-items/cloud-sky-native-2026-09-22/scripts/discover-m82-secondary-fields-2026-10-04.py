"""One bounded Field-bounds query without primaryFieldID filtering.
Catalog metadata candidates only; no frame downloads, scientific supply or edits.
"""
from pathlib import Path
import json,hashlib,csv,io,urllib.request,urllib.parse,ssl,time,datetime
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'output/sdss-m82-secondary-field-candidates-1004-r1'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):return None
def bind(p):
 data=Path(p).read_bytes();return {'path':Path(p).relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def save(p,v):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 schema_path=ROOT/'output/sdss-m82-secondary-field-schema-1004-r1/receipt.json';schema=json.loads(schema_path.read_bytes())
 assert schema['state']=='ACQUIRED_SCHEMA_ROWS_NOT_FIELD_SUPPLY' and bind(ROOT/schema['raw']['path'])==schema['raw']
 types={r['name']:r for r in schema['rows']}
 columns=['fieldID','rerun','run','camcol','field','raMin','raMax','decMin','decMax','quality','photoStatus','score','mjd_r']
 assert set(columns)<=types.keys() and types['fieldID']['type']=='bigint'
 for name in ('raMin','raMax','decMin','decMax'):assert types[name]['unit']=='deg'
 oldpath=ROOT/'output/sdss-m82-stock-and-fields-1004-r1/request-plan.json';old=json.loads(oldpath.read_bytes());assert old['objectRef']=='M:82' and len(old['samples'])==25 and 'primaryFieldID' in old['query']
 ras=[p['raDeg'] for p in old['samples']];decs=[p['decDeg'] for p in old['samples']];assert max(ras)-min(ras)<1 and max(decs)-min(decs)<1
 # Bounding candidate search has one arcminute guard around saved target
 # sample extrema. Not exact TAN coverage, frame availability or astrometry.
 pad=1/60;bounds=[min(ras)-pad,max(ras)+pad,min(decs)-pad,max(decs)+pad]
 r0,r1,d0,d1=bounds
 sql='SELECT TOP 257 '+', '.join(columns)+f' FROM Field WHERE raMin<={r1:.15f} AND raMax>={r0:.15f} AND decMin<={d1:.15f} AND decMax>={d0:.15f} ORDER BY fieldID'
 url='https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?'+urllib.parse.urlencode({'cmd':sql,'format':'csv'})
 receipt={'scope':__doc__,'schemaReceipt':bind(schema_path),'oldPrimaryOnlyPlan':bind(oldpath),'producer':bind(Path(__file__)),
  'candidateBoundsRaMinMaxDecMinMaxDeg':bounds,'boundsMeaning':'Saved 25 TAN samples plus 1 arcminute search guard; catalog bounding-box candidates only, not exact footprint proof.',
  'requestUrl':url,'sql':sql,'requestsAttempted':1,'automaticRetries':0,'redirectsAllowed':False,'socketTimeoutSeconds':25,'maximumResponseBytes':200000,
  'startedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'state':'REQUEST_STARTED','framesAcquired':0,'productionChanges':False,'otherBusinessLogicEdited':False,
  'trueAdditionalCoverage':'UNKNOWN_REQUIRES_BYTE_BOUND_ACTUAL_GRI_WCS_FLAGS_AND_TIMES'}
 save(OUT/'request-plan.json',receipt);start=time.perf_counter()
 try:
  tls=ssl.create_default_context();assert tls.check_hostname and tls.verify_mode==ssl.CERT_REQUIRED
  opener=urllib.request.build_opener(NoRedirect(),urllib.request.HTTPSHandler(context=tls))
  with opener.open(urllib.request.Request(url,headers={'User-Agent':'Starward-offline-M82-source-discovery/1.0'}),timeout=25) as response:
   assert response.status==200 and response.geturl()==url;raw=response.read(200001);receipt['httpStatus']=response.status
  (OUT/'field-candidates.csv').write_bytes(raw);receipt['raw']=bind(OUT/'field-candidates.csv');assert 0<len(raw)<=200000
  reader=csv.DictReader(io.StringIO('\n'.join(line for line in raw.decode('utf-8-sig').splitlines() if not line.startswith('#'))))
  assert reader.fieldnames==columns;rawrows=list(reader);assert len(rawrows)<257,'candidate_query_truncated_not_complete'
  primary=json.loads((ROOT/'output/sdss-m82-stock-and-fields-1004-r1/query-receipt.json').read_bytes())
  known={str(r['fieldID']) for r in primary['fields']};rows=[]
  for row in rawrows:
   value={k:int(row[k]) for k in ('fieldID','rerun','run','camcol','field','quality','photoStatus')}
   value.update({k:float(row[k]) for k in ('raMin','raMax','decMin','decMax','score','mjd_r')})
   assert value['fieldID']>0 and 1<=value['camcol']<=6 and 0<=value['field']<=9999
   value['inOldPrimaryOnlyFieldQuery']=str(value['fieldID']) in known;rows.append(value)
  assert len({r['fieldID'] for r in rows})==len(rows)
  receipt.update(state='CHECKED_METADATA_CANDIDATES_NOT_SCIENTIFIC_SUPPLY',rows=rows,rowCount=len(rows),
   absentFromOldPrimaryOnlyQuery=sum(not r['inOldPrimaryOnlyFieldQuery'] for r in rows),oldPrimaryReceipt=bind(ROOT/'output/sdss-m82-stock-and-fields-1004-r1/query-receipt.json'))
 except Exception as e:receipt.update(state='UNAVAILABLE_OR_UNCHECKED_NOT_EMPTY',errorType=type(e).__name__,errorCode=str(e))
 receipt['elapsedSeconds']=time.perf_counter()-start;save(OUT/'receipt.json',receipt)
 print(json.dumps({k:v for k,v in receipt.items() if k not in ('rows','requestUrl')},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
