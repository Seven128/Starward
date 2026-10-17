import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

/** Actual recovery Hook for isolated consumer fixtures whose React adapter
 * does not model Hook slots. Full native-owner tests share their real slots.
 */
export function skyImageRecoveryTestOwner(){
  const slots:Array<{current:unknown}>=[];
  const cleanups:Array<()=>void>=[];
  let cursor=0,effectMounted=false;
  const exports:Record<string,any>={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('./use-sky-image-recovery.ts',import.meta.url),'utf8'),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
    {exports,require:(name:string)=>{
      if(name!=='react')throw Error(name);
      return {useRef:(current:unknown)=>slots[cursor++]??={current},
        useCallback:(callback:unknown)=>callback,
        useEffect:(setup:()=>()=>void)=>{if(!effectMounted){effectMounted=true;cleanups.push(setup());}}};
    }});
  return {useSkyImageRecovery:(...args:unknown[])=>{cursor=0;return exports.useSkyImageRecovery(...args);},
    dispose:()=>{for(const cleanup of cleanups.splice(0))cleanup();}};
}
