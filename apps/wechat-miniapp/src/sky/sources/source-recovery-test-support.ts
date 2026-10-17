import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

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
