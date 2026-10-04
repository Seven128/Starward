"""Once-only missing DETAIL acquisition; old arrays/assets/receipts are immutable."""
from pathlib import Path
import argparse
import hashlib
import json
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
BASE=ROOT/'output/allwise-w3-m82-source-0930'
ORIGIN='https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3'
MISSING=(121710,121793,121796)
REUSED=(121705,121707,121708)
MAX_BYTES=1_100_000

def now():return datetime.now(timezone.utc).isoformat()
def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def save(path,value):
    temporary=path.with_name(path.name+'.writing')
    temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(path)
def tile_path(pixel):return f'Norder8/Dir120000/Npix{pixel}.fits'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,request,fp,code,msg,headers,newurl):
        raise urllib.error.HTTPError(request.full_url,code,'canonical_redirect_forbidden',headers,fp)

def child(output,pixel):
    path=tile_path(pixel);url=ORIGIN+'/'+path
    record_path=output/f'request-{pixel}.json'
    record={'path':path,'url':url,'acquisition':'ONE_CANONICAL_REQUEST','state':'REQUEST_STARTED',
        'startedUtc':now(),'httpStatus':None,'actualFinalUrl':None,'bytes':None,'sha256':None,
        'socketTimeoutSeconds':30,'wholeChildBudgetSeconds':38,'readLimitBytes':MAX_BYTES+1,
        'automaticRetries':0,'redirectsAllowed':False,'tls':'default CA verification; hostname required'}
    save(record_path,record)
    started=time.monotonic()
    raw_path=output/'sources'/path;raw_path.parent.mkdir(parents=True,exist_ok=True)
    try:
        context=ssl.create_default_context()
        assert context.check_hostname and context.verify_mode==ssl.CERT_REQUIRED
        opener=urllib.request.build_opener(NoRedirect(),urllib.request.HTTPSHandler(context=context))
        request=urllib.request.Request(url,headers={'User-Agent':'Starward-bounded-M82-detail/1.0','Accept':'application/fits,application/octet-stream'})
        with opener.open(request,timeout=30) as response:
            record.update(httpStatus=response.status,actualFinalUrl=response.geturl())
            if response.status!=200 or response.geturl()!=url:raise RuntimeError('canonical_response_invalid')
            record['state']='RAW_STREAMING_UNCHECKED';save(record_path,record)
            with raw_path.open('xb') as target:
                remaining=MAX_BYTES+1
                while remaining:
                    chunk=response.read(min(65536,remaining))
                    if not chunk:break
                    target.write(chunk);target.flush();remaining-=len(chunk)
            actual=bind(raw_path)
            record.update(state='RAW_ACQUIRED_UNCHECKED',bytes=actual['bytes'],sha256=actual['sha256'],raw=actual,
                rawTransferCompleted=True,contentLengthHeader=response.headers.get('Content-Length'))
            save(record_path,record)
        if not 0<actual['bytes']<=MAX_BYTES:raise RuntimeError('source_raw_byte_quota_invalid')
        # Import/read only after the raw result is durable. Admission failure
        # retains that raw file and never converts it into scientific absence.
        sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
        import numpy as np
        from allwise_finite_tan import checked_fits
        data,receipt=checked_fits(raw_path.read_bytes())
        record.update(state='CHECKED',receipt=receipt,nonfinite=int((~np.isfinite(data)).sum()),
            shape=list(data.shape),dtype=data.dtype.str,scalarCount=int(data.size))
    except urllib.error.HTTPError as error:
        record.update(state='UNAVAILABLE',httpStatus=error.code,errorKind='HTTP_ERROR',
            errorCode='canonical_redirect_forbidden' if 300<=error.code<400 else f'HTTP_{error.code}')
        error.close()
    except Exception as error:
        record.update(errorKind=type(error).__name__,errorCode=str(error) if isinstance(error,RuntimeError) else 'network_or_reader_failure')
        if raw_path.exists():
            actual=bind(raw_path);record.update(state='RAW_ACQUIRED_UNCHECKED',bytes=actual['bytes'],sha256=actual['sha256'],raw=actual)
        else:record['state']='UNAVAILABLE'
    finally:
        record.update(finishedUtc=now(),elapsedSeconds=time.monotonic()-started)
        save(record_path,record)

def parent(output):
    assert output.is_relative_to(ROOT/'output') and not output.exists(),'exclusive_authorized_output_required'
    output.mkdir(parents=True,exist_ok=False)
    full=BASE/'candidate/candidate-plan.json';detail=BASE/'candidate-detail/candidate-plan.json';old_receipt=BASE/'candidate-detail/candidate-result.json'
    manifest=ROOT/'workers/miniapp-api/assets/deep-sky/manifest.json'
    plan=json.loads(detail.read_bytes());old=json.loads(old_receipt.read_bytes())
    entry=next(item for item in json.loads(manifest.read_bytes())['entries'] if item['objectRef']=='M:82')
    assert plan['source']==ORIGIN and plan['center']==entry['center'] and plan['objectRef']=='M:82'
    profile=plan['profiles'][0]
    assert profile['level']=='DETAIL' and profile['pixels']==512 and profile['fieldDegrees']==entry['levels']['DETAIL']['fieldDegrees']
    assert set(profile['tiles'])=={tile_path(pixel) for pixel in (*REUSED,*MISSING)}
    preserved=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    source_paths=[manifest,full,detail,old_receipt,BASE/'candidate/candidate-result.json',BASE/'source-result.json',BASE/'source-analysis.json',BASE/'source-overlap.json',BASE/'properties',
        ROOT/'data-pipelines/deep-sky/allwise_finite_tan.py',ROOT/'data-pipelines/deep-sky/image_quality.py',ROOT/'data-pipelines/deep-sky/hips_tan_lookup.mjs',
        BASE/'m82-tile.fits',*[BASE/'candidate-detail/sources'/tile_path(pixel) for pixel in REUSED],
        *[ROOT/item['path'] for item in preserved]]
    before=[bind(path) for path in source_paths]
    for item in preserved:assert bind(ROOT/item['path'])['sha256']==item['sha256']
    assert bind(BASE/'properties')['sha256']==old['sourcePropertiesSha256']
    snapshots=output/'input-snapshots';snapshots.mkdir()
    for index,path in enumerate(source_paths):
        (snapshots/f'{index:02d}-{path.name}').write_bytes(path.read_bytes())
    (output/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    sources=[]
    for pixel in REUSED:
        record=next(item for item in old['sourceFiles'] if item['path']==tile_path(pixel))
        actual=bind(BASE/'candidate-detail/sources'/tile_path(pixel))
        assert record['state']=='CHECKED' and record['receipt']['completeArrayReceived'] is True
        assert (actual['bytes'],actual['sha256'])==(record['bytes'],record['sha256'])
        sources.append({**record,'acquisition':'REUSED_IMMUTABLE_SOURCE','raw':actual,'nonfiniteEvidence':'prior hash-bound checked scalar count'})
    result={'scope':'Six DETAIL scientific source inputs only; no science resampling, image/level/mask/publication or quality acceptance',
        'script':bind(Path(__file__)),'detailProfile':profile,'sourcePropertiesSha256':old['sourcePropertiesSha256'],
        'sourceBindingsBefore':before,'sourceFiles':sources,'missingRequests':list(MISSING),'attemptedRequests':0,'automaticRetries':0}
    save(output/'acquisition.json',result)
    for pixel in MISSING:
        print(json.dumps({'phase':'one_request','pixel':pixel,'url':ORIGIN+'/'+tile_path(pixel)}),flush=True)
        started=time.monotonic()
        process=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--child',str(pixel),'--output',str(output)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        timed_out=False
        try:process.communicate(timeout=38)
        except subprocess.TimeoutExpired:
            timed_out=True;process.kill();process.communicate()
        record_path=output/f'request-{pixel}.json'
        record=json.loads(record_path.read_bytes()) if record_path.exists() else {'path':tile_path(pixel),'url':ORIGIN+'/'+tile_path(pixel),'state':'UNAVAILABLE','bytes':None,'sha256':None}
        if timed_out and record['state']!='CHECKED':
            record.update(errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED',wholeChildBudgetSeconds=38,finishedUtc=now(),elapsedSeconds=time.monotonic()-started)
            raw=output/'sources'/tile_path(pixel)
            if raw.exists():
                actual=bind(raw);record.update(state='RAW_ACQUIRED_UNCHECKED',bytes=actual['bytes'],sha256=actual['sha256'],raw=actual,rawTransferCompleted=False)
            else:record['state']='UNAVAILABLE'
            save(record_path,record)
        sources.append(record);result['attemptedRequests']+=1
        result.update(sourceFiles=sources,checkedSourceCount=sum(item['state']=='CHECKED' for item in sources),
            checkedSourceBytes=sum(item['bytes'] for item in sources if item['state']=='CHECKED'),
            unknownOrUncheckedSourceCount=sum(item['state']!='CHECKED' for item in sources),
            fullDetailInputChecked=len(sources)==6 and all(item['state']=='CHECKED' for item in sources))
        save(output/'acquisition.json',result)
        print(json.dumps({'phase':'saved_independent_result','pixel':pixel,'state':record['state'],'httpStatus':record.get('httpStatus'),
            'bytes':record.get('bytes'),'elapsedSeconds':record.get('elapsedSeconds')}),flush=True)
    after=[bind(path) for path in source_paths]
    result.update(sourceBindingsAfter=after,inputsUnchanged=before==after,finishedUtc=now())
    save(output/'acquisition.json',result)
    binding={'script':bind(Path(__file__)),'sourceBindingsBefore':before,'sourceBindingsAfter':after,
        'outputs':[bind(path) for path in sorted(output.rglob('*')) if path.is_file()],
        'scope':result['scope']}
    save(output/'binding.json',binding)
    assert before==after,'bound_sources_changed_during_acquisition'
    print(json.dumps({'phase':'done','acquisition':bind(output/'acquisition.json'),'binding':bind(output/'binding.json'),
        'checkedSourceCount':result['checkedSourceCount'],'fullDetailInputChecked':result['fullDetailInputChecked'],'inputsUnchanged':True}),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--child',type=int,choices=MISSING)
    args=parser.parse_args();output=args.output.resolve()
    if args.child is not None:child(output,args.child)
    else:parent(output)
