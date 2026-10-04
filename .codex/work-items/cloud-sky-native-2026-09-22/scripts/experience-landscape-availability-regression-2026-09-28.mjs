// Task-local bounded mutation. Run only without a source watcher/build.
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const source=path.join(root,"apps/wechat-miniapp/src/features/sky/sky-scene-render.ts");
const original=await readFile(source);
const needle="landscape.availability?.(available);";
if(original.toString().split(needle).length!==2)throw new Error("unique_mutation_required");
const mutated=Buffer.from(original.toString().replace(needle,"if (!available) landscape.availability?.(false);"));
const check=()=>spawnSync(process.execPath,["tools/run-node.cjs","--import","tsx","--test",
  "apps/wechat-miniapp/src/features/sky/sky-landscape.test.ts"],
  {cwd:root,encoding:"utf8",timeout:20000,maxBuffer:2*1024*1024,windowsHide:true});
const logRoot=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
let rejected;
await writeFile(source,mutated);
try {
  rejected=check();
  await writeFile(path.join(logRoot,"experience-landscape-stale-availability-mutation-2026-09-28.log"),
    (rejected.stdout??"")+(rejected.stderr??""),{flag:"wx"});
  if(rejected.error||rejected.signal||rejected.status===0||
    !((rejected.stdout??"")+(rejected.stderr??"")).includes("AssertionError"))
    throw new Error("availability_regression_not_demonstrated");
} finally {
  if(!(await readFile(source)).equals(mutated))throw new Error("source_changed_during_mutation");
  await writeFile(source,original);
}
if(!(await readFile(source)).equals(original))throw new Error("exact_restore_failed");
const restored=check();
await writeFile(path.join(logRoot,"experience-landscape-availability-restored-2026-09-28.log"),
  (restored.stdout??"")+(restored.stderr??""),{flag:"wx"});
if(restored.error||restored.signal||restored.status!==0)throw new Error("restored_regression_failed");
console.log(JSON.stringify({mutationExit:rejected.status,restoredExit:restored.status,sourceRestored:true}));
