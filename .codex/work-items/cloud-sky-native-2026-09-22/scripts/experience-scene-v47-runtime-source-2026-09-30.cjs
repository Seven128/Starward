// Read only the installed runtime's packaged source index, without requiring
// application modules or invoking internal UI APIs. Output stays task-local.
const fs=require('node:fs');
const path=require('node:path');
const base='E:/微信web开发者工具/resources/app.asar';
const details=process.argv[2]==='tools';
const cases=process.argv[2]==='find-cases';
const find=process.argv[2]==='find'||cases;
const destination=path.resolve(__dirname,cases?'../tmp/v47-native-tool-cases.json':find?'../tmp/v47-native-tool-locations.json':details?'../tmp/v47-native-tool-source.json':'../tmp/v47-native-packed-index.json');
const result={scope:'read-only installed source/package index; no application module execution'};
try{
  const pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));
  result.package={main:pkg.main,version:pkg.version};
  result.paths=[];
  function walk(relative,depth){
    for(const item of fs.readdirSync(path.join(base,relative),{withFileTypes:true})){
      const name=path.posix.join(relative,item.name);
      if(item.isDirectory()&&depth>0)walk(name,depth-1);
      if(!item.isDirectory()&&/agent|mcp|skill|simulator|automation/.test(name))result.paths.push(name);
    }
  }
  if(find){
    result.matches=[];result.scannedFiles=0;
    function locate(relative,depth){
      for(const item of fs.readdirSync(path.join(base,relative),{withFileTypes:true})){
        const name=path.posix.join(relative,item.name);
        if(item.isDirectory()&&depth>0&&item.name!=='node_modules')locate(name,depth-1);
        if(!item.isDirectory()&&name.endsWith('.js')){
          result.scannedFiles++;
          const source=fs.readFileSync(path.join(base,name),'utf8');
          const terms=cases?['SIMULATOR_OPEN_PAGE','SIMULATOR_REFRESH','GET_SIMULATOR_CONSOLE','AUTOMATION_RUNTIME_INFO']
            :['simulator_open_page','simulator_refresh','automation_runtime_info','get_simulator_console','simulatorOpenPage','refreshSimulator'];
          const matches=terms.filter(term=>source.includes(term));
          if(matches.length)result.matches.push({path:name,bytes:Buffer.byteLength(source),terms:matches,
            excerpts:matches.map(term=>{const index=source.lastIndexOf(term);return {term,index,source:source.slice(Math.max(0,index-150),index+1500)}})});
        }
      }
    }
    locate('js',5);
  }
  else if(!details)walk('js',3);
  else{
    const sourcePath='js/extensions/agent/index.js';
    const source=fs.readFileSync(path.join(base,sourcePath),'utf8');
    result.sourcePath=sourcePath;result.sourceBytes=Buffer.byteLength(source);result.excerpts=[];
    for(const term of ['simulator_open_page','simulator_refresh','automation_runtime_info','get_simulator_console']){
      const positions=[];for(let cursor=0;;){const index=source.indexOf(term,cursor);if(index<0)break;positions.push(index);cursor=index+term.length;}
      const selected=[...new Set([...positions.slice(0,2),...positions.slice(-2)])];
      result.excerpts.push({term,totalOccurrences:positions.length,values:selected.map(index=>({index,source:source.slice(Math.max(0,index-250),index+2600)}))});
    }
  }
}catch(error){result.error={code:error.code,message:String(error.message).slice(0,500)};}
fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
