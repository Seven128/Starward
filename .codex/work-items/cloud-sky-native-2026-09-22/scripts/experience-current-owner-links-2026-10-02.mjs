// Local Markdown destination existence in the current edited owners/evidence.
// This does not certify anchors, remote sources, source facts or product quality.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const files=['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md',
  'evidence/experience-sdss-gri-tan-candidate-2026-10-02.md',
  'evidence/experience-sdss-gri-tan-independent-review-2026-10-02.md',
  'evidence/experience-sdss-m51-field-geometry-2026-10-02.md',
  'evidence/experience-sdss-m51-mosaic-independent-review-2026-10-02.md',
  'evidence/experience-sdss-candidate-composition-2026-10-02.md',
  'evidence/experience-sdss-complete-inputs-2026-10-02.md',
  'evidence/experience-sdss-astrans-approximation-audit-2026-10-02.md'].map(file=>task+file);
files.push('project_context/architecture/runtime-and-domain.md','project_context/external-capabilities.md',
  'project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md',
  'data-pipelines/deep-sky/README.md');
files.push(...process.argv.slice(2));
const missing=[];let localLinks=0;
for(const file of files){
  const source=await fs.readFile(file,'utf8');
  for(const match of source.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g)){
    const target=match[1].replace(/^<|>$/g,'').split('#')[0];
    if(!target || /^[a-z][a-z0-9+.-]*:/i.test(target))continue;
    const resolved=path.resolve(path.dirname(file),decodeURIComponent(target));localLinks++;
    if(!await fs.access(resolved).then(()=>true,()=>false))missing.push({file,target});
  }
}
console.log(JSON.stringify({scope:'Local destinations only; no anchor/source/runtime/quality acceptance',files,localLinks,missing}));
assert.equal(missing.length,0);
