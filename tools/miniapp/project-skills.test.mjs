import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const repository = path.resolve(import.meta.dirname, "../..");

const definitions = [
  {
    name: "starward-interaction-design",
    directory: "uiux_design",
    requiredReferences: [
      "project_context/global.md",
      "project_context/areas/main/screen-contracts/wechat-miniapp.md",
      "project_context/development-workflow/development-feedback.md",
      "AGENTS.md",
    ],
  },
  {
    name: "starward-wechat-device-verification",
    requiredReferences: [
      "project_context/development-workflow.md",
      "project_context/areas/main/verification/wechat-device.md",
      "project_context/areas/main/verification/development-loop.md",
      "package.json",
    ],
  },
  {
    name: "starward-miniapp-release",
    requiredReferences: [
      "project_context/deployment.md",
      "project_context/development-workflow.md",
      "infrastructure/deployment/README.md",
      "package.json",
    ],
  },
];

for (const definition of definitions) {
  test(`${definition.name} stays a valid project-local router with live references`, async () => {
    const skill = path.join(
      repository,
      ".codex",
      "skills",
      definition.directory ?? definition.name,
    );
    const source = await readFile(path.join(skill, "SKILL.md"), "utf8");
    const interfaceYaml = await readFile(
      path.join(skill, "agents", "openai.yaml"),
      "utf8",
    );
    const normalizedInterfaceYaml = interfaceYaml.replaceAll("\r\n", "\n");

    assert.match(source, new RegExp(`^---\\nname: ${definition.name}\\n`, "u"));
    assert.doesNotMatch(source, /\[TODO:/u);
    assert.match(normalizedInterfaceYaml, /^interface:\n/u);
    const interfaceLines = normalizedInterfaceYaml.trim().split("\n").slice(1);
    const defaultPrompt = interfaceLines.find((line) =>
      line.startsWith("  default_prompt: "),
    );
    assert.ok(defaultPrompt?.includes(`$${definition.name}`));
    for (const line of interfaceLines)
      assert.match(line, /^  [a-z_]+: "(?:[^"\\]|\\.)*"$/u);

    for (const reference of definition.requiredReferences) {
      assert.match(source, new RegExp(reference.replaceAll("/", "\\/"), "u"));
      await access(path.join(repository, ...reference.split("/")));
    }
  });
}
