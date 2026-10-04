from pathlib import Path
import json, numpy as np
root=Path(__file__).resolve().parents[4];lane=root/'output/playwright/cloud-sky-real-taro-horizontal-interruption-1004-r1'
def read(n):return json.loads((lane/n).read_text(encoding='utf8'))
def diffs(a,b,p=''):
 if type(a)!=type(b):return [[p,a,b]]
 if isinstance(a,dict):
  rows=[]
  for k in a.keys()|b.keys():
   if k not in a or k not in b:rows.append([p+'/'+k,a.get(k),b.get(k)])
   else:rows+=diffs(a[k],b[k],p+'/'+k)
  return rows
 if isinstance(a,list):
  if len(a)!=len(b):return [[p+'/length',len(a),len(b)]]
  return sum((diffs(x,y,p+'/'+str(i)) for i,(x,y) in enumerate(zip(a,b))),[])
 return [] if a==b else [[p,a,b]]
a=np.fromfile(lane/'software-before-background.rgba',dtype=np.uint8).reshape(844,390,4);b=np.fromfile(lane/'software-after-background.rgba',dtype=np.uint8).reshape(a.shape)
delta=b.astype(np.int16)-a.astype(np.int16);where=np.argwhere(np.any(delta!=0,axis=2))
result={'changedPixels':len(where),'changedChannels':int(np.count_nonzero(delta)),'maxAbsoluteChannelDelta':int(np.max(abs(delta))),'totalAbsoluteDelta':int(abs(delta).sum()),'pixelRows':[{'x':int(x),'yTop':843-int(y),'before':a[y,x].tolist(),'after':b[y,x].tolist()} for y,x in where[:200]],'truncated':len(where)>200}
for key in ['paint','capture-boundaries']:
 aa=read('software-before-background-'+key+'.json');bb=read('software-after-background-'+key+'.json')
 dd=diffs(aa,bb);result[key+'DiffCount']=len(dd);result[key+'Diffs']=dd[:200];result[key+'DiffTruncated']=len(dd)>200
path=lane/'return-pixel-difference-inspection.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(result,ensure_ascii=False))
