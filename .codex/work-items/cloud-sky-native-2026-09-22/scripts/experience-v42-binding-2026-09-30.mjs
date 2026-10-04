import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sizeModule from 'image-size';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const imageSize=typeof sizeModule==='function'?sizeModule:sizeModule.imageSize??sizeModule.default;
const root=path.resolve('.'),base=path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=name=>fs.readFile(path.join(base,name));
const json=async name=>JSON.parse((await read(name)).toString().replace(/^\uFEFF/,''));
const previous=await json('evidence/experience-time-fine-target-native-v41-2026-09-30.json');
const candidate=path.join(root,'apps/wechat-miniapp/dist/weapp-check-sky-time-v42');
const build=await fingerprintBundle(candidate);
const sources=await Promise.all(previous.sourceHashes.map(async row=>({path:row.path,sha256:sha(await fs.readFile(path.join(root,row.path)))})));
const captures=[];
for(const name of ['reference-stellarium-m31-5_83-2026-09-30.jpg','reference-stellarium-m31-0_828-2026-09-30.jpg','reference-stellarium-m42-5_83-2026-09-30.jpg','reference-stellarium-m42-0_828-2026-09-30.jpg','reference-stellarium-m42-return-5_83-2026-09-30.jpg','experience-time-v42-controls-2026-09-30.png']){
  const bytes=await read('evidence/'+name);
  const dimensions=imageSize(bytes);
  captures.push({file:name,sha256:sha(bytes),bytes:bytes.length,width:dimensions.width,height:dimensions.height,format:dimensions.type,dimensionsMethod:'image-size；原字节保留，无重编码或像素校验'});
}
const states={};
for(const [key,name] of Object.entries({initialPreplay:'v42-target-preplay-state.json',initialPostpause:'v42-target-postpause-state.json',sdk3174Warm:'v42-sdk-fine-warm-state.json',beforeRefresh:'v42-target-refresh-before-state.json',failedRefresh:'v42-target-refresh-failed-state.json',recoveredRefresh:'v42-target-refresh-recovered-state.json'})){
  const state=await json('tmp/'+name);
  states[key]={mode:state.mode,counts:state.counts,targetReads:state.targetReads.slice(-3).map(({contextId,...row})=>({...row,contextIdSha256:sha(contextId)}))};
}
const result={capturedAtUtc:new Date().toISOString(),scope:'云观星开发证据；大字号暂停；未触手机／发布',build:{path:path.relative(root,candidate).replaceAll('\\','/'),files:build.fileCount,rawBytes:build.totalBytes,treeSha256:build.sha256,skyPageSha256:sha(await fs.readFile(path.join(candidate,'sky/detail/index.js')))},sourceHashes:sources,
context:previous.context,counters:states,nativeSnapshots:'experience-v42-native-snapshots-2026-09-30.json',captures,
nativeRuntime:{initialSdk:'3.17.3',recoveryCombinationSdk:'3.17.4',restoredSdk:'3.17.3',comparisonScope:'隔离检查包临时固定本机已安装库；原 trial 配置已精确恢复，重新打开后实际WXML与页节点 _Fk 一致，console grep error/recursive无命中；不能据临时比较认定3.17.3根因',initialNavigationStartupTimeout:'记录失败，不计通过',setDataProbe:'两种参数转发均抛 native clone 错误；诊断包装已还原，未认定产品或SDK根因'},
reference:{url:'https://stellarium-web.org/',viewport:{width:1280,height:720},locationLabel:'NEAR SINGAPORE',uiTime:'2026-09-30 05:05:33',clockPaused:true,fovUiDegrees:[5.83,0.828],objects:['M31','M42'],limits:'未读出精确坐标、时区及FOV方向定义；与Mini测试地点/时刻不同，未作跨平台像素或几何验收。两样本高倍局部纹理保留，不外推全部对象/统一阈值。'},
checks:{validator:'新 availability/validAt/contextRevision 反例修前 Missing expected exception，修后1项通过；SAMPLE_DATA/PARTIAL标签保留',miniTypecheck:'通过',isolatedV42Build:'通过；既有3项警告',backend:'沿v41本代服务原绑定，无新backend改动'},
limitations:['当前Sky截图只见Canvas；实际WXML文字与事件检查不认证普通覆盖层、呼吸或手机合成','临时诊断失败和未产生效果的点击不计正常交互通过','独立审查／整场质量／SAO迟到失败／资源峰值／官方包体／实际成本和最终手机验收仍开放','旧手机未认证本代新月面，商业范围及排除理由保持']};
await fs.writeFile(path.join(base,'evidence/experience-v42-binding-2026-09-30.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({build:result.build,captures:captures.length,counters:Object.fromEntries(Object.entries(states).map(([k,v])=>[k,v.counts]))}));
