/** Derive one complete admission index from the already admitted prose pack.
 * No prose, identifiers, rights, version or runtime asset bytes are invented. */
import {readFile,writeFile,link,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {parseChineseIntroductionPublication,parseChineseIntroductionIndex,CHINESE_INTRODUCTION_PUBLICATION}
 from '../../workers/miniapp-api/src/celestial-object-introductions.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const input=path.join(root,'workers/miniapp-api/assets',CHINESE_INTRODUCTION_PUBLICATION.file);
const output=path.join(root,'workers/miniapp-api/assets/celestial-object-introductions.index.json');
if(process.argv.length!==2)throw Error('introduction_index_no_arbitrary_input_or_output');
const bytes=await readFile(input),rows=parseChineseIntroductionPublication(bytes),pack=JSON.parse(bytes.toString('utf8'));
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const index={format:'celestial-introductions-index-v1',locale:pack.locale,publication:{file:path.basename(input),
 version:pack.version,bytes:bytes.length,sha256:digest(bytes)},references:[...rows.keys()].sort()};
const encoded=Buffer.from(JSON.stringify(index,null,2)+'\n');
parseChineseIntroductionIndex(encoded,digest(encoded));
if(!(await readFile(input)).equals(bytes))throw Error('introduction_source_changed_before_index_write');
let exists=false;
try{const original=await readFile(output);if(!original.equals(encoded))throw Error('introduction_index_conflict_preserved');exists=true;}
catch(e:any){if(e.code!=='ENOENT')throw e;}
if(!exists){
 // Same-directory staging: readers never observe a partial index. On a write
 // failure retain the staged file for diagnosis; never remove prior assets.
 const temporary=output+'.'+randomUUID()+'.pending';
 await writeFile(temporary,encoded,{flag:'wx'});
 // This fixed producer refuses an existing differing result above; it is not
 // a runtime update/deployment command or a concurrent publication service.
 try{await link(temporary,output);}
 catch(e:any){if(e.code!=='EEXIST'||!(await readFile(output)).equals(encoded))throw e;}
 // Only this successful, regenerable staging name is retired; failed staging
 // and all original publications stay available for investigation.
 await unlink(temporary);
}
if(!(await readFile(input)).equals(bytes))throw Error('introduction_source_changed_during_index_write');
console.log(JSON.stringify({status:exists?'INDEX_ALREADY_IDENTICAL':'INDEX_DERIVED',references:rows.size,
 bytes:encoded.length,sha256:digest(encoded),publicationUnchanged:true}));
