"""Requirement-based readback and one bounded escaped accounting regression."""
from pathlib import Path
from collections import Counter
from decimal import Decimal
import hashlib, json, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'output/whole-miniapp-cost-inputs-1003-r3'
model = json.loads((OUT/'result.json').read_bytes())
scene = json.loads((ROOT/model['scenePin']['path']).read_bytes())
registry = json.loads((ROOT/'packages/miniapp-contracts/api/miniapp.operations.json').read_bytes())['operations']
assert Counter(v['operationId'] for v in model['operationInventory']) == Counter(v['id'] for v in registry)
assert sum(model['familyCounts'].values()) == len(registry) == 109
for observed, recorded in zip(scene['rows'], model['conditions'], strict=True):
    assert observed['condition']['name'] == recorded['name']
    accepted = [v for v in observed['transfers'] if v['completed'] and not v.get('failed') and not v.get('aborted')]
    rejected = [v for v in observed['transfers'] if v not in accepted]
    assert sum(v['bytes'] for v in accepted) == recorded['qualifiedBodyBytes']
    assert len(rejected) == recorded['incompleteCallbacks']
    if rejected: assert recorded['incompleteDeliveredBodyBytes'] is None
assert model['total']['wholeMiniappMonthlyOutboundBytes'] is None
assert model['total']['currentMonthlyOperatingCny'] is None
assert model['total']['incrementalSkyMonthlyCny'] is None
assert model['total']['productionFreeDiskBytes'] is None
assert model['total']['capacityPassed'] is False
assert model['preloadedSkyReport']['bytes'] == 837654
assert all(v['skyUserFractionAssumed'] in [.25,.5,1] and v['wholeMiniappEgressBytes'] is None for v in model['monthlySensitivities'])
for v in model['monthlySensitivities']:
    assert Decimal(v['bodyBytesPerSavedJourney'])*Decimal('200')*Decimal('30')*Decimal(str(v['skyUserFractionAssumed'])) == Decimal(str(v['scenarioQualifiedBodyBytes']))
for v in model['coldBurstVolumeLowerBounds']:
    assert v['fullColdEntryOrFirstUsableSeconds'] is None
    assert v['actualMixedBusinessBytesPerSecond'] is None
    assert 'not an unconditional' in v['meaning'].lower()

snapshots=[]
for index,v in enumerate(model['sourcePins']+[model['scenePin'],model['preloadedSkyReport']]):
    b=(ROOT/v['path']).read_bytes()
    assert len(b)==v['bytes'] and hashlib.sha256(b).hexdigest()==v['sha256']
    relative=f'source-inputs/{index:02}-{Path(v["path"]).name}'
    dest=OUT/relative; dest.parent.mkdir(exist_ok=True)
    dest.write_bytes(b)
    snapshots.append(dict(source=v['path'],snapshot=relative,bytes=len(b),sha256=v['sha256']))
script=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-whole-miniapp-cost-inputs-2026-10-03.py'
original=script.read_text(encoding='utf-8'); (OUT/'executed-builder.py').write_text(original,encoding='utf-8')
guard="if item['completed'] and not item.get('failed') and not item.get('aborted'):"
assert original.count(guard)==1
shadow=original.replace(guard,"if item['completed']:").replace('ROOT = Path(__file__).resolve().parents[4]',f'ROOT = Path({str(ROOT)!r})')
shadow=shadow.replace("OUT = ROOT / 'output/whole-miniapp-cost-inputs-1003-r3'","OUT = ROOT / 'output/whole-miniapp-cost-inputs-1003-r3/mutation-run'")
shadow_file=OUT/'completion-only-accounting.py'; shadow_file.write_text(shadow,encoding='utf-8')
run=subprocess.run([sys.executable,'-B',str(shadow_file)],cwd=ROOT,capture_output=True,text=True)
(OUT/'mutation-output.txt').write_text(run.stdout+run.stderr,encoding='utf-8')
assert run.returncode==1 and 'assert full == 12801829' in run.stderr and 'AssertionError' in run.stderr
result=dict(status='READBACK_COMPLETE_DEVELOPMENT_ONLY',snapshots=snapshots,
    registryCoverage='109 unique contracts, no missing operation; presence not active usage',
    arithmetic='Independent Decimal sensitivity calculations and successful callback aggregation agree',
    incomplete='182456 offered bytes remain outside successful subtotal; actual delivery unknown, not zero',
    completionOnlyMutation=dict(exitCode=run.returncode,failure='Including failed/aborted completed callbacks changes the qualified full-journey body total and is rejected'),
    entireProductAndCash='UNKNOWN_PRESERVED', actualCapacity='NOT_ACCEPTED', independentReview='MISSING')
(OUT/'readback.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(status=result['status'],snapshots=len(snapshots),mutationDetected=True,capacityAccepted=False)))
