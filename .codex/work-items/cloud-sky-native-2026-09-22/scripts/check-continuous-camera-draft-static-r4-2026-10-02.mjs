/** Static parse/source guards only. Does not import or execute the draft. */
import ts from 'typescript';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sourcePath='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-continuous-camera-resource-journey-2026-10-02.draft.mts';
const source=await fs.readFile(sourcePath,'utf8');
const ast=ts.createSourceFile(sourcePath,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const checks={
 syntaxErrors:ast.parseDiagnostics.map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' '),start:d.start})),
 guardBeforeOutput:source.indexOf('DRAFT_ONLY_CONTINUOUS_JOURNEY_NOT_EXECUTION_AUTHORIZED')<source.indexOf('await fs.mkdir'),
 oneStableSeed:(source.match(/page\.evaluate\(stableExecutor/g)||[]).length===1,
 conditionOnlyTransport:source.includes('page.evaluate(journeyExecutor,{condition})'),
 noContributionExecutor:!source.includes('const contributionExecutor='),
 noSceneConsumerNullControl:!source.includes('omitted[11]')&&!source.includes('omitted[30]'),
 noCanvasReplacement:!source.includes("document.querySelector('canvas')!.remove()"),
 states:(source.match(/name:'(?:anchor|east|south|wide|dome|return)[^']*'/g)||[]).length,
};
const result={status:'DRAFT_STATIC_ONLY_NOT_EXECUTED',source:{path:sourcePath,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex')},checks,
 scope:'TypeScript syntax and source guards only. No draft import, execution, esbuild, query, owner progression, browser, GPU or native/resource acceptance.'};
const out='output/continuous-camera-draft-static-1002-r4';
await fs.mkdir(out);
await fs.copyFile(new URL(import.meta.url),path.join(out,'executed-check.mjs.txt'));
await fs.writeFile(path.join(out,'reviewed-draft.mts.txt'),source,{flag:'wx'});
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
if(checks.syntaxErrors.length||Object.entries(checks).some(([k,v])=>!['syntaxErrors','states'].includes(k)&&v!==true)||checks.states!==12)process.exitCode=1;
