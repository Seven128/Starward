import { readFile } from 'node:fs/promises';
import { resolveOfficialCli, runOfficialProcess } from '../../../tools/miniapp/device-feedback-official.mjs';
const {project}=JSON.parse(await readFile(new URL('R25-native-fixture.json',import.meta.url),'utf8'));
const cli=await resolveOfficialCli();
await runOfficialProcess(cli.file,[...cli.prefix,'open','--project',project],{cwd:cli.cwd,env:cli.env,timeout:30000});
console.log(JSON.stringify({project,invocation:'completed',runtime:'not_yet_observed'}));
