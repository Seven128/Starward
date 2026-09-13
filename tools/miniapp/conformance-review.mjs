import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(modulePath), "../..");
export const REVIEW_SCHEMA = "starward-miniapp-review-notes-v2";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => { throw new Error(`miniapp_review_${reason}`); };
const hasText = (value) => typeof value === "string" && value.trim() !== "";

function localPath(root, input) {
  if (!hasText(input)) fail("path_required");
  const absolute = path.resolve(root, input);
  const relative = path.relative(root, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    fail("path_outside_repository");
  return { absolute, relative: relative.replaceAll("\\", "/") };
}

async function identity(root, input) {
  const resolved = localPath(root, input);
  return { path: resolved.relative, sha256: digest(await readFile(resolved.absolute)) };
}

// Records explicitly selected files only. Following adopted-entry links and
// deciding whether evidence is sufficient remain review responsibilities.
export async function createReviewNotes({
  scope, authorityPaths, evidencePaths = [], sessionPath = null,
  repositoryRoot = defaultRoot,
}) {
  if (!hasText(scope)) fail("scope_required");
  if (!Array.isArray(authorityPaths) || !authorityPaths.length) fail("authority_required");
  const capture = async (paths) => Promise.all(
    [...new Set(paths)].sort().map((file) => identity(repositoryRoot, file)),
  );
  const session = sessionPath ? await identity(repositoryRoot, sessionPath) : null;
  // Failed/partial sessions are useful investigation evidence too.
  if (session) JSON.parse(await readFile(localPath(repositoryRoot, session.path).absolute, "utf8"));
  return {
    schema_version: REVIEW_SCHEMA,
    scope,
    references: await capture(authorityPaths),
    evidence: await capture(evidencePaths),
    session,
    reviewer: null,
    observations: [],
  };
}

async function changedFiles(root, entries) {
  const changed = [];
  for (const entry of entries) {
    if (!entry || !hasText(entry.path) || !/^[a-f0-9]{64}$/u.test(entry.sha256 ?? ""))
      fail("file_identity_invalid");
    const resolved = localPath(root, entry.path);
    try {
      if (digest(await readFile(resolved.absolute)) !== entry.sha256)
        changed.push(resolved.relative);
    } catch (error) {
      if (["ENOENT", "EISDIR", "ENOTDIR"].includes(error.code)) changed.push(resolved.relative);
      else throw error;
    }
  }
  return changed;
}

async function candidateApplicability(root, session, changedInputs) {
  if (!session) return { state: "undetermined", reason: "no_candidate_session" };
  if (changedInputs.includes(session.path))
    return { state: "undetermined", reason: "session_changed_or_missing" };
  const recorded = JSON.parse(await readFile(localPath(root, session.path).absolute, "utf8"));
  const files = recorded.candidate_after?.files;
  if (!files || !Object.keys(files).length)
    return { state: "undetermined", reason: "no_recorded_source_manifest" };
  const different = await changedFiles(root, Object.entries(files).map(
    ([file, sha256]) => ({ path: file, sha256 }),
  ));
  return {
    state: different.length ? "different" : "undetermined",
    reason: different.length ? "recorded_source_files_changed" : "recorded_files_match_but_full_candidate_not_revalidated",
    recorded_candidate_sha256: recorded.candidate_after.sha256 ?? null,
    changed_files: different,
  };
}

export async function inspectReviewNotes({ review, repositoryRoot = defaultRoot }) {
  if (review?.schema_version !== REVIEW_SCHEMA) fail("schema_invalid");
  if (!hasText(review.scope)) fail("scope_required");
  if (!Array.isArray(review.references) || !review.references.length ||
      !Array.isArray(review.evidence) || !Array.isArray(review.observations))
    fail("record_shape_invalid");
  const refs = new Set(review.references.map((entry) => entry.path));
  const evidence = new Set(review.evidence.map((entry) => entry.path));
  if (review.session) evidence.add(review.session.path);
  if (review.observations.length && (!hasText(review.reviewer?.identity) ||
      !hasText(review.reviewer?.method) ||
      !hasText(review.reviewer?.reviewed_at) ||
      !Number.isFinite(Date.parse(review.reviewer.reviewed_at))))
    fail("reviewer_required");
  for (const item of review.observations) {
    if (!hasText(item.claim) ||
        !["passed", "failed", "unverified", "not_comparable"].includes(item.verdict) ||
        !hasText(item.observed) || !Array.isArray(item.reference_paths) ||
        !item.reference_paths.length || !Array.isArray(item.evidence_paths))
      fail("observation_invalid");
    if (item.reference_paths.some((file) => !refs.has(file)) ||
        item.evidence_paths.some((file) => !evidence.has(file)))
      fail("observation_reference_unbound");
    if (["passed", "failed"].includes(item.verdict) && !item.evidence_paths.length)
      fail("judgment_evidence_required");
    if (item.verdict !== "passed" && !hasText(item.next_action))
      fail("unresolved_next_action_required");
  }
  const changed = await changedFiles(repositoryRoot, [
    ...review.references, ...review.evidence, ...(review.session ? [review.session] : []),
  ]);
  const applicability = await candidateApplicability(repositoryRoot, review.session, changed);
  // Surface actions from existing facts; this is not a completeness detector.
  // An omitted obligation or a false reviewer judgment cannot be inferred here.
  const followUp = review.observations
    .filter((item) => item.verdict !== "passed")
    .map(({ claim, verdict, next_action }) => ({
      reason: "unresolved_observation", claim, verdict, next_action,
    }));
  if (!review.observations.length) followUp.push({
    reason: "no_recorded_review",
    next_action: "Compare the relevant requirements and actual outputs before recording a conclusion.",
  });
  if (changed.length) followUp.push({
    reason: "bound_inputs_changed", paths: changed,
    next_action: "Revisit conclusions depending on changed inputs; retain unrelated applicable observations.",
  });
  if (applicability.state === "different") followUp.push({
    reason: "recorded_candidate_different", paths: applicability.changed_files,
    next_action: "Obtain current evidence for affected conclusions; historical passes do not apply automatically.",
  });
  return {
    record_validity: "valid",
    review_state: review.observations.length ? "reviewed" : "unreviewed",
    reviewer: review.reviewer,
    follow_up: followUp,
    bound_inputs: { state: changed.length ? "changed" : "unchanged", changed_files: changed },
    candidate_applicability: applicability,
    scope: review.scope,
    recorded_observations: review.observations,
    product_acceptance: "not_assessed_by_tool",
    limitation: "Follow-up lists only recorded gaps and detected file drift; an empty list is not completion. File integrity and reviewer declarations do not establish adoption, review quality or independence, coverage, current build equivalence or product acceptance.",
  };
}

async function main(args) {
  const [command, ...rest] = args;
  if (command === "help" && !rest.length) {
    process.stdout.write(
      "Optional review notes (not an acceptance gate).\n" +
      "prepare --scope <review scope> --authority <file> [--authority <file>] [--evidence <file>] [--session <json>] --output <new json>\n" +
      "inspect --review <json>\n" +
      "Add reviewer {identity, method, reviewed_at} and observations {claim, verdict, observed, reference_paths, evidence_paths, next_action}.\n" +
      "inspect exposes the declared reviewer and follow_up for unresolved observations or changed inputs. Empty follow_up does not mean complete coverage or acceptance.\n" +
      "inspect exits 0 for a valid record, including failed/unverified/historical judgments; it never certifies product acceptance.\n",
    );
    return;
  }
  const allowed = command === "prepare"
    ? ["--scope", "--authority", "--evidence", "--session", "--output"]
    : command === "inspect" ? ["--review"] : [];
  if (!allowed.length) fail("command_invalid");
  const values = new Map();
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i], value = rest[i + 1];
    if (!allowed.includes(key) || !hasText(value) || value.startsWith("--"))
      fail("argument_invalid");
    if (values.has(key) && !["--authority", "--evidence"].includes(key))
      fail("argument_duplicate");
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  const one = (key) => values.get(key)?.[0];
  if (command === "prepare") {
    const record = await createReviewNotes({
      scope: one("--scope"), authorityPaths: values.get("--authority"),
      evidencePaths: values.get("--evidence"), sessionPath: one("--session"),
    });
    const output = localPath(defaultRoot, one("--output"));
    await writeFile(output.absolute, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`${JSON.stringify({ record: output.relative, review_state: "unreviewed" })}\n`);
  } else {
    const file = localPath(defaultRoot, one("--review"));
    const result = await inspectReviewNotes({ review: JSON.parse(await readFile(file.absolute, "utf8")) });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(modulePath))
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
