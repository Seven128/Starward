import fs from 'node:fs/promises';
import path from 'node:path';
const dir=path.resolve(import.meta.dirname,'..'),batch=process.argv[2];
const all={
 themes:['day','night','observation'].flatMap(mode=>['map','my'].map(page=>({page,mode,state:page==='map'?'medium':'normal',width:390}))),
 map:['small','large-no-photo','large-photo','layers','partial-stale-risk'].map(state=>({page:'map',mode:'day',state,width:390})),
 my:['empty','loading','offline','identity-recovery'].map(state=>({page:'my',mode:'day',state,width:390})),
 sizes:[320,375,430].flatMap(width=>['map','my'].map(page=>({page,mode:'day',state:width===320?'long-text':page==='map'?'medium':'normal',width}))),
 components:['day','night','observation'].map(mode=>({page:'components',mode,state:'component-states',width:390}))
};
if(!all[batch])throw Error('expected themes/map/my/sizes/components');
const input=path.join(dir,'experiment-1/B/coverage'),helper=await fs.readFile('.agents/skills/starward-design-resource/scripts/figma-helpers.js','utf8'),exporter=await fs.readFile('.agents/skills/starward-design-resource/scripts/scripter-export.js','utf8'),design=await fs.readFile(path.join(input,'design.js'),'utf8');
const sources={};
for(const folder of ['docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/assets/icons','apps/wechat-miniapp/src/assets/semantic','apps/wechat-miniapp/src/assets/icons'])for(const file of await fs.readdir(folder))if(file.endsWith('.svg'))sources[file.slice(0,-4)]=await fs.readFile(path.join(folder,file),'utf8');
const fixture=JSON.parse(await fs.readFile(path.join(dir,'coverage-fixture.json'),'utf8')),map=await fs.readFile(path.join(dir,'assets/osm-reference.png')),photo=await fs.readFile(path.join(dir,'assets/shenzhen-observatory-2021.jpg'));
const source=`${helper}\n${exporter}\n${design}\n
StarwardFigma.attestBrowserFile({observedUrl:'https://www.figma.com/design/tU01DsKBhSng9IHk1xlJQA/',expectedFileKey:'tU01DsKBhSng9IHk1xlJQA',documentName:'Starward 地图与我的 · 设计资源',pageId:'0:1'});
const fileKey='tU01DsKBhSng9IHk1xlJQA',batch=${JSON.stringify(batch)},revision='coverage-'+batch+'-r0',cases=${JSON.stringify(all[batch])};
const sources=${JSON.stringify(sources)},icons={};
for(const [name,svg] of Object.entries(sources)){icons[name]=svg.replaceAll('currentColor','#282b29');for(const [mode,color] of Object.entries({day:'#282b29',night:'#f5f3ec',observation:'#ff6b58'}))if(!sources[name+'-'+mode])icons[name+'-'+mode]=svg.replaceAll('currentColor',color);}
const fonts={regular:await StarwardFigma.resolveFont(),medium:await StarwardFigma.resolveFont(undefined,'Medium')};
const mapImageHash=figma.createImage(new Uint8Array(${JSON.stringify([...map])})).hash,fixture=${JSON.stringify(fixture)};
await figma.getImageByHash(mapImageHash).getSizeAsync();
${batch==='map'?`fixture.photoImageHash=figma.createImage(new Uint8Array(${JSON.stringify([...photo])})).hash;await figma.getImageByHash(fixture.photoImageHash).getSizeAsync();`:''}
const files=[],boards=[];let column=0;
for(const spec of cases){
 const id='coverage-'+batch+'-'+spec.page+'-'+spec.mode+'-'+spec.state+'-'+spec.width,owner=id;
 if(figma.currentPage.children.some(n=>n.getPluginData('starward-resource-owner')===owner))throw Error('existing coverage root '+id);
 const tx=await StarwardFigma.beginCandidate({fileKey,owner});
 try{
  tx.stage.x=column++*520;tx.stage.y=${7000+Object.keys(all).indexOf(batch)*1000};
  const result=await buildDesign({...spec,root:tx.stage,direction:1,height:844,fonts,icons,mapImageHash,fixture});
  const saved=StarwardFigma.commitCandidate(tx),out=await StarwardFigma.exportBoard(tx.stage,{fileKey,revision});
  const board={id,candidateId:'e1-B-2',purpose:'coverage',...spec,height:844,scale:1,round:0,revision,fileKey,nodeId:tx.stage.id,rootId:tx.stage.id,fingerprint:out.fingerprint,metadata:result.metadata};
  boards.push(board);files.push({name:id+'.png',data:out.png},{name:id+'.json',data:JSON.stringify(out.structure)});print(JSON.stringify({id,nodeId:tx.stage.id,bytes:out.png.length}));
 }catch(error){StarwardFigma.discardStage(tx);throw error;}
}
files.push({name:'boards.json',data:JSON.stringify(boards)});await starwardDownload(files);`;
const output=path.join(input,`execute-${batch}-r0.js`);try{await fs.access(output);throw Error('immutable source exists');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.writeFile(output,source);console.log(`Built ${batch}: ${all[batch].length} boards, ${source.length} chars`);
