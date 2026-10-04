"""Bounded failing-before controls: remove only two output containment guards in memory."""
from pathlib import Path
import inspect
import io
import json
import sys
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import publish_sdss_science as writer
import test_publish_sdss_science as checks
from image_quality import digest

OUT=ROOT/'output/sdss-science-output-containment-mutation-1002-r2'
OUT.mkdir(exist_ok=False)
(OUT/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
source=inspect.getsource(writer.publication_payload)
mutated=source.replace('candidate_file(receipt_directory,name)','(receipt_directory/name)').replace('candidate_file(output,file)','(output/file)')
assert mutated!=source and mutated.count('candidate_file(')==1 # original input PNG lookup remains.
(OUT/'unexecuted-current-function.py.txt').write_text(source,encoding='utf8')
(OUT/'executed-mutated-function.py.txt').write_text(mutated,encoding='utf8')
namespace=dict(writer.__dict__);exec(compile(mutated,str(OUT/'executed-mutated-function.py.txt'),'exec'),namespace)
observations=[]
def record(*args,**kwargs):
    result=namespace['publication_payload'](*args,**kwargs);output=args[1]
    observations.append({'outputName':output.name,
        'receiptEscapedDeclaredOutput':(output.parent/'escape-1-1-1-g.json').is_file(),
        'pngEscapedDeclaredOutput':(output.parent/'escape-overview.png').is_file(),
        'scope':'Only generated synthetic test fixtures, within their own temporary owner; cleaned by test lifecycle.'})
    return result
names=['test_malformed_receipt_identity_cannot_escape_the_output_before_ts_admission',
       'test_malformed_object_reference_cannot_escape_png_output_before_ts_admission']
log=io.StringIO();real_load=writer.np.load
def fixture_load(*args,**kwargs):
    # Only 32x32 synthetic failure fixtures: avoid Win32 mmap handles retained
    # in deliberately failing unittest tracebacks. Bytes/arrays are identical;
    # real cached producer's mmap behavior and source remain unchanged.
    return real_load(*args,**{**kwargs,'mmap_mode':None})
with patch.object(writer,'publication_payload',record),patch.object(writer.np,'load',fixture_load):
    result=unittest.TextTestRunner(stream=log,verbosity=2).run(unittest.TestSuite(checks.CachedSciencePublisherTest(n) for n in names))
(OUT/'expected-failing-controls.log').write_text(log.getvalue(),encoding='utf8')
(OUT/'actual-observations.json').write_text(json.dumps(observations,indent=2)+'\n',encoding='utf8')
assert result.testsRun==2 and len(result.failures)==2 and not result.errors
assert observations[0]['receiptEscapedDeclaredOutput'] and observations[1]['pngEscapedDeclaredOutput']
raw=(ROOT/'data-pipelines/deep-sky/publish_sdss_science.py').read_bytes()
report={'status':'BOTH_GUARDS_HAVE_ACTUAL_FAILING_BEFORE_REGRESSIONS','currentWriterSha256':digest(raw),
        'mutatedFunctionSha256':digest(mutated.encode()),'expectedFailures':2,'observations':observations,
        'scope':'In-memory removal of exactly two required output write guards, not a claimed historical source freeze. Same new regression methods fail before the guards and passed in actual writer preflight. Synthetic 32x32 load uses in-memory arrays only to avoid mmap handles retained by deliberately failing unittest tracebacks; not producer memory/lifecycle verification. No Node packaging, real r2/source/publication files, GPU or production mutation.'}
(OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({'output':str(OUT.relative_to(ROOT)),'resultSha256':digest((OUT/'result.json').read_bytes())}))
