"""Bound real file replacement around pinned JSON's parse read; no producer run."""
from pathlib import Path
import hashlib, json, sys
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'data-pipelines/deep-sky'),str(ROOT/'output/pyavm-metadata-trial-1002-r1/lib'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import publish_prepared_optical as owner
OUT=ROOT/'output/prepared-optical-independent-1003-r1'
target=OUT/'pin-race-fixture.json'
original=b'{"credit":"original reviewed credit"}\n'
replacement=b'{"credit":"unreviewed replacement credit"}\n'
target.write_bytes(original)
pin=hashlib.sha256(original).hexdigest()
old_read=Path.read_bytes; events=[]
def replaced_parse_read(path):
    if path.resolve()!=target.resolve():return old_read(path)
    # A real task-owned input replacement after initial hash and before parse,
    # restored before the owner's second bound_file recheck; no package/source file changes.
    target.write_bytes(replacement); events.append({'phase':'parse-read','bytesSha256':hashlib.sha256(replacement).hexdigest()})
    value=old_read(target); target.write_bytes(original); return value
before={'sourceSha256':hashlib.sha256(Path(owner.__file__).read_bytes()).hexdigest(),'fixtureSha256':pin}
with patch.object(Path,'read_bytes',replaced_parse_read):
    returned,identity=owner.pinned_json(target,pin,root=ROOT)
record={'status':'DETECTED_PARSE_BUFFER_NOT_BOUND_TO_PIN','owner':before,'pin':pin,'returned':returned,'returnedIdentity':identity,'events':events,
        'diskAfterSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'escaped':returned['credit']!='original reviewed credit' and identity['sha256']==pin,
        'scope':'Only a tiny task-owned JSON is actually replaced/restored at parse read, while the real pinned_json and bound_file functions run unchanged. No publication/source/GPU/contract generation or production mutation.'}
assert record['escaped'] and record['diskAfterSha256']==pin
(OUT/'pin-race-before.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
(OUT/'pin-race-before-owner.py.txt').write_bytes(Path(owner.__file__).read_bytes())
(OUT/'executed-pin-race-before-script.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps(record))
