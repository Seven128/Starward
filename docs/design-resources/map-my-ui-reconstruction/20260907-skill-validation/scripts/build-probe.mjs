import fs from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve(import.meta.dirname,'..'), skill=path.resolve('.agents/skills/starward-design-resource/scripts');
const helper=await fs.readFile(path.join(skill,'figma-helpers.js'),'utf8'), exporter=await fs.readFile(path.join(skill,'scripter-export.js'),'utf8');
const icon=await fs.readFile('apps/wechat-miniapp/src/assets/icons/chevron-right-day.svg','utf8');
const photo=await fs.readFile('workers/miniapp-api/src/test-fixtures/self-generated-transport-test.jpg');
await fs.mkdir(path.join(directory,'assets'),{recursive:true});await fs.writeFile(path.join(directory,'assets/probe-transport-fixture.jpg'),photo);
const script=`${helper}\n${exporter}\n
StarwardFigma.attestBrowserFile({observedUrl:'https://www.figma.com/design/tU01DsKBhSng9IHk1xlJQA/',expectedFileKey:'tU01DsKBhSng9IHk1xlJQA',documentName:'Starward 地图与我的 · 设计资源',pageId:'0:1'});
const fileKey='tU01DsKBhSng9IHk1xlJQA';
if(figma.currentPage.children.some(n=>n.getPluginData('starward-resource-owner')==='probe')) throw Error('probe already exists; read back before updating');
const fontName=await StarwardFigma.resolveFont();
const tx=await StarwardFigma.beginCandidate({fileKey,owner:'probe'});
let target=null;
try {
  const root=tx.stage;root.name='中文与组件探针';root.resize(390,400);root.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}];
  const stack=StarwardFigma.stack(root,{name:'Auto Layout 内容',width:342,gap:16});stack.x=24;stack.y=24;
  await StarwardFigma.text(stack,'今晚去观星',{fontName,size:20,width:342});
  const description=await StarwardFigma.text(stack,'现场反馈与纠错',{fontName,size:15,width:342,name:'可修改中文说明'});
  const component=figma.createComponent();root.appendChild(component);component.name='探针可复用控件';component.resize(342,44);component.layoutMode='HORIZONTAL';component.itemSpacing=8;component.paddingLeft=12;component.paddingRight=12;component.counterAxisAlignItems='CENTER';component.fills=[{type:'SOLID',color:{r:.96,g:.97,b:.96}}];
  await StarwardFigma.text(component,'打开下一页',{fontName,width:260});StarwardFigma.icon(component,${JSON.stringify(icon)});
  root.appendChild(component);component.x=420;component.y=0;
  const instance=component.createInstance();stack.appendChild(instance);StarwardFigma.control(instance,'probe-next','apps/wechat-miniapp/src/components/semantic-asset.tsx');
  const picture=figma.createRectangle();stack.appendChild(picture);picture.name='许可自生成图片';picture.resize(120,80);picture.fills=[{type:'IMAGE',imageHash:figma.createImage(new Uint8Array(${JSON.stringify([...photo])})).hash,scaleMode:'FILL'}];
  const next=figma.createFrame();target=next;next.setPluginData('starward-resource-owner','probe-target');next.setPluginData('starward-staging','true');next.name='探针跳转目标';next.resize(390,400);next.x=850;await StarwardFigma.text(next,'已到达第二页',{fontName,size:20,width:342});
  instance.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:next.id,navigation:'NAVIGATE',transition:null,preserveScrollPosition:false}]}];
  const saved=StarwardFigma.commitCandidate(tx);next.setPluginData('starward-staging','');figma.currentPage.selection=[root];figma.viewport.scrollAndZoomIntoView([root]);
  const exported=await StarwardFigma.exportBoard(root,{fileKey,revision:'probe-r0'});
  print(JSON.stringify({probeRoot:root.id,descriptionId:description.id,componentId:component.id,instanceId:instance.id,targetId:next.id,fontName,bytes:exported.png.length}));
  await starwardDownload([{name:'probe-round-0.png',data:exported.png},{name:'probe-round-0.json',data:JSON.stringify(exported.structure)},{name:'probe-state.json',data:JSON.stringify({...saved,descriptionId:description.id,componentId:component.id,instanceId:instance.id,targetId:next.id})}]);
} catch(error) { StarwardFigma.discardStage(tx);if(target&&!target.removed&&target.getPluginData('starward-staging')==='true')target.remove();throw error; }
`;
await fs.writeFile(path.join(import.meta.dirname,'probe-round-0.js'),script);console.log('Built probe script with existing SVG and self-generated transport fixture.');
