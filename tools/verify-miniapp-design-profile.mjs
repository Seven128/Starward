import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readDesignTokens, renderDesignTokens } from './miniapp/generate-design-tokens.mjs';
import { contrastRatio } from './verify-miniapp-design-support.mjs';

// Validate actual production tokens, not retired prototype identities.
export async function verifyMiniappDesignProfile({ root, design }) {
  const tokens = readDesignTokens(design);
  for (const [relative, expected] of renderDesignTokens(tokens)) {
    assert.equal(await readFile(path.join(root, relative), 'utf8'), expected, `generated token drift: ${relative}`);
  }
  let contrastPairs = 0;
  for (const [mode, theme] of Object.entries(tokens.themes)) {
    for (const role of ['text-primary', 'text-secondary', 'text-tertiary']) {
      assert(contrastRatio(theme[role], theme.canvas) >= 4.5, `${mode}/${role} contrast below 4.5`);
      contrastPairs++;
    }
    assert(contrastRatio(theme['choice-selected-label'], theme['choice-selected-surface']) >= 4.5, `${mode}/selected label contrast`);
    contrastPairs++;
  }
  const palette = new Set(['#000000', '#110000', '#190000', '#240000', '#5b1712', '#7a1e18', '#a83229', '#c23d32', '#d84a3c', '#ff6b58']);
  for (const [role, value] of Object.entries(tokens.themes.observation)) {
    for (const match of value.matchAll(/#[0-9a-f]{6}/gi)) {
      assert(palette.has(match[0].toLowerCase()), `observation palette escape: ${role}`);
    }
  }
  assert(contrastRatio(tokens.themes.observation['border-strong'], tokens.themes.observation.canvas) >= 3, 'observation control boundary contrast');
  assert.equal(tokens.themes.observation['elevation-floating'], 'none');
  return { source: 'DESIGN.md', generated_files: 2, modes: Object.keys(tokens.themes), contrast_pairs: contrastPairs + 1, touch_target: tokens.geometry['target-min'], limitations: 'Token consistency and contrast only; layout and interaction require runtime verification.' };
}
