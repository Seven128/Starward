"""Actual M82 fpM/psField and one camera Field CSV through existing owners."""
from pathlib import Path
import argparse
import csv
import importlib.util
import io
import json
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-gi-support-1004-r1'
OUT=ROOT/'output/sdss-m82-quality-inputs-1004-r1'
CHECKPOINT=TASK/'evidence/current-execution-state-2026-10-04-r76.json'
HELPER=TASK/'scripts/experience-sdss-contributing-quality-inputs-2026-10-02.py'
spec=importlib.util.spec_from_file_location('existing_quality_input_acquisition',HELPER)
quality=importlib.util.module_from_spec(spec);spec.loader.exec_module(quality)
quality.VERSION='sdss-m82-native-quality-inputs-v1'
bind,save=quality.bind,quality.save


def camera_child():
    plan=json.loads((OUT/'acquisition-plan.json').read_bytes());url=plan['cameraUrl']
    start=time.monotonic();record={'url':url,'state':'REQUEST_STARTED','attemptedRequests':1,'automaticRetries':0}
    save(OUT/'camera-receipt.json',record)
    try:
        tls=ssl.create_default_context();assert tls.check_hostname and tls.verify_mode==ssl.CERT_REQUIRED
        opener=urllib.request.build_opener(quality.common.NoRedirect(),urllib.request.HTTPSHandler(context=tls))
        with opener.open(urllib.request.Request(url,headers={'User-Agent':'Starward-offline-M82-camera/1.0'}),timeout=25) as response:
            assert response.status==200 and response.geturl()==url
            record.update(status=response.status,actualFinalUrl=response.geturl());raw=response.read(500001)
        path=OUT/'camera-field-response.csv';path.write_bytes(raw)
        record.update(state='RAW_ACQUIRED_UNCHECKED',bytes=len(raw),sha256=bind(path)['sha256'],raw=bind(path))
        assert 0<len(raw)<=500000
        rows=list(csv.DictReader(io.StringIO('\n'.join(s for s in raw.decode('utf-8-sig').splitlines() if s and not s.startswith('#')))))
        expected={tuple(str(f[k]) for k in ('run','rerun','camcol','field')) for f in plan['fieldIdentities']}
        assert len(rows)==6 and {tuple(row[k] for k in ('run','rerun','camcol','field')) for row in rows}==expected
        from sdss_frame_noise import read_cached_field_noise
        parameters=[read_cached_field_noise(path,record,{**identity,'band':band})
                    for identity in plan['fieldIdentities'] for band in ('g','r','i')]
        from dataclasses import asdict
        save(OUT/'camera-noise-parameters.json',{'parameters':[asdict(p) for p in parameters],
             'meaning':'Actual camera parameters only; native variance/target covariance/quality still require real source support'})
        record.update(state='CAMERA_PARAMETERS_ADMITTED_NO_QUALITY_PASS',rowCount=len(rows),parameterCount=len(parameters))
    except Exception as error:
        record.update(errorKind=type(error).__name__,errorCode='camera_input_unavailable_or_unqualified')
        if record['state']=='REQUEST_STARTED':record['state']='UNAVAILABLE'
    finally:
        record.update(elapsedSeconds=time.monotonic()-start,finishedUtc=quality.now());save(OUT/'camera-receipt.json',record)


def main():
    assert not OUT.exists();(OUT/'sources').mkdir(parents=True);(OUT/'decoded').mkdir()
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    cp=json.loads(CHECKPOINT.read_bytes());pins=cp['currentSources']+cp['protected']+cp['evidence']
    assert [bind(ROOT/p['path']) for p in pins]==pins
    current=json.loads((GEN/'result.json').read_bytes());assert current['acquisitionComplete'] and len(current['fields'])==6
    current_pins=[bind(GEN/'result.json')]
    for f in current['fields']:
        current_pins.append(f['support'])
        current_pins += [{k:r[k] for k in ('path','bytes','sha256')} for r in f['sourceRecords']]
    assert [bind(ROOT/p['path']) for p in current_pins]==current_pins
    files=[];ids=[]
    for field in current['fields']:
        identity=field['identity'];ids.append(identity)
        for band in (None,'g','r','i'):
            name=(f"psField-{identity['run']:06d}-{identity['camcol']}-{identity['field']:04d}.fit" if band is None else
                  f"fpM-{identity['run']:06d}-{band}{identity['camcol']}-{identity['field']:04d}.fit.gz")
            assert not list((ROOT/'output').rglob(name)), 'cached_quality_input_requires_receipt_admission'
            url=f"https://data.sdss.org/sas/dr17/eboss/photo/redux/{identity['rerun']}/{identity['run']}/objcs/{identity['camcol']}/{name}"
            files.append({'filename':name,'identity':{**identity,**({'band':band} if band else {})},'sourceUrl':url})
    stock=json.loads((ROOT/'output/sdss-m82-stock-and-fields-1004-r1/query-receipt.json').read_bytes())
    selected={tuple(f[k] for k in ('run','rerun','camcol','field')) for f in ids}
    field_ids=[f['fieldID'] for f in stock['fields'] if tuple(f[k] for k in ('run','rerun','camcol','field')) in selected]
    assert len(field_ids)==6
    sql='SELECT * FROM Field WHERE fieldID IN ('+','.join(str(i) for i in field_ids)+') ORDER BY run,camcol,field'
    camera_url='https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?'+urllib.parse.urlencode({'cmd':sql,'format':'csv'})
    save(OUT/'acquisition-plan.json',{'objectRef':'M:82','files':files,'fieldIdentities':ids,'cameraQuery':sql,'cameraUrl':camera_url,
        'inputPins':current_pins,'helper':bind(HELPER),'helperVersion':quality.VERSION,'scope':'Six actual contributing native quality inputs, not source science/PSF quality acceptance',
        'automaticRetries':0,'maximumResponseBytes':quality.MAX_RAW,'maximumDecodedFitsBytes':quality.MAX_FITS,
        'qualitySocketTimeoutSeconds':30,'qualityWholeChildBudgetSeconds':40,'cameraWholeChildBudgetSeconds':35})
    records=[]
    for index,entry in enumerate(files):
        process=subprocess.Popen([sys.executable,'-B',str(Path(__file__).resolve()),'--child',str(index)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        try:stdout,stderr=process.communicate(timeout=40)
        except subprocess.TimeoutExpired:
            process.kill();stdout,stderr=process.communicate()
            path=OUT/(entry['filename']+'.request.json')
            record=json.loads(path.read_bytes()) if path.exists() else entry
            record.update(state='UNAVAILABLE',errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED');save(path,record)
        if stderr:(OUT/(entry['filename']+'.child-stderr.txt')).write_bytes(stderr)
        record=json.loads((OUT/(entry['filename']+'.request.json')).read_bytes());records.append(record)
        save(OUT/'acquisition-progress.json',records)
        print(json.dumps({'source':entry['filename'],'state':record['state'],'bytes':record.get('bytes')}),flush=True)
    process=subprocess.Popen([sys.executable,'-B',str(Path(__file__).resolve()),'--camera-child'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    try:stdout,stderr=process.communicate(timeout=35)
    except subprocess.TimeoutExpired:
        process.kill();stdout,stderr=process.communicate()
        path=OUT/'camera-receipt.json';record=json.loads(path.read_bytes()) if path.exists() else {'url':camera_url}
        record.update(state='UNAVAILABLE',errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED');save(path,record)
    if stderr:(OUT/'camera-child-stderr.txt').write_bytes(stderr)
    camera=json.loads((OUT/'camera-receipt.json').read_bytes())
    assert [bind(ROOT/p['path']) for p in current_pins]==current_pins
    assert [bind(ROOT/p['path']) for p in pins]==pins
    save(OUT/'result.json',{'scope':'Actual cached native processing flags/PSF diagnostics and camera parameters; science/quality not certified',
        'checkpoint':bind(CHECKPOINT),'producer':bind(Path(__file__)),'helper':bind(HELPER),'helperVersion':quality.VERSION,
        'griInputs':current_pins,'originalBytePinsUnchanged':True,'sourceRecords':records,'cameraReceipt':bind(OUT/'camera-receipt.json'),
        'cameraState':camera['state'],'nativeDiagnosticInputsAdmitted':sum(r['state']=='DIAGNOSTIC_STRUCTURE_CHECKED_SCIENTIFIC_QUALITY_UNKNOWN' for r in records),
        'newSourceBytes':sum(r.get('bytes') or 0 for r in records)+camera.get('bytes',0),
        'newScienceOrDisplayProcessing':False,'ordinaryAdoption':False,'scientificQuality':'UNVERIFIED','independentReview':'MISSING'})
    print(json.dumps({'nativeDiagnosticInputsAdmitted':sum(r['state']=='DIAGNOSTIC_STRUCTURE_CHECKED_SCIENTIFIC_QUALITY_UNKNOWN' for r in records),
                     'cameraState':camera['state'],'originalBytePinsUnchanged':True}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--child',type=int);parser.add_argument('--camera-child',action='store_true');args=parser.parse_args()
    if args.child is not None:
        plan=json.loads((OUT/'acquisition-plan.json').read_bytes());quality.child(OUT,plan['files'][args.child],None)
    elif args.camera_child:camera_child()
    else:main()
