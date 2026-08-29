import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const repository = path.resolve(import.meta.dirname, "../..");

const definitions = [
  {
    name: "starward-wechat-device-verification",
    requiredReferences: [
      "project_context/development-workflow.md",
      "project_context/areas/main/verification/wechat-device.md",
      "project_context/areas/main/verification/development-loop.md",
      "package.json",
    ],
    requiredMeanings: [
      "Development Device Feedback",
      "Settled-Candidate Device Verification",
      "development_feedback",
      "preview --feedback <run>",
      "remote --session <directory>",
      "official_update_completed",
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
    requiredMeanings: [
      "Owner IP trial",
      "Staging",
      "Production",
      "WeChat preview",
      "WeChat upload",
      "public release",
    ],
  },
];

for (const definition of definitions) {
  test(`${definition.name} stays a valid project-local router with live references`, async () => {
    const skill = path.join(repository, ".codex", "skills", definition.name);
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
    for (const meaning of definition.requiredMeanings) assert.ok(source.includes(meaning));
  });
}

test("device verification and release remain separate Skills", async () => {
  const [device, release] = await Promise.all(
    definitions.map(({ name }) =>
      readFile(
        path.join(repository, ".codex", "skills", name, "SKILL.md"),
        "utf8",
      ),
    ),
  );
  assert.doesNotMatch(device, /deployment:release|deployment:promote/u);
  assert.doesNotMatch(release, /capture-location|capture-permissions|--x <0\.\.1>/u);
});
