"""Verify the additional saved native-reader path without repeating rollback."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[4]
LANE=ROOT/'output/sky-catalog-native-reader-1003-r1'
OUT=ROOT/'output/sky-old-cache-rollback-readback-1003-r1'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
r=read(LANE/'result.json');assert r['status']=='CURRENT_NATIVE_UTF8_READER_NEW_CATALOG_NAMES_DEVELOPMENT'
assert read(LANE/'inputs-before.json')==read(LANE/'inputs-after.json')
for v in read(LANE/'inputs-before.json'):assert bind(ROOT/v['path'])==v
assert bind(ROOT/r['source']['path'])==r['source'] and r['source']['bytes']==19433
assert r['returnedSourceExactly']and r['transfers']==1 and r['reads']==2
assert re.fullmatch(r'stage-[a-z0-9_]+-[1-9]\d*',r['fileName'])
assert r['beforeCancel']['leased']==r['heldAfterClear']['leased']==1
assert r['heldAfterClear']['bytes']==19433 and r['heldAfterClear']['retired']==1
for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert r['final'][k]==0
assert r['final']['epoch']==2 and r['inventory']['bytes']==26
assert bind(ROOT/r['inventory']['path'])==r['inventory']
assert read(ROOT/r['inventory']['path'])==dict(version=2,entries=[])
result=dict(status='CATALOG_NATIVE_READER_SAVED_DEVELOPMENT_READBACK',currentInputs=read(LANE/'inputs-before.json'),
 source=r['source'],leases=[1,1,0],nativeCallbacks=2,transfers=1,finalInventoryBytes=26,
 origins=[bind(LANE/n)for n in ['result.json','inputs-before.json','inputs-after.json','executed-reader.ts']],
 scope='Actual function body and file owner, real Node files, controlled UTF8 callback. Runtime URL/environment wrapper injected. No actual WEAPP/full module/page/physical-memory or independent-review claim.')
p=OUT/'native-reader.json';assert not p.exists();p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(result=bind(p),leases=[1,1,0])))
