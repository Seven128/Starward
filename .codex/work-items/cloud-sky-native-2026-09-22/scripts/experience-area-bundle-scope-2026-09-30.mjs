import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const require=createRequire(import.meta.url);
const {parse}=require('@babel/parser');
const traverse=require('@babel/traverse').default;
const generate=require('@babel/generator').default;
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const prior=JSON.parse(await fs.readFile(path.join(task,'evidence/experience-image-intent-binding-2026-09-30.json'),'utf8'));
const before=await fingerprintBundle(path.resolve(prior.build.path));
const candidatePath='apps/wechat-miniapp/dist/weapp-check-sky-scene-v49-final';
const after=await fingerprintBundle(path.resolve(candidatePath));
assert.equal(before.sha256,prior.build.treeSha256);
const sha=x=>createHash('sha256').update(x).digest('hex');
const oldFiles=new Map(before.files.map(x=>[x.path,x.sha256]));
const changedFiles=after.files.filter(x=>oldFiles.get(x.path)!==x.sha256).map(x=>x.path);

function chunkModules(raw){
  const ast=parse(raw);
  const result=new Map();
  traverse(ast,{CallExpression(p){
    const {callee,arguments:args}=p.node;
    if(callee.type!=='MemberExpression'||callee.property.name!=='push'||args[0]?.type!=='ArrayExpression')return;
    const modules=args[0].elements[1];
    if(modules?.type!=='ObjectExpression')return;
    for(const property of modules.properties){
      assert.equal(property.type,'ObjectProperty');
      result.set(String(property.key.value),raw.slice(property.value.start,property.value.end));
    }
  }});
  assert(result.size>0);
  return result;
}

// Compare generated functions while preserving every value, property and branch.
// Only webpack's known contract ID and local bound identifier names are canonicalized.
function canonical(raw){
  const ast=parse(`(${raw})`);
  const names=new Map();
  const bindings=[];
  let next=0;
  const enroll=b=>{if(b&&!names.has(b)){names.set(b,`binding_${next++}`);bindings.push(b);}};
  traverse(ast,{Function(p){for(const parameter of p.node.params){if(parameter.type==='Identifier')enroll(p.scope.getBinding(parameter.name));}}});
  traverse(ast,{Identifier(p){if(p.isReferencedIdentifier())enroll(p.scope.getBinding(p.node.name));}});
  traverse(ast,{Scope(p){for(const b of Object.values(p.scope.bindings))enroll(b);}});
  const renames=[];
  traverse(ast,{Identifier(p){
    if(!p.isBindingIdentifier()&&!p.isReferencedIdentifier())return;
    const b=p.scope.getBinding(p.node.name);
    if(!b)return;
    // Preserve a shorthand property's public key when its local value is renamed.
    if(p.parentPath.isObjectProperty()&&p.key==='value')p.parent.shorthand=false;
    renames.push({node:p.node,name:names.get(b)});
  }});
  for(const {node,name} of renames){assert(name);node.name=name;}
  traverse(ast,{
    CallExpression(p){const a=p.node.arguments;if(a.length===1&&a[0].type==='NumericLiteral'&&a[0].value===9192)a[0].value=8588;},
    VariableDeclaration(p){
      const d=p.node.declarations;
      for(let start=0;start<d.length;){if(d[start].init){start++;continue;}let end=start+1;while(end<d.length&&!d[end].init)end++;
        const run=d.slice(start,end).sort((a,b)=>a.id.name.localeCompare(b.id.name,'en',{numeric:true}));d.splice(start,end-start,...run);start=end;}
    }
  });
  return generate(ast,{compact:true,comments:false}).code;
}

const differences=[];
for(const file of changedFiles){
  const oldRaw=await fs.readFile(path.join(prior.build.path,file),'utf8');
  const newRaw=await fs.readFile(path.join(candidatePath,file),'utf8');
  if(file!=='common.js'&&file!=='sky/detail/index.js'){
    assert.equal(oldRaw.replaceAll('(9192)','(8588)'),newRaw,file+' has more than contract ID relinking');
    differences.push({file,effect:'byte-identical after contract module ID 9192 → 8588'});
    continue;
  }
  const oldModules=chunkModules(oldRaw),newModules=chunkModules(newRaw);
  const modules=[];
  for(const [id,raw] of oldModules){
    const nextId=id==='9192'?'8588':id;
    const value=newModules.get(nextId);
    assert(value,`missing module ${id} in ${file}`);
    const oldCanonical=canonical(raw),newCanonical=canonical(value);
    modules.push({id,nextId,unchangedAfterLocalNamesAndContractId:oldCanonical===newCanonical,beforeSha256:sha(raw),afterSha256:sha(value)});
    newModules.delete(nextId);
  }
  differences.push({file,modules,newModules:[...newModules.keys()]});
}
const result={before:{path:prior.build.path,sha256:before.sha256},after:{path:candidatePath,sha256:after.sha256,files:after.fileCount,rawBytes:after.totalBytes},changedFiles,differences,
  meaning:'Generated module bodies and references compared; no native execution or product acceptance implied.'};
await fs.writeFile(path.join(task,'tmp/v49-generated-bundle-scope.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
