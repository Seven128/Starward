import fs from 'node:fs/promises';
import path from 'node:path';
const dir=path.resolve(import.meta.dirname,'..'),base=path.join(dir,'experiment-1/B/coverage');
const boards=[];
for(const batch of ['themes','map','my','sizes','components']) for(const b of JSON.parse(await fs.readFile(path.join(base,batch,'boards.json'),'utf8'))) { const {fingerprint,metadata,...board}=b;boards.push({...board,sourceBatch:batch,revision:'coverage-evidence-r1'}); }
const helper=await fs.readFile('.agents/skills/starward-design-resource/scripts/figma-helpers.js','utf8'),exporter=await fs.readFile('.agents/skills/starward-design-resource/scripts/scripter-export.js','utf8');
const source=`${helper}\n${exporter}\nStarwardFigma.attestBrowserFile({observedUrl:FRESH_OBSERVED_URL,expectedFileKey:'tU01DsKBhSng9IHk1xlJQA',documentName:'Starward 地图与我的 · 设计资源',pageId:'0:1'});
const boards=${JSON.stringify(boards)},files=[];
for(const board of boards){const root=await figma.getNodeByIdAsync(board.nodeId);if(root.parent!==figma.currentPage||root.getPluginData('starward-resource-owner')!==board.id)throw Error('coverage identity mismatch');for(const n of root.findAll(n=>Array.isArray(n.fills)))for(const f of n.fills)if(f.type==='IMAGE')await figma.getImageByHash(f.imageHash).getSizeAsync();const out=await StarwardFigma.exportBoard(root,{fileKey:board.fileKey,revision:board.revision});board.fingerprint=out.fingerprint;files.push({name:board.id+'.png',data:out.png},{name:board.id+'.json',data:JSON.stringify(out.structure)});print(JSON.stringify({id:board.id,bytes:out.png.length}));}
files.push({name:'boards.json',data:JSON.stringify(boards)});await starwardDownload(files);`;
await fs.writeFile(path.join(base,'refresh-evidence.js'),source);console.log(`Ready to read/export ${boards.length} existing roots; no layout mutation`);
