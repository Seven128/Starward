import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const full = () => ({ product: true, context: true });

// Only known non-executable documentation is cheap. Unknown paths, design
// inputs, dependencies and workflow changes deliberately retain product checks.
export function affectedChecks(files) {
  if (!files.length) return full();
  let product = false;
  let context = false;
  for (const file of files) {
    if (file === "README.md") continue;
    if (file === "AGENTS.md" || /^project_context\//u.test(file) ||
        /^\.codex\/skills\/.*\.(?:md|ya?ml)$/u.test(file) ||
        /^\.codex\/work-items\//u.test(file)) {
      context = true;
    } else {
      product = true;
      // The lightweight job also checks live workflow/source references. An
      // unknown executable input can affect them, so full changes retain both.
      context = true;
    }
  }
  return { product, context };
}

export function checksForEvent(eventName, event, git = (...args) => execFileSync("git", args, { encoding: "utf8" })) {
  try {
    let base, head;
    if (eventName === "pull_request") {
      base = event.pull_request?.base?.sha;
      head = event.pull_request?.head?.sha;
    } else if (eventName === "push") {
      base = event.before;
      head = event.after;
    } else return full();
    const valid = value => typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value) && !/^0+$/u.test(value);
    if (!valid(base) || !valid(head)) return full();
    if (eventName === "pull_request") base = git("merge-base", base, head).trim();
    const files = git("diff", "--name-only", "--no-renames", "-z", base, head).split("\0").filter(Boolean);
    return affectedChecks(files);
  } catch {
    return full();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let selected = full();
  try { selected = checksForEvent(process.env.GITHUB_EVENT_NAME, JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))); } catch { /* Missing diff evidence runs every check. */ }
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `product=${selected.product}\ncontext=${selected.context}\n`);
  console.log(JSON.stringify(selected));
}
