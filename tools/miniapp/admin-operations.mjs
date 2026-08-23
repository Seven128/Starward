import { createAdminRequest } from "./admin-operations-client.mjs";
import { runAdminCommand } from "./admin-operations-commands.mjs";

const argv = process.argv.slice(2);
const command = argv.shift() ?? "help";

function option(name, fallback = null) {
  const index = argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`admin_option_${name}_missing`);
  argv.splice(index, 2);
  return value;
}

function positional(label) {
  const value = argv.shift();
  if (!value || value.startsWith("--"))
    throw new Error(`admin_${label}_missing`);
  return value;
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp() {
  process.stdout.write(`今晚去观星管理员操作（仅 API/CLI，无 Web 运营台）

环境：MINIAPP_ADMIN_TOKEN（必填），MINIAPP_ADMIN_BASE_URL、MINIAPP_ADMIN_ACTOR（可选）

命令：
  dashboard
  moderation
  case-export <caseId> --out <private-json-path>
  media <uploadId> --out <private-image-path>
  resolve <caseId> <APPROVED|REJECTED> --reason <text>
  merge <caseId> <spotId> --claims <comma-list> --reason <text>
  candidate-create --input <json> --reason <text>
  spot-patch <spotId> --input <json> --reason <text>

token 不接受命令行参数，避免进入 shell 历史。case-export 与 media 使用独占新文件，避免覆盖已有证据。
`);
}

async function main() {
  if (command === "help") {
    printHelp();
    return;
  }
  const baseUrl = String(
    option(
      "base",
      process.env.MINIAPP_ADMIN_BASE_URL ?? "http://127.0.0.1:8788",
    ),
  ).replace(/\/$/u, "");
  const actor = String(
    option("actor", process.env.MINIAPP_ADMIN_ACTOR ?? "admin:local"),
  );
  const token = process.env.MINIAPP_ADMIN_TOKEN?.trim() ?? "";
  const request = createAdminRequest({ baseUrl, actor, token });
  await runAdminCommand(command, { positional, option, request, output });
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
