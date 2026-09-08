import { readFile } from 'node:fs/promises';
import { resolveOfficialCli, runOfficialProcess } from '../../../tools/miniapp/device-feedback-official.mjs';
const { project } = JSON.parse(await readFile(new URL('R25-native-fixture.json', import.meta.url), 'utf8'));
const cli = await resolveOfficialCli();
await runOfficialProcess(cli.file, [...cli.prefix, 'close', '--project', project], { cwd: cli.cwd, env: cli.env, timeout: 30000 });
console.log(JSON.stringify({ operation: 'close_exact_owned_fixture', invocation: 'completed', listenerClosure: 'must_reinspect' }));
