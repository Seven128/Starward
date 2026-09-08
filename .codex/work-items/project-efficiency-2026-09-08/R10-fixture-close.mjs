import { resolveOfficialCli, runOfficialProcess } from "../../../tools/miniapp/device-feedback-official.mjs";
const cli = await resolveOfficialCli();
await runOfficialProcess(cli.file, [...cli.prefix, "close", "--project", "C:/Users/777/AppData/Local/Temp/starward-device-feedback-fixture-e5844U"], {
  cwd: cli.cwd, env: cli.env, timeout: 15000,
});
console.log(JSON.stringify({ ownedFixtureCloseRequested: true }));
