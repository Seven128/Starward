"""Reuse cached master/source preparation without whole-display reprocessing."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
s=(TASK/'scripts/experience-shared-adaptive-display-2026-10-03.py').read_text(encoding='utf-8')
s=s[:s.index('    progress=[];')]
s=s.replace("'output/shared-adaptive-display-1003-r1'", "'output/sdss-real-halo-1003-r1'")
s=s.replace('from PIL import Image','from PIL import Image,ImageDraw\nfrom astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb')
s=s.replace('from sdss_noise_display import NoiseDisplaySource','from sdss_noise_display import NoiseDisplaySource,_qualified_sources,_project_real_halo_window')
s=s.replace('from sdss_adaptive_display import render_adaptive_display_candidate,save_adaptive_display_candidate', 'from sdss_adaptive_display import adaptive_common_display_batched')
marker='    before=[bound(path) for path in paths]'
s=s.replace(marker,"""    parent_dir=ROOT/'output/shared-adaptive-display-1003-r1/candidate'
    parent_path=parent_dir/'candidate.json'
    assert bound(parent_path)['sha256']=='7a4e8f6dd8dbcbcf29520c378323e0e112c811e1904c44b87ddf7bd4e8e43bb7'
    parent=json.loads(parent_path.read_bytes());paths.append(parent_path)
    parent_arrays={}
    for key,meta in parent['arrays'].items():
        path=parent_dir/meta['file'];assert bound(path)['sha256']==meta['sha256'];paths.append(path)
        parent_arrays[key]=np.load(path,mmap_mode='r',allow_pickle=False)
"""+marker)
s+='''    _,admitted_fields,admitted_weights=_qualified_sources(master,sources)
    definitions=[('observed-top',24,0,128),('top-left',0,0,33),('top-right',2015,0,33),
      ('bottom-left',0,2015,33),('bottom-right',2015,2015,33),('top-mid',1008,0,33),
      ('bottom-mid',1008,2015,33),('left-mid',0,1008,33),('right-mid',2015,1008,33)]
    recipe=report['display']['transfer'];rows=[];sheet=Image.new('RGB',(3*256,len(definitions)*282),'#181818');draw=ImageDraw.Draw(sheet)
    def rgb(v):
        return make_lupton_rgb(v[2],v[1],v[0],interval=ManualInterval(vmin=0,vmax=None),
          stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    for at,(name,x,y,size) in enumerate(definitions):
        region=(slice(y-8,y+size+8),slice(x-8,x+size+8));started=time.perf_counter()
        values,eligible,stencils,facts=_project_real_halo_window(master,sources,admitted_fields,admitted_weights,region,lambda:None)
        result=adaptive_common_display_batched(values,eligible,stencils);seconds=time.perf_counter()-started
        core=(slice(8,size+8),slice(8,size+8));old=np.stack([parent_arrays[b][y:y+size,x:x+size] for b in BANDS])
        original=np.stack([master.bands[b].data[y:y+size,x:x+size] for b in BANDS]);new=result.estimates[:,core[0],core[1]]
        yy,xx=np.mgrid[y:y+size,x:x+size];internal=(yy>=8)&(yy<2040)&(xx>=8)&(xx<2040)
        np.testing.assert_array_equal(new[:,internal],old[:,internal])
        for key in ('radius','reached','protected'):
            np.testing.assert_array_equal(getattr(result,key)[core][internal],parent_arrays[key][y:y+size,x:x+size][internal])
        saved=[]
        for key,value in [('source-window',values),('eligible',eligible),('display-window',result.estimates),('radius',result.radius),('reached',result.reached),('protected',result.protected)]:
            path=out/f'{name}-{key}.npy';np.save(path,value,allow_pickle=False);saved.append(bound(path))
        for index,stencil in enumerate(stencils):
            path=out/f'{name}-field-{index}.npz';np.savez_compressed(path,**stencil);saved.append(bound(path))
        images=[rgb(original),rgb(old),rgb(new)]
        for column,(label,image) in enumerate(zip(('original','outer-fallback','real-halo'),images)):
            path=out/f'{name}-{label}.png';Image.fromarray(image).save(path);saved.append(bound(path))
            draw.text((column*256+4,at*282+3),f'{name} / {label}',fill='white')
            sheet.paste(Image.fromarray(image).resize((256,256),Image.Resampling.NEAREST),(column*256,at*282+24))
        rows.append({'name':name,'boundsXYExclusive':[x,y,x+size,y+size],'supportSize':size+16,'facts':facts,
          'edgeCenters':int((~internal).sum()),'changedEdgeEstimateCenters':int(np.any(new!=old,axis=0)[~internal].sum()),
          'changedEdgeRgbCenters':int(np.any(images[2]!=images[1],axis=2)[~internal].sum()),
          'internalEstimatesAndDiagnosticsExact':True,'projectionAndKernelSeconds':seconds,'outputs':saved})
        del stencils,result,values
    sheet.save(out/'actual-edge-comparison.png')
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    result={'status':'PASSED_ACTUAL_REAL_HALO_EDGE_CONSUMER','rows':rows,'comparison':bound(out/'actual-edge-comparison.png'),
      'inputsExact':True,'recipe':recipe,'sourceRequests':0,'oldFilterRuns':0,'wholeMasterFilterRuns':0,'displayFits':0,
      'scope':'Nine declared actual border/corner supports. Original WCS and physical CCD-distance weights; cached science/projected/weights overlap exact. Outside samples real, not mirrored/copied/zero padded. No alpha/publication changes.',
      'qualityAcceptance':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(out/'result.json',result);print(json.dumps({'receipt':bound(out/'result.json'),'rows':[{k:row[k] for k in ('name','edgeCenters','changedEdgeEstimateCenters','changedEdgeRgbCenters','projectionAndKernelSeconds')} for row in rows]}))

if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/sdss-real-halo-1003-r1'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
'''
path=TASK/'scripts/experience-sdss-real-halo-2026-10-03.py'
with path.open('x',encoding='utf-8',newline='\n') as f:f.write(s)
print(path)
