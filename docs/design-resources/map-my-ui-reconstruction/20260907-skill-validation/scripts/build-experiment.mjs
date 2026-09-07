import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const dir=path.resolve(import.meta.dirname,'..'), group=process.argv[2],round=Number(process.argv[3]??0),experiment=Number(process.argv[4]??1),technical=Number(process.argv[5]??0);
if(!['A','B'].includes(group))throw Error('expected A or B');
if(![0,1,2].includes(round))throw Error('invalid round');
if(![1,2,3,4].includes(experiment))throw Error('invalid experiment');
if(!Number.isInteger(technical)||technical<0||technical>9)throw Error('invalid technical attempt');
const suffix=technical?'-technical-'+technical:'';
if(experiment>1){const freeze=JSON.parse(await fs.readFile(path.join(dir,'retests/v2/frozen-inputs.json'),'utf8'));for(const f of freeze.files)if(crypto.createHash('sha256').update(await fs.readFile(path.join(freeze.repository,f.path))).digest('hex')!==f.sha256)throw Error('frozen input changed: '+f.path);}
const input=path.join(dir,'experiment-'+experiment,group);
const runtime=experiment===1?path.resolve('.agents/skills/starward-design-resource'):path.join(dir,'retests/v2/frozen/starward-design-resource');
const helper=await fs.readFile(path.join(runtime,'scripts/figma-helpers.js'),'utf8');
const exporter=await fs.readFile(path.join(runtime,'scripts/scripter-export.js'),'utf8');
let design;try{design=await fs.readFile(path.join(input,'round-'+round+suffix,'design.js'),'utf8');}catch(e){if(e.code!=='ENOENT'||technical)throw e;design=await fs.readFile(path.join(input,'design.js'),'utf8');}
const sources={};
for(const folder of experiment===1?['docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/assets/icons','apps/wechat-miniapp/src/assets/semantic','apps/wechat-miniapp/src/assets/icons']:[path.join(dir,'assets/icons')])
 for(const file of await fs.readdir(folder))if(file.endsWith('.svg'))sources[file.slice(0,-4)]=await fs.readFile(path.join(folder,file),'utf8');
const fixture=JSON.parse(await fs.readFile(path.join(dir,experiment===1?'fixture.json':'retests/v2/frozen/fixture.json'),'utf8'));
const map=await fs.readFile(path.join(dir,'assets/osm-reference.png'));
const source=`${helper}\n${exporter}\n${design}\n
StarwardFigma.attestBrowserFile({observedUrl:typeof FRESH_OBSERVED_URL==='string'?FRESH_OBSERVED_URL:'https://www.figma.com/design/tU01DsKBhSng9IHk1xlJQA/',expectedFileKey:'tU01DsKBhSng9IHk1xlJQA',documentName:'Starward 地图与我的 · 设计资源',pageId:'0:1'});
const fileKey='tU01DsKBhSng9IHk1xlJQA',group=${JSON.stringify(group)},round=${round},experiment=${experiment},technicalAttempt=${technical},revision='experiment-'+experiment+'-'+group+'-round-'+round+${JSON.stringify(suffix)};
const sources=${JSON.stringify(sources)},icons={};
for(const [name,svg] of Object.entries(sources)) {icons[name]=svg.replaceAll('currentColor','#282b29');for(const [mode,color] of Object.entries({day:'#282b29',night:'#f5f3ec',observation:'#ff6b58'}))if(!sources[name+'-'+mode])icons[name+'-'+mode]=svg.replaceAll('currentColor',color);}
const fonts={regular:await StarwardFigma.resolveFont(),medium:await StarwardFigma.resolveFont(undefined,'Medium'),...(experiment>1?{bold:await StarwardFigma.resolveFont(undefined,'Bold')}:{})};
const mapImageHash=figma.createImage(new Uint8Array(${JSON.stringify([...map])})).hash,fixture=${JSON.stringify(fixture)};
await figma.getImageByHash(mapImageHash).getSizeAsync();
const files=[],boards=[];
for(let direction=0;direction<3;direction++)for(const page of ['map','my']){
 const id='e'+experiment+'-'+group+'-'+(direction+1)+'-'+page,owner=round===0?id:id+'-round-'+round;
 if(figma.currentPage.children.some(n=>n.getPluginData('starward-resource-owner')===owner))throw Error('existing candidate '+id+'; readback required');
 const tx=await StarwardFigma.beginCandidate({fileKey,owner});
 try {
  tx.stage.name=id+' / round '+round;tx.stage.resize(390,844);tx.stage.x=direction*920+(page==='my'?430:0);tx.stage.y=(group==='A'?1000:2000)+round*2000+(experiment-1)*12000;
  await buildDesign({root:tx.stage,page,direction,width:390,height:844,mode:'day',state:page==='map'?'medium':'normal',fonts,icons,mapImageHash,fixture});
  const saved=StarwardFigma.commitCandidate(tx),out=await StarwardFigma.exportBoard(tx.stage,{fileKey,revision});
  files.push({name:id+'.png',data:out.png},{name:id+'.json',data:JSON.stringify(out.structure)});
  boards.push({id,candidateId:'e'+experiment+'-'+group+'-'+(direction+1),page,mode:'day',state:page==='map'?'medium':'normal',width:390,height:844,scale:1,round,technicalAttempt,revision,fileKey,nodeId:tx.stage.id,rootId:saved.rootId,fingerprint:out.fingerprint});
  print(JSON.stringify({id,nodeId:tx.stage.id,bytes:out.png.length}));
 }catch(error){StarwardFigma.discardStage(tx);throw error;}
}
files.push({name:'boards.json',data:JSON.stringify(boards)});await starwardDownload(files);`;
const output=path.join(input,'execute-round-'+round+suffix+'.js');
try{await fs.access(output);throw Error('immutable execution source already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.writeFile(output,source);console.log(`Built ${group} round ${round}: ${source.length} chars`);
