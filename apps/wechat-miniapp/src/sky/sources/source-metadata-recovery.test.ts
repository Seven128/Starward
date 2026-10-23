import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import {sourceRecoveryTestScope} from "./source-recovery-test-support";
import {opticalHipsSourceSelection,opticalHipsSources} from "../../services/optical-hips-source";

function component(file:string,name:string,bindings:object){
  const source=ts.createSourceFile(file,readFileSync(new URL(file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const node=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name)!;
  return vm.runInNewContext(ts.transpileModule(node.getText(source).replace(/^export\s+(?:default\s+)?/u,'')+`\n${name};`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,{...contracts,...bindings});
}
const elements=(node:any):any[]=>!node?[]:Array.isArray(node)?node.flatMap(elements):[node,...elements(node.children)];
const hash='a'.repeat(64),other='b'.repeat(64);

test('same-selection rerender uses the current query action, but returning to an edition does not revive its old button',()=>{
  const scope=sourceRecoveryTestScope(),useRecovery=scope.bindings.useSkySourceRecovery;
  let oldCalls=0,currentCalls=0;
  const first=scope.render(useRecovery,'prepared:A',true,()=>oldCalls++);
  const current=scope.render(useRecovery,'prepared:A',true,()=>currentCalls++);
  assert.equal(first,current);first();assert.equal(oldCalls,0);assert.equal(currentCalls,1);
  scope.render(useRecovery,'prepared:B',true,()=>currentCalls++);
  const returned=scope.render(useRecovery,'prepared:A',true,()=>currentCalls++);
  first();assert.equal(currentCalls,1);returned();assert.equal(currentCalls,2);
  scope.dispose();returned();assert.equal(currentCalls,2);
});

for(const kind of ['object','prepared','body','hips','hips-rights'] as const){
  test(`${kind} actual Sources retry cannot outlive its selected visible metadata demand`,()=>{
    const scope=sourceRecoveryTestScope();let params:any=kind==='object'?{reference:'M:104',opticalPublicationHash:hash}:
      kind==='prepared'?{reference:'M:104',preparedPublicationHash:hash}:{hipsPublicationHash:hash,hipsSourceIds:'ps1'};
    let props:any={reference:'SOLAR:MOON',publicationHash:hash,visible:true};
    let visible=true,requests=0,lastIdentity='',rootAvailable=true;
    const callbacks:Array<()=>void>=[];
    const root:any={publicationHash:hash,scope:'TRIAL',processing:'Original RGB',limitations:[],
      sources:[{id:'ps1',provider:'Provider',title:'Historical',originalDataUrl:'https://example.org/data',
        originalRights:'Original rights',originalRightsUrl:'https://example.org/rights',hipsRecordUrl:'https://example.org/record',hipsLicense:'ODbL-1.0',hipsDoi:'10.1/example'}]};
    const result=(identity:string)=>({isError:true,isPending:false,refetch:()=>{requests++;lastIdentity=identity;}});
    const bindings={...scope.bindings,React:{createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children})},
      View:'View',Text:'Text',ScrollView:'ScrollView',SourcePage:"SourcePage",CustomNav:'Nav',Provenance:'Provenance',StatusPanel:'StatusPanel',
      SkyBodyImageDetails:'BodyDetails',SkyBodyImageSources:'BodySources',SkyHipsSourcesPage:'HipsSources',
      useRouter:()=>({params}),useState:()=>[visible,(v:boolean)=>{visible=v;}],useDidHide:(f:()=>void)=>callbacks.push(f),useDidShow:()=>{},
      useThemeClass:()=>'',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:true,
      isProductSource:()=>true,isSkyBodyImageReference:()=>true,isDefaultSkyBodyImageSource:()=>false,
      celestialInformationPartialDetail:()=>null,deepSkyManifestUrl:()=>undefined,
      opticalHipsSourceSelection,opticalHipsSources,opticalHipsTileUrl:(v:string)=>v,
      useCelestialInformation:()=>result(JSON.stringify(params)),
      useResourceQuery:(options:any)=>options.queryKey[0]==='optical-hips-source'&&kind==='hips-rights'&&rootAvailable
        ?{...result(JSON.stringify(options.queryKey)),isError:false,data:{...root,publicationHash:params.hipsPublicationHash}}
        :result(JSON.stringify(options.queryKey)),
    };
    const render=kind==='body'?component('./body-image-sources.tsx','SkyBodyImageSources',bindings):kind.startsWith('hips')
      ?component('./hips-sources.tsx','SkyHipsSourcesPage',bindings):component('./index.tsx','CelestialObjectSourcesPage',bindings);
    const frame=()=>scope.render(render,kind==='body'?props:{params});
    const recovery=()=>elements(frame()).find(n=>n.type==='StatusPanel'&&n.props.onRecover)?.props.onRecover;
    const first=recovery();assert.equal(typeof first,'function');first();assert.equal(requests,1);
    scope.hide();for(const hide of callbacks)hide();first();assert.equal(requests,1,'hide must fence a queued retry before rerender');
    scope.show();visible=true;const second=recovery();second();assert.equal(requests,2);
    const firstIdentity=lastIdentity;
    if(kind==='object')params={...params,opticalPublicationHash:other};
    else if(kind==='prepared')params={...params,preparedPublicationHash:other};
    else if(kind==='body')props={...props,publicationHash:other};
    else params={...params,hipsPublicationHash:other};
    const replacement=recovery();second();assert.equal(requests,2,'an old button cannot retry the new or retired edition');
    replacement();assert.equal(requests,3);assert.notEqual(lastIdentity,firstIdentity);
    if(kind==='hips-rights'){
      rootAvailable=false;frame();replacement();assert.equal(requests,3,'rights retry requires the current admitted root');
      rootAvailable=true;
    }
    visible=false;props={...props,visible:false};frame();replacement();assert.equal(requests,3,'disabled demand rejects manual work');
    visible=true;props={...props,visible:true};const last=recovery();scope.dispose();last();assert.equal(requests,3,'unmount retires callbacks');
  });
}
