"""Reuse admitted local source preparation; verify the new batch mechanism."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
source=(TASK/'scripts/experience-sdss-adaptive-local-2026-10-03.py').read_text(encoding='utf-8')
source=source.replace('adaptive_common_display,RATIO','adaptive_common_display_batched,RATIO')
source=source.replace("OUT=ROOT/'output/sdss-adaptive-local-1003-r1'", "OUT=ROOT/'output/sdss-adaptive-batch-1003-r1'")
source=source.replace("'build-adaptive-local-consumer-2026-10-03.py'", "'build-adaptive-batch-consumer-2026-10-03.py'")
marker="before=[bind(p) for p in sorted(paths)]"
source=source.replace(marker,"""old_output=ROOT/'output/sdss-adaptive-local-1003-r1'
assert bind(old_output/'result.json')['sha256']=='ce7a657ba55984d2ea24d934af146d00bda74422feb5e009f180fed43534b900'
old_result=json.loads((old_output/'result.json').read_bytes());paths.add(old_output/'result.json')
for row in old_result['rows']:
    for output in row['outputs']:
        path=ROOT/output['path'];assert bind(path)==output;paths.add(path)
"""+marker)
source=source.replace('result=adaptive_common_display(values', 'result=adaptive_common_display_batched(values')
source=source.replace("original=rgb(values);assert", """for key in ('estimates','radius','reached','protected'):
        file_key='display-estimates' if key=='estimates' else key
        np.testing.assert_array_equal(getattr(result,key),np.load(old_output/f'{p["name"]}-{file_key}.npy',allow_pickle=False))
    for key,current in [('eligible',p['eligible']),('original-measurements',values)]:
        np.testing.assert_array_equal(current,np.load(old_output/f'{p["name"]}-{key}.npy',allow_pickle=False))
    for index,stencil in enumerate(p['stencils']):
        np.savez_compressed(OUT/f'{p["name"]}-field-{index}.npz',**stencil)
    original=rgb(values);assert""")
source=source.replace("filtered=rgb(result.estimates);old_fixed=", """filtered=rgb(result.estimates)
    assert np.array_equal(filtered,np.asarray(Image.open(old_output/f'{p["name"]}-adaptive.png')))
    old_fixed=""")
source=source.replace("'kernelSeconds':seconds,'outputs':saved,", """'kernelSeconds':seconds,'outputs':saved,
      'scalarSavedOutputsExact':True,'scalarKernelSeconds':old_result['rows'][at]['kernelSeconds'],
      'stencils':[bind(OUT/f'{p["name"]}-field-{i}.npz') for i in range(len(p['stencils']))],""")
source=source.replace('PASSED_BOUNDED_ADAPTIVE_DISPLAY_CONSUMER','PASSED_BOUNDED_ADAPTIVE_BATCH_EQUIVALENCE')
source=source.replace("'sourceRequests':0", "'batchSize':64,'sourceRequests':0")
path=TASK/'scripts/experience-sdss-adaptive-batch-2026-10-03.py'
with path.open('x',encoding='utf-8',newline='\n') as f:f.write(source)
print(path)
