import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const patches=[
  {file:'project_context/architecture/runtime-and-domain.md',changes:[
    ['Fixed aerosol parameters, display exposure and the below-horizon twilight fade are illustrative, not site conditions or calibrated radiance.',
     'Fixed aerosol parameters, display exposure and the below-horizon twilight fade are illustrative, not site conditions or calibrated radiance. The low-solar horizon uses relative half-path transmittance and a neutral bounded display transfer through civil twilight; upper/opposite rays retain the blue sky and the astronomical-night branch is unchanged. The exact coefficients remain owned by the GPU shader, not duplicated in Context.'],
    ['Time exposure and red-only display are illustrative transformations of a photograph with fixed captured illumination.',
     'Photo and procedural landscape shaders share the daylight/ambient display functions in `sky-landscape.ts` and consume the same exact solar frame. The foreground recedes through civil/nautical twilight to a faint night floor; its alpha, virtual geometry, resource identity and picking remain unchanged. Photo time exposure and red-only display are illustrative transformations of fixed captured illumination, so directional shadows/highlights are not reconstructed for the current Sun.']
  ]},
  {file:'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',changes:[
    ['曝光随时刻示意，固定照片照明不提供当地天气或可见性。',
     '照片与程序回退复用`sky-landscape.ts`持有的同帧晨昏亮度曲线；曝光只作模拟，固定照片的阴影和高光不随当前太阳重建，不提供当地天气或可见性。']
  ]}
];
const records=[];
for(const patch of patches){
  const original=await fs.readFile(patch.file,'utf8');let current=original;
  for(const [before,after] of patch.changes){assert.equal(current.split(before).length,2,patch.file);current=current.replace(before,after);}
  await fs.writeFile(patch.file,current);
  records.push({path:patch.file,beforeSha256:sha(original),afterSha256:sha(current)});
}
await fs.writeFile('.codex/work-items/cloud-sky-native-2026-09-22/tmp/v53-context-source-changes.json',JSON.stringify(records,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:'Existing Cloud Sky product/architecture owners only',records}));
