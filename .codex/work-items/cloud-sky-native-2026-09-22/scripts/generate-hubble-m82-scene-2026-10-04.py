"""Reuse the bounded real-Scene probe for a new Prepared source and light states."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
SCRIPTS = ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
text = (SCRIPTS/'experience-prepared-optical-pixels-2026-10-03.mjs').read_text(encoding='utf-8')
def replace(old, new):
    global text
    assert text.count(old) == 1, old
    text = text.replace(old, new)
replace('output/prepared-optical-publication-1003-r4/publication', 'output/hubble-m82-prepared-publication-1004-r2')
replace('23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1',
        '3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca')
replace('assertPreparedOpticalManifest(publication, "M:51",', 'assertPreparedOpticalManifest(publication, "M:82",')
replace("function run(condition){", "function run(condition){\n report.hourly[0].sunAltitudeDeg=condition.sunAltitude??-24;")
replace("const args=[renderer,report,at,null,null,width,height,'NIGHT'];", "const args=[renderer,report,at,null,null,width,height,condition.mode??'NIGHT'];")
replace('{name:"wrong-family-port",level:"DETAIL",parent:"MEDIUM",fov:.10,roll:37,wrongPort:true}',
        '{name:"twilight-overview",level:"OVERVIEW",parent:null,fov:.38,roll:0,sunAltitude:-6},\n'
        ' {name:"day-overview",level:"OVERVIEW",parent:null,fov:.38,roll:0,sunAltitude:35},\n'
        ' {name:"observation-mode",level:"OVERVIEW",parent:null,fov:.38,roll:0,mode:"OBSERVATION"}')
replace('assert(condition.wrongPort?differentPixels===0:differentPixels>1000);',
        'assert(condition.mode==="OBSERVATION"?differentPixels===0:differentPixels>1000);')
replace('PASSED_BOUNDED_PREPARED_SOFTWARE_SCENE_PIXELS', 'PASSED_BOUNDED_M82_PREPARED_SCENE_EXECUTION')
replace('successful closure requires all six cases, exact retired-fine/medium-only photo equality and zero wrong-family effect.',
        'This new-source run checks five LOD/retirement conditions plus twilight/day/observation backgrounds; exact retired-fine/medium-only equality and observation-mode absence are mechanical checks, not visual acceptance.')
destination = SCRIPTS/'experience-hubble-m82-scene-2026-10-04.mjs'
with destination.open('x', encoding='utf-8') as f:
    f.write(text)
print(destination.relative_to(ROOT))
