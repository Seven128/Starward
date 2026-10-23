import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname,extname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
import ts from "typescript";
import type * as ReactTypes from "react";
import * as contracts from "@starward/miniapp-contracts";
import type {SourceDocument} from "../../utils/source-document";
import {transportHarness} from "../../services/api-request-test-support";
import {createAuthenticatedOperationRequester} from "../../services/authenticated-operation";

/** Hook-slot adapter for the actual source recovery owner. Query and rendered
 * component fixtures remain responsible for their own metadata results. */
export function sourceRecoveryTestScope(){
  const slots:any[]=[],hidden=new Map<number,()=>void>(),shown=new Map<number,()=>void>();
  const cleanups:Array<()=>void>=[];
  let cursor=0,hideCursor=0,showCursor=0;
  const react={
    useRef:(current:unknown)=>slots[cursor++]??={current},
    useEffect:(setup:()=>void|(()=>void))=>{
      const index=cursor++;if(slots[index])return;slots[index]=true;
      const cleanup=setup();if(cleanup)cleanups.push(cleanup);
    },
    useCallback:(callback:unknown,deps:readonly unknown[])=>{
      const index=cursor++,old=slots[index];
      if(!old||deps.some((value,i)=>!Object.is(value,old.deps[i])))slots[index]={callback,deps};
      return slots[index].callback;
    },
  };
  const exports:Record<string,any>={};
  const file=new URL('./use-sky-source-recovery.ts',import.meta.url);
  const hook=()=>{
    if(exports.useSkySourceRecovery)return exports.useSkySourceRecovery;
    vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),
      {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
    {exports,require:(name:string)=>{
      if(name==='react')return react;
      if(name==='@tarojs/taro')return {useDidHide:(f:()=>void)=>hidden.set(hideCursor++,f),
        useDidShow:(f:()=>void)=>shown.set(showCursor++,f)};
      throw Error(name);
    }});
    return exports.useSkySourceRecovery;
  };
  return {
    bindings:{useSkySourceRecovery:(...args:unknown[])=>hook()(...args)},
    render<T>(render:(...args:any[])=>T,...args:any[]):T{
      cursor=hideCursor=showCursor=0;return render(...args);
    },
    hide(){for(const action of hidden.values())action();},
    show(){for(const action of shown.values())action();},
    dispose(){for(const cleanup of cleanups.splice(0))cleanup();},
  };
}

/** Full source composition on React/Taro's renderer. This loads production
 * modules, including SourcePage, document/credit templates and query owners;
 * only native I/O, page lifecycle and the input account snapshot are supplied.
 * It establishes content/identity/recovery semantics, never WEAPP appearance. */
export function sourceCompositionTestScope(origin="https://api.example.test"){
  const require=createRequire(import.meta.url);
  const React=require(fileURLToPath(new URL("../../../node_modules/react/index.js",import.meta.url))) as typeof ReactTypes;
  const jsxRuntime=require(fileURLToPath(new URL("../../../node_modules/react/jsx-runtime.js",import.meta.url)));
  Object.assign(globalThis,{ENABLE_INNER_HTML:true,ENABLE_ADJACENT_HTML:false,ENABLE_SIZE_APIS:false,
    ENABLE_TEMPLATE_CONTENT:false,ENABLE_CLONE_NODE:false,ENABLE_CONTAINS:false,ENABLE_MUTATION_OBSERVER:false});
  process.env.TARO_ENV="weapp";process.env.TARO_PLATFORM="mini";
  const {createRoot}=require("@tarojs/react") as typeof import("@tarojs/react");
  const {document}=require("@tarojs/runtime") as typeof import("@tarojs/runtime");
  const {QueryClientProvider}=require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const previousAct=(globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
  const transport=transportHarness(false,()=>{},false,origin);
  const operationCalls:Array<{key:string;operation:string;options:any}>=[];
  const requestOperation=createAuthenticatedOperationRequester({
    resolveSession:async policy=>{assert.equal(policy,"NONE","this public source fixture cannot satisfy account operations");return null;},
    readStoredSession:()=>null,clearStoredSession(){},isPermissionDenied:()=>false,
    // The shared transport fixture's exported type names its default sample;
    // the native callback carries unknown input which the real client validates.
    request:transport.request as unknown as Parameters<typeof createAuthenticatedOperationRequester>[0]["request"],
  });
  const api={invalidateApiCache:transport.invalidateApiCache,
    requestOperation:(key:string,operation:any,options:any)=>{
      operationCalls.push({key,operation,options});return requestOperation(key,operation,options);
    }};
  const callbacks={hide:new Set<()=>void>(),show:new Set<()=>void>(),load:new Set<()=>void>()};
  let params:Record<string,string|undefined>={},pageRoute="sky/sources/index";
  const page={get route(){return pageRoute;}};
  const clipboard:string[]=[],nativeButtons=new Map<string,any>();
  const nativeHook=(kind:keyof typeof callbacks)=>(callback:()=>void)=>{
    React.useEffect(()=>{callbacks[kind].add(callback);return()=>{callbacks[kind].delete(callback);};},[callback]);
  };
  const native={
    useRouter:()=>({params,path:pageRoute}),useDidHide:nativeHook("hide"),useDidShow:nativeHook("show"),
    useLoad:(callback:()=>void)=>React.useLayoutEffect(()=>{callbacks.load.add(callback);callback();return()=>{callbacks.load.delete(callback);};},[]),
    useReady(){},useResize(){},getCurrentPages:()=>[page],getCurrentInstance:()=>({page}),getEnv:()=>"WEAPP",
    getWindowInfo:()=>({windowWidth:360,statusBarHeight:24}),getMenuButtonBoundingClientRect:()=>({left:280,bottom:58}),
    getStorageSync:()=>undefined,setNavigationBarColor:async()=>{},setBackgroundColor:async()=>{},
    setClipboardData:async({data}:{data:string})=>{clipboard.push(data);},
    request(){throw new Error("unexpected bare resource/image request in source reading");},
  };
  const state={mode:"NIGHT",preferences:{largeText:false,reducedMotion:false},notifications:[],
    accountOwnerId:null,mapResetVersion:0,selectedSpotId:null,observationContext:null,hydrate(){},dismissNotification(){}};
  const useAppStore=Object.assign((select:(value:any)=>unknown)=>select(state),{getState:()=>state});
  const nativeComponents={View:"view",Text:"text",Image:"image",ScrollView:"scroll-view",
    Button:(props:any)=>{
      const id=React.useId();
      React.useLayoutEffect(()=>{nativeButtons.set(id,props);return()=>{nativeButtons.delete(id);};},[id,props]);
      return React.createElement("button",props,props.children);
    }};
  const sourceRoot=fileURLToPath(new URL("../../",import.meta.url));
  const modules=new Map<string,{exports:any}>(),loadedFiles=new Set<string>();
  const globals={console,process,Promise,Error,Date,URL,AbortController,ArrayBuffer,Uint8Array,Uint32Array,TextEncoder,
    setTimeout,clearTimeout,queueMicrotask,__MINIAPP_API_BASE__:origin,__MINIAPP_SKY_RESOURCE_BASE__:origin,
    __MINIAPP_ACCEPTANCE_DIAGNOSTICS__:false,__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:false,
    __MINIAPP_DEVELOPMENT_FIXTURE_MODE__:false,__MINIAPP_OPERATOR_PREVIEW_TOKEN__:""};
  const load=(file:string):any=>{
    const target=extname(file)?file:[file+".ts",file+".tsx",file+".json",resolve(file,"index.ts"),resolve(file,"index.tsx")].find(existsSync);
    assert(target&&existsSync(target),`missing source module: ${file}`);
    if(target.endsWith(".scss"))return {};
    if(target.endsWith(".json"))return JSON.parse(readFileSync(target,"utf8"));
    const found=modules.get(target);if(found)return found.exports;
    const module={exports:{}};modules.set(target,module);loadedFiles.add(target);
    const requireModule=(name:string):any=>{
      if(name==="react")return React;
      if(name==="react/jsx-runtime")return jsxRuntime;
      if(name==="@tarojs/components")return nativeComponents;
      if(name==="@tarojs/taro")return native;
      if(name==="@starward/miniapp-contracts")return contracts;
      const local=name.startsWith("@/")?resolve(sourceRoot,name.slice(2)):name.startsWith(".")?resolve(dirname(target),name):null;
      if(local===resolve(sourceRoot,"state/app-store"))return {useAppStore};
      // Reuse the production transport/cache harness and generated operation
      // projection instead of a successful query or invented source result.
      if(local===resolve(sourceRoot,"services/api-client"))return api;
      if(local===resolve(sourceRoot,"services/query-client"))return {miniappQueryClient:transport.queryClient};
      if(local)return load(local);
      // The root workspace has a different React version. Execute Zustand's
      // installed implementation with this renderer's React instance as well.
      if(name==="zustand"||name.startsWith("zustand/"))return load(require.resolve(name));
      return require(name);
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(target,"utf8"),{fileName:target,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,
    {...globals,exports:module.exports,module,require:requireModule},{filename:target,timeout:5000});
    return module.exports;
  };
  const container=document.createElement("root"),root=createRoot(container);
  const flush=async()=>{await React.act(async()=>{await new Promise<void>(done=>setTimeout(done,0));});};
  const render=async(element:ReactTypes.ReactElement)=>{
    await React.act(async()=>{root.render(React.createElement(QueryClientProvider,{client:transport.queryClient},element),()=>{});});
    await flush();
  };
  const module=<T=any>(path:string):T=>load(resolve(sourceRoot,path));
  return {
    transport,operationCalls,clipboard,loadedFiles,container,module,flush,
    get text(){return container.textContent;},
    buttons(){return [...nativeButtons.values()];},
    button(label:string,index=0){const button=[...nativeButtons.values()].filter(props=>props.ariaLabel===label)[index];assert(button,`missing button: ${label}`);return button;},
    async click(label:string,index=0){const button=this.button(label,index);await React.act(async()=>{button.onClick?.({});});await flush();},
    async object(next:Record<string,string|undefined>){params=next;pageRoute="sky/sources/index";
      const {default:Page}=module("sky/sources/index.tsx");await render(React.createElement(Page));},
    async document(value:SourceDocument){pageRoute="spot/data-source/index";
      const {SourcePage}=module("components/source-page.tsx"),{SourceDocumentContent}=module("components/source-document-content.tsx");
      await render(React.createElement(SourcePage,{title:value.title,subtitle:value.subtitle},React.createElement(SourceDocumentContent,{document:value})));},
    async hide(){await React.act(async()=>{for(const callback of callbacks.hide)callback();});},
    async show(){await React.act(async()=>{for(const callback of callbacks.show)callback();});await flush();},
    async respond(body:unknown,statusCode=200){const call=transport.calls.at(-1);assert(call,"missing native request");
      await React.act(async()=>{call.success({statusCode,data:body});});await flush();},
    async refreshInformation(){await React.act(async()=>{void transport.queryClient.invalidateQueries({queryKey:["celestial-object-information"]});});await flush();},
    async dispose(){try{await React.act(async()=>root.unmount(()=>{}));transport.queryClient.clear();await transport.flush();}
      finally{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=previousAct;}},
  };
}
