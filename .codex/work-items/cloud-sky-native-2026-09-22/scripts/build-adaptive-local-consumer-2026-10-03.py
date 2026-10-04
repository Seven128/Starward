"""Reuse previous actual source-consumer setup; replace only the new experiment."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
source=TASK/'scripts/experience-sdss-aperture-noise-2026-10-03.py'
text=source.read_text(encoding='utf-8').split(' rows=[];dy,dx=')[0]
text=text.replace('New actual multi-scale aperture-noise qualification, not another filter run.','Actual new common adaptive display local path; not complete quality.')
text=text.replace('sdss-aperture-noise-1003-r1','sdss-adaptive-local-1003-r1')
text=text.replace("('arm',1120,1024),('diffuse-arm',1164,1204),('outer-mixed',1968,2000)","('arm',1120,1024),('diffuse-arm',1164,1204),('outer-mixed',1968,2000),('flagged-foreground',1440,1424)")
text=text.replace('y-8,y+9','y-24,y+25').replace('x-8,x+9','x-24,x+25').replace('y-8:y+9','y-24:y+25').replace('x-8:x+9','x-24:x+25')
text=text.replace('(3,17,17)','(3,49,49)').replace('(17,17)','(49,49)')
text=text.replace("import numpy as np","import numpy as np\nimport time\nfrom PIL import Image,ImageDraw\nfrom astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb\nfrom sdss_adaptive_display import adaptive_common_display,RATIO,RADII,VERSION",1)
text=text.replace("'sdss_noise_aperture.py','sdss_noise_display.py'","'sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py'",1)
text=text.replace("before=[bind(p) for p in sorted(paths)]",'''manifest=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
assert bind(manifest)['sha256']=='8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
recipe=json.loads(manifest.read_bytes())['master']['transfer']['recipe'];paths.add(manifest)
reference_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
assert bind(reference_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6';paths.add(reference_path)
reference=np.load(reference_path,mmap_mode='r',allow_pickle=False)
fixed=[]
for b in 'gri':
    path=ROOT/'output/shared-noise-display-1003-r1/candidate'/f'{b}-display-estimates.npy';paths.add(path)
    fixed.append(np.load(path,mmap_mode='r',allow_pickle=False))
paths.add(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-adaptive-local-consumer-2026-10-03.py')
before=[bind(p) for p in sorted(paths)]''',1)
text += ''' rows=[];sheet=Image.new('RGB',(3*264,4*294),'#181818');draw=ImageDraw.Draw(sheet)
 def rgb(v):return make_lupton_rgb(v[2],v[1],v[0],interval=ManualInterval(vmin=0,vmax=None),stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
 for at,p in enumerate(patches):
    values=science[:,p['region'][0],p['region'][1]]
    assert np.allclose(p['weightSum'],1,rtol=0,atol=3e-7)
    assert np.allclose(p['reconstruction'],values,rtol=4e-7,atol=2e-8)
    started=time.perf_counter();result=adaptive_common_display(values,p['eligible'],p['stencils']);seconds=time.perf_counter()-started
    original=rgb(values);assert np.array_equal(original,reference[p['region']])
    filtered=rgb(result.estimates);old_fixed=rgb(np.stack([a[p['region']] for a in fixed]))
    center=(slice(8,41),slice(8,41))
    assert np.array_equal(result.estimates[:,~p['eligible']],values[:,~p['eligible']])
    assert np.array_equal(result.estimates[:,result.protected],values[:,result.protected])
    assert np.array_equal(result.estimates[:,:8],values[:,:8])
    saved=[]
    for name,array in [('original-measurements',values),('display-estimates',result.estimates),('eligible',p['eligible']),('radius',result.radius),('reached',result.reached),('protected',result.protected)]:
        path=OUT/f'{p["name"]}-{name}.npy';np.save(path,array,allow_pickle=False);saved.append(bind(path))
    for column,(name,image) in enumerate([('original',original),('old-fixed',old_fixed),('adaptive',filtered)]):
        path=OUT/f'{p["name"]}-{name}.png';Image.fromarray(image).save(path);saved.append(bind(path))
        draw.text((column*264+3,at*294+3),f'{p["name"]} / {name}',fill='white')
        sheet.paste(Image.fromarray(image[center]).resize((264,264),Image.Resampling.NEAREST),(column*264,at*294+24))
    changed=np.any(result.estimates!=values,axis=0)[center]
    levels,counts=np.unique(result.radius[center],return_counts=True)
    rows.append({'name':p['name'],'centerXY':p['centerXY'],'supportSize':49,'outputSize':33,'fields':p['fields'],
      'qualifiedCenters':int(p['eligible'][center].sum()),'protectedCenters':int(result.protected[center].sum()),
      'changedEstimateCenters':int(changed.sum()),'changedRgbCenters':int(np.any(filtered[center]!=original[center],axis=2).sum()),
      'radiusCounts':dict(zip(map(str,levels.tolist()),counts.tolist())),'commonRatioReached':int(result.reached[center].sum()),
      'unknownOrFlaggedExact':True,'protectedWholeColourExact':True,'outerHaloExact':True,'kernelSeconds':seconds,'outputs':saved,
      'originalMeanRGB':original[center].mean(axis=(0,1)).tolist(),'adaptiveMeanRGB':filtered[center].mean(axis=(0,1)).tolist()})
 sheet.save(OUT/'actual-local-comparison.png')
 (OUT/'adaptive-owner-executed.py').write_bytes((ROOT/'data-pipelines/deep-sky/sdss_adaptive_display.py').read_bytes())
 after=[bind(p) for p in sorted(paths)];assert before==after;save('inputs-after.json',after)
 save('result.json',{'status':'PASSED_BOUNDED_ADAPTIVE_DISPLAY_CONSUMER','version':VERSION,'radii':RADII,'absoluteConditionalRatio':RATIO,
  'rows':rows,'inputsExact':True,'recipe':recipe,'comparison':bind(OUT/'actual-local-comparison.png'),
  'scope':'Four declared49x49 actual source supports,33x33 outputs. Same masks/weights across gri; original coadd only. Fixed prior estimates for comparison only. New sign-neutral conditional ratio gates and protected-structure exclusion differ from original ADAPTSMOOTH. Not calibrated confidence, photometry, full quality, full frame/cost or ordinary publication. Exact science/recipe/old publications/default retained.',
  'sourceRequests':0,'oldFilterRuns':0,'displayFits':0,'adopted':False,'independentReview':'MISSING'})
 print(json.dumps({'result':bind(OUT/'result.json'),'rows':[{k:r[k] for k in ('name','changedEstimateCenters','changedRgbCenters','radiusCounts','kernelSeconds')} for r in rows]}))
except Exception as error:
 save('failed.json',{'error':str(error),'type':type(error).__name__});raise
'''
destination=TASK/'scripts/experience-sdss-adaptive-local-2026-10-03.py'
with destination.open('x',encoding='utf-8') as stream:stream.write(text)
print(destination.relative_to(ROOT).as_posix())
