import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkedFile, contained, readJson, secretIssues, isInside } from './resource-utils.mjs';

export async function preflight(directory) {
  const errors = [], warnings = [];
  let run;
  try {
    directory = await fs.realpath(directory);
    run = await readJson(await contained(directory, 'run.json'));
    errors.push(...secretIssues(run));
    if (run.schema !== 1 || !/^[a-zA-Z0-9_-]+$/.test(run.runId ?? '')) errors.push('invalid run schema/id');
    if (!path.isAbsolute(run.repository ?? '')) throw Error('repository must be absolute');
    const repo = await fs.realpath(run.repository);
    if (!isInside(repo, directory) || directory === repo) errors.push('run directory must be inside repository');
    for (const key of ['executionHead','researchHead']) if (!/^[a-f0-9]{40}$/.test(run[key] ?? '')) errors.push(`missing ${key}`);
    if (!Number.isFinite(Date.parse(run.startedAt))) errors.push('invalid start time');
    if (!run.model?.id || !run.model?.effort || !run.model?.source) errors.push('missing model provenance');
    if (run.model?.id === 'unknown') warnings.push('model unknown; not a same-model reproduction');
    for (const version of ['codex','node','runtime']) if (!run.versions?.[version]) errors.push(`missing ${version} version`);
    if (!run.runtime?.path || !['unverified','available','failed'].includes(run.runtime?.status)) errors.push('invalid runtime record');
    if (run.runtime?.status !== 'available') warnings.push('real Figma probe has not passed');
    if (!Array.isArray(run.failures)) errors.push('failures must be an array');
    for (const key of ['inputTokens','outputTokens']) {
      const value = run.usage?.[key];
      if (value !== null && (!Number.isInteger(value) || value < 0)) errors.push(`invalid usage ${key}`);
      if (value === null && !run.usage?.reason) errors.push('unknown usage needs reason');
    }
    if (run.manualInterventions !== null && (!Number.isInteger(run.manualInterventions) || run.manualInterventions < 0)) errors.push('invalid manual interventions');
    if (!Array.isArray(run.sourceFiles) || !run.sourceFiles.length) errors.push('sourceFiles missing');
    for (const source of run.sourceFiles ?? []) {
      try { await checkedFile(repo, source); } catch (error) { errors.push(`source ${source.path}: ${error.message}`); }
    }
    const entries = await fs.readdir(directory, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      const file = path.join(entry.parentPath, entry.name);
      await contained(directory, path.relative(directory, file));
      if (entry.isFile() && /\.(?:ttf|otf|woff2?|pfx|pem|key)$/i.test(entry.name)) errors.push(`forbidden font/credential file: ${entry.name}`);
      if (entry.isFile() && /\.(?:json|md|html|[cm]?js|yaml|txt)$/i.test(entry.name)) {
        const text = await fs.readFile(file, 'utf8');
        errors.push(...secretIssues(text).map(message => `${entry.name}: ${message}`));
      }
    }
  } catch (error) { errors.push(error.message); }
  return { ok: errors.length === 0, errors, warnings, run };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const {run, ...result} = await preflight(process.argv[2] ?? '.');
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
