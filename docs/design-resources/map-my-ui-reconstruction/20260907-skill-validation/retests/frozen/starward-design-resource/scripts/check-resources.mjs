import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { preflight } from './preflight.mjs';
import { checkedFile, contained, readJson, secretIssues, flatten, decodePng } from './resource-utils.mjs';

export async function checkResources(directory) {
  const check = await preflight(directory), errors = [...check.errors];
  let resources;
  try {
    resources = await readJson(await contained(directory, 'resources.json'));
    errors.push(...secretIssues(resources));
    if (resources.schema !== 1 || !Array.isArray(resources.boards) || !resources.boards.length) throw Error('no exported boards');
    const requirements = await readJson(await contained(directory, 'requirements.json'));
    if (!Array.isArray(requirements.rules) || !requirements.rules.length) throw Error('missing frozen control requirements');
    const assetIds = new Set();
    for (const asset of resources.assets ?? []) {
      if (!asset.id || assetIds.has(asset.id) || !asset.source || !asset.license) errors.push('invalid/duplicate asset or missing source/license');
      assetIds.add(asset.id);
      await checkedFile(directory, asset);
    }
    const ids = new Set(), mappings = new Set();
    for (const board of resources.boards) {
      const startErrors = errors.length;
      try {
        if (!board.id || ids.has(board.id)) throw Error('duplicate/missing board id');
        ids.add(board.id);
        const map = `${board.fileKey}/${board.nodeId}/${board.revision}`;
        if (mappings.has(map)) throw Error('duplicate node mapping in same revision');
        mappings.add(map);
        if (!board.candidateId || !board.state || !['map','my','probe','components'].includes(board.page)) throw Error('missing candidate/page/state');
        if (!['day','night','observation'].includes(board.mode)) throw Error('invalid mode');
        if (![1,2].includes(board.scale) || ![0,1,2].includes(board.round) || !board.revision || !board.fileKey || !board.nodeId) throw Error('invalid scale/round/revision/locator');
        if (!Number.isFinite(board.width) || !Number.isFinite(board.height) || board.width <= 0 || board.height <= 0) throw Error('invalid dimensions');
        if (board.screenshot?.revision !== board.revision || board.snapshot?.revision !== board.revision) throw Error('stale screenshot/snapshot');
        const png = decodePng(await checkedFile(directory, board.screenshot));
        if (png.width !== Math.round(board.width * board.scale) || png.height !== Math.round(board.height * board.scale)) throw Error('PNG dimensions mismatch');
        const snapshot = JSON.parse((await checkedFile(directory, board.snapshot)).toString('utf8'));
        errors.push(...secretIssues(snapshot));
        if (snapshot.schema !== 1 || snapshot.origin !== 'figma-plugin-api' || snapshot.revision !== board.revision || snapshot.fileKey !== board.fileKey || !Number.isFinite(Date.parse(snapshot.capturedAt))) throw Error('snapshot provenance/revision mismatch');
        const root = snapshot.root;
        if (root?.id !== board.nodeId || root.width !== board.width || root.height !== board.height || !['FRAME','COMPONENT','INSTANCE'].includes(root.type)) throw Error('root identity/dimensions/type mismatch');
        const nodes = flatten(root), nodeIds = new Set();
        for (const node of nodes) {
          if (!node.id || nodeIds.has(node.id)) throw Error('duplicate/missing readback node ID');
          nodeIds.add(node.id);
          if (node.type === 'TEXT' && node.effectiveVisible && node.characters && (!node.fontName || !Number.isFinite(node.fontSize))) throw Error('missing resolved font');
          if (node.type === 'TEXT' && node.effectiveVisible && node.visibleFraction < 0.98) throw Error('visible text clipped by ancestor');
          if (node.controlKey && node.effectiveVisible && (node.visibleFraction < 0.98 || node.width < 44 || node.height < 44)) throw Error('control clipped or smaller than 44px');
        }
        if (!nodes.some(n => n.type === 'TEXT' && n.effectiveVisible && n.characters)) throw Error('no editable visible text');
        const matching = requirements.rules.filter(rule => (!rule.page || rule.page === board.page) && (!rule.state || rule.state === board.state) && (!rule.mode || rule.mode === board.mode));
        if (!matching.length) throw Error('no independent requirement rule for board');
        const controls = new Set(nodes.filter(n => n.effectiveVisible && ['FRAME','COMPONENT','INSTANCE','TEXT','GROUP'].includes(n.type) && n.width > 0 && n.height > 0).map(n => n.controlKey).filter(Boolean));
        for (const key of new Set([...matching.flatMap(rule=>rule.controls ?? []), ...(board.controls ?? [])])) if (!controls.has(key)) errors.push(`missing readback control ${key}`);
        for (const rule of matching) for (const key of rule.forbidden ?? []) if (controls.has(key)) errors.push(`forbidden control ${key}`);
        if (!Array.isArray(board.codeOwners) || !board.codeOwners.length) throw Error('missing code owner');
        for (const owner of board.codeOwners) await contained(check.run.repository, owner);
        for (const asset of board.assetIds ?? []) if (!assetIds.has(asset)) errors.push('missing referenced asset');
      } catch (error) { errors.push(error.message); }
      for (let n = startErrors; n < errors.length; n++) errors[n] = `${board.id ?? 'board'}: ${errors[n]}`;
    }
  } catch (error) { errors.push(error.message); }
  // Product/geometry failures remain visible in comparison. Only a broken or
  // untraceable resource prevents loading the package itself.
  const reviewable=Boolean(resources?.boards?.length) && errors.every(error=>/^[^:]+: (?:missing readback control |forbidden control |visible text clipped by ancestor|control clipped or smaller than 44px)/.test(error));
  return { ok: errors.length === 0, reviewable, errors, warnings: check.warnings, boardCount: resources?.boards?.length ?? 0 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await checkResources(process.argv[2] ?? '.');
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
