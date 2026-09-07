import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../../../', import.meta.url);
async function edit(path, transform) {
  const url = new URL(path, root);
  const before = await readFile(url, 'utf8');
  const after = transform(before.replaceAll('\r\n', '\n'));
  if (after === before) return;
  await writeFile(url, after);
  console.log(`${path}: ${before.length} -> ${after.length} characters`);
}
function section(text, start, end, replacement) {
  const from = text.indexOf(start), to = text.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw Error(`missing section: ${start}`);
  return text.slice(0, from) + replacement + '\n\n' + text.slice(to);
}
await edit('project_context/development-workflow/authority-and-scope.md', text => {
  text = section(text, '## Selected Mini Program Design Authority', '## Ownership And Dependency Direction', `## UI Implementation

- Read the affected Screen Contract for page responsibilities and DESIGN.md for visual rules and generated token values. Implement through existing production components and state owners, then inspect actual WEAPP behavior.
- UI changes do not require prototypes, Open Design projects, selected snapshots, handoffs, resource hashes or regeneration of presentation packages. Update an owning Context only when a durable product decision changes.
- Test generated token consistency, meaningful state/interaction behavior and actual layout. Prototype fidelity and frozen-package integrity are not product checks.
- Preserve the independent Mini Program profile; App/Admin tokens and historical HTML are not runtime design inputs.`);
  return text.split('\n').filter(line => !line.startsWith('- Repository LF rules') && !line.startsWith('- Formal resource integrity')).join('\n').replace('selected-design routing', 'UI implementation');
});
await edit('project_context/areas/main/screen-contracts/wechat-miniapp.md', text => {
  text = section(text, '## Selected Design Adoption Record', '- The carrier is WEAPP-only', `## Design And Implementation Boundary

- DESIGN.md owns the independent Mini Program visual profile and tokens. This contract owns page, control, state and interaction meaning; production components own implementation.
- No prototype, selected resource, Open Design project, snapshot or hash needs to be created, read or synchronized for ordinary UI work. Verify the real WEAPP screens directly.
- Keep product-facing content relevant to the user's decision. Internal resource identifiers, review notes and development explanations do not belong in production UI. Isolated fixtures must remain identifiable as test data without repeated explanatory content.
- Reuse existing Taro/Starward component and icon owners. Adopt a library only when it fits these boundaries; do not introduce another icon, state or design system.`);
  return text.split('\n').filter(line => !line.startsWith('- The earlier formal handoff')).join('\n');
});
await edit('project_context/architecture.md', text => text.split('\n').filter(line => !/^- .*docs\/design-(?:resources|targets|system)\//.test(line)).join('\n'));
await edit('project_context/areas/main.md', text => text.split('\n').filter(line => !line.startsWith('- Legacy authored page/control targets:')).join('\n'));
await edit('project_context/product-profile.md', text => text.split('\n').map(line => line.startsWith('- `DESIGN.md` owns two independent active visual profiles:') ? '- DESIGN.md owns independent native App and Mini Program visual profiles. Screen Contracts own page responsibilities; production components consume the relevant profile. Provider map appearance remains outside app-owned visual rules. Prototype packages and historical selection records are not development inputs.' : line).join('\n'));
await edit('project_context/areas/main/screen-contracts/operations.md', text => text.split('\n').filter(line => !line.startsWith('- Operations visual archives:') && !line.startsWith('- Current screen/interaction resource:') && !line.startsWith('- Editable upstream is')).map(line => line.startsWith('- The Mini Program-specific demo Web console') ? '- Owner operations uses authenticated apps/admin-web, backed by server application services. tools/miniapp/admin-operations.mjs is the operational CLI. Update the real UI and verify authorized writes; no prototype snapshot is required.' : line).join('\n'));
await edit('project_context/areas/main/screen-contracts.md', text => {
  text = section(text, '## Visual Target Registry And Coverage Boundary', '## Verification Contract', `## Visual Ownership

- DESIGN.md owns the independent App and Mini Program visual profiles. The routed Screen Contracts own surface/control responsibilities, irrespective of retired prototype IDs.
- UI changes update production components and, only when necessary, their owning rules. Do not maintain a parallel prototype, target registry or resource-hash census.`);
  return text.split('\n').map(line => line.startsWith('- Design system and target checks:') || (line.startsWith('- ') && line.includes('must separately re-hash')) ? '- Design checks verify current generated tokens and relevant runtime behavior. Archived prototype hashes and package membership are not required.' : line).join('\n');
});
await edit('project_context/development-workflow/candidate-acceptance.md', text => text.split('\n').filter(line => !line.startsWith('- The active Field Signal system `selected-source/**`')).join('\n'));
await edit('project_context/context-maintenance.md', text => section(text, '## Design sources', 'The old package-internal compatibility overlay', `## Keep Context Small

- Preserve durable product decisions, boundaries, reasons and useful code/test entrypoints. Do not copy code, task progress, artifact inventories, hashes or historic selection narratives into Context.
- DESIGN.md and Screen Contracts are the UI inputs. Prototype HTML, Open Design projects, presentation kits and selected-resource packages are retired from the development workflow; ordinary UI changes require no synchronized design artifacts or handoffs.
- Generated production tokens and actual icons remain useful build inputs. Their reproducible generation and runtime checks remain; remove dependencies on display-only prototypes rather than keeping the prototypes merely to satisfy an obsolete checker.
- Task-local notes and runtime evidence stay outside Context. Historical records needed for investigation can be retrieved from Git, not loaded as current authority.`));
