// Disposable native-API feedback fixture; never product or physical-device acceptance.
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { main as fixture } from '../../../tools/miniapp/device-feedback-fixture.mjs';

let created;
let previous;
if (process.argv.includes('--reuse')) {
  previous=JSON.parse(await readFile(new URL('R25-native-fixture.json',import.meta.url),'utf8'));
  const physical=await realpath(previous.project);
  const marker=JSON.parse(await readFile(path.join(physical,'.starward-device-feedback-fixture.json'),'utf8'));
  if(physical.toLowerCase()!==path.resolve(previous.project).toLowerCase()||marker.directory.toLowerCase()!==physical.toLowerCase()||!/^starward-device-feedback-fixture-[\w-]+$/.test(path.basename(physical)))throw Error('owned_fixture_identity_changed');
  created={project:physical};
} else await fixture(['create', '--variant', 'A'], { emit: value => { created = value; } });
const project = created.project, root = path.join(project, 'weapp');
const namespace = previous?.namespace ?? 'starward-efficiency-native-' + randomUUID() + ':';
const sources = {};
for (const [name, relative] of [
  ['cache', '../../../apps/wechat-miniapp/src/services/response-cache.ts'],
  ['canvas', '../../../apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle.ts'],
]) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  sources[name] = createHash('sha256').update(source).digest('hex');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.CommonJS } }).outputText;
  await writeFile(path.join(root, name + '.js'), output);
}
const envelope = JSON.stringify(JSON.parse(await readFile(new URL('R2-real-sky-envelope.json', import.meta.url), 'utf8')));
await writeFile(path.join(root, 'envelope.js'), 'module.exports=' + envelope + ';');
await writeFile(path.join(root, 'app.json'), JSON.stringify({ pages: ['pages/index/index', 'pages/away/index'], window: { navigationBarTitleText: 'Native API fixture' } }));
await mkdir(path.join(root, 'pages/away'), { recursive: true });
await writeFile(path.join(root, 'pages/away/index.js'), 'Page({onReady(){setTimeout(()=>wx.navigateBack(),100)}});');
await writeFile(path.join(root, 'pages/away/index.json'), '{}');
await writeFile(path.join(root, 'pages/away/index.wxml'), '<view>ISOLATED NATIVE LIFECYCLE: RETURNING</view>');
await writeFile(path.join(root, 'pages/index/index.wxml'), '<view class="page"><text>ISOLATED NATIVE API FEEDBACK</text><text class="state">{{state}}</text><text class="result" selectable>{{result}}</text><view style="height:160px;width:{{width}}px"><canvas canvas-id="native-probe" id="native-probe" style="height:100%;width:100%;visibility:{{visible ? \'visible\' : \'hidden\'}}" /></view></view>');
await writeFile(path.join(root, 'pages/index/index.wxss'), '.page{padding:16px;background:#fff;color:#111;min-height:100vh}text{display:block;margin-bottom:12px;white-space:pre-wrap;font-size:13px}.state{font-size:20px;font-weight:bold}');
const code = String.raw`
const {createResponseCache,utf8Bytes}=require('../../cache');
const {createSkyCanvasLifecycle}=require('../../canvas');
const envelope=require('../../envelope');
const prefix=__NAMESPACE__;
Page({
 data:{state:'RUNNING',result:'',width:240,visible:false},
 report(){this.setData({result:JSON.stringify(this.metrics,null,2)});},
 fail(code){this.metrics.error=String(code).slice(0,180);this.setData({state:'FAILED'});this.report();},
 async storageProbe(){
  const writes=[];
  const storage={
   getStorageSync:key=>wx.getStorageSync(prefix+key),
   setStorageSync:(key,data)=>{writes.push({sync:true,bytes:utf8Bytes(JSON.stringify(data))});wx.setStorageSync(prefix+key,data);},
   removeStorageSync:key=>wx.removeStorageSync(prefix+key),
   getStorageInfoSync:()=>({keys:wx.getStorageInfoSync().keys.filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length))}),
   setStorage:({key,data})=>new Promise((resolve,reject)=>wx.setStorage({key:prefix+key,data,success:value=>{writes.push({sync:false,bytes:utf8Bytes(data)});resolve(value);},fail:reject})),
  };
  const cache=createResponseCache(storage),expected=JSON.stringify(envelope);
  cache.set('sky:fixture:anonymous',envelope);await cache.flush();
  const restart=createResponseCache(storage),actual=restart.get('sky:fixture:anonymous');
  const match=actual&&actual.text===expected;
  const cleaned=restart.clear();await restart.flush();
  const remaining=storage.getStorageInfoSync().keys.length;
  this.metrics.storage={bytes:utf8Bytes(expected),restartReadback:!!match,asyncBodyWrites:writes.filter(row=>!row.sync).length,cleanupComplete:cleaned&&remaining===0,remainingKeys:remaining};
  if(!match||!cleaned||remaining)throw Error('native_storage_readback_or_cleanup_failed');
  this.storageDone=true;this.finish();
 },
 finish(){this.report();if(this.storageDone&&this.canvasDone&&!this.metrics.error)this.setData({state:'NATIVE API CHECKS PASSED'});},
 onLoad(){this.metrics={scope:'isolated_native_api_fixture',revision:'ports-match-product',nativeCallbacks:0,measurements:0,measureCallbacks:0,contexts:0,drawSubmissions:0,presentations:0,hideEvents:0,showEvents:0};},
 onReady(){
  this.storageProbe().catch(error=>this.fail(error.errMsg||error.message));
  this.owner=createSkyCanvasLifecycle({
   measure:done=>{this.metrics.measurements++;wx.createSelectorQuery().select('#native-probe').boundingClientRect(value=>{this.metrics.measureCallbacks++;done(value);}).exec();},
   createContext:()=>{this.metrics.contexts++;return wx.createCanvasContext('native-probe');},
   paint:(context,frame,size,done)=>{this.metrics.drawSubmissions++;context.setFillStyle('#175c89');context.fillRect(0,0,size.width,size.height);context.setFillStyle('#fff');context.fillText('Native callback '+frame.phase,12,30);context.draw(false,()=>{this.metrics.nativeCallbacks++;setTimeout(done,25);});},
   sameScene:(a,b)=>a.phase===b.phase,
   invalidated:()=>this.setData({visible:false}),
   failed:error=>this.fail(error.message),
   presented:(frame,size)=>{
    this.metrics.presentations++;this.setData({visible:true});
    if(frame.phase==='initial'&&!this.initialDone){
     this.initialDone=true;this.metrics.initialHiddenCallback=true;this.pose=0;
     this.poseTimer=setInterval(()=>this.owner.request({phase:'poses',pose:++this.pose}),5);
     setTimeout(()=>{clearInterval(this.poseTimer);this.metrics.poseUpdates=this.pose;this.setData({width:280},()=>{this.owner.resize();this.owner.request({phase:'resized'});});},350);
    }else if(frame.phase==='poses'){this.metrics.presentedDuringPoseBurst=true;
    }else if(frame.phase==='resized'&&!this.resizedDone){
     this.resizedDone=true;this.metrics.resizedWidth=size.width;
     if(Math.abs(size.width-280)>1)return this.fail('native_resize_measurement_wrong');
     this.awaitingReturn=true;wx.navigateTo({url:'/pages/away/index',fail:()=>this.fail('native_navigation_failed')});
    }else if(frame.phase==='returned'&&!this.canvasDone){
     this.metrics.returnedAfterNativeHide=this.metrics.hideEvents>0;
     this.canvasDone=this.metrics.returnedAfterNativeHide&&this.metrics.presentedDuringPoseBurst;
     this.owner.dispose();if(!this.canvasDone)this.fail('native_canvas_lifecycle_invariant_failed');this.finish();
    }
   },
  });this.owner.ready();this.owner.request({phase:'initial'},true);
 },
 onHide(){if(this.owner){this.metrics.hideEvents++;clearInterval(this.poseTimer);this.owner.hide();}},
 onShow(){if(this.owner&&this.awaitingReturn){this.awaitingReturn=false;this.metrics.showEvents++;this.owner.show();this.owner.request({phase:'returned'},true);}},
 onUnload(){clearInterval(this.poseTimer);this.owner&&this.owner.dispose();},
});
`;
await writeFile(path.join(root, 'pages/index/index.js'), code.replace('__NAMESPACE__', JSON.stringify(namespace)));
const record={project,namespace,sources,envelopeBytes:Buffer.byteLength(envelope),scope:'isolated_native_api_fixture',status:'prepared_not_run',cleanup:'existing fixture owner; namespaced wx keys cleaned by test'};
await writeFile(new URL('R25-native-fixture.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record));
