import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expectedPreviewFiles = ['contribution.html', 'foundations.html', 'my-plan-settings.html', 'spot-detail.html', 'spot-night.html'];
const actualPreviewFiles = fs.readdirSync(path.join(root, 'preview')).filter((file) => file.endsWith('.html')).sort();
const htmlFiles = ['index.html', ...actualPreviewFiles.map((file) => `preview/${file}`)];
const required = ['DESIGN.md', 'tokens.scss', 'colors_and_type.css', 'README.md', 'SKILL.md', 'preview/shared.css', 'preview/shared.js', 'context/provenance.md', 'context/provenance.json', ...htmlFiles];
const errors = [];

if (!fs.existsSync(path.join(root, 'verify.mjs'))) errors.push('missing: verify.mjs');

if (JSON.stringify(actualPreviewFiles) !== JSON.stringify(expectedPreviewFiles)) {
  errors.push(`unexpected preview set: ${actualPreviewFiles.join(', ')}`);
}

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing: ${file}`);
}

for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes('</html>')) errors.push(`unclosed html: ${file}`);
  if (/\{\{[^}]+\}\}|lorem ipsum|Loading Starward/i.test(source)) errors.push(`placeholder: ${file}`);
  if (/https?:\/\//i.test(source)) errors.push(`external URL: ${file}`);
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`duplicate ids: ${file} -> ${[...new Set(duplicateIds)].join(', ')}`);
  for (const match of source.matchAll(/aria-controls="([^"]+)"/g)) {
    if (!ids.includes(match[1])) errors.push(`aria-controls target missing: ${file} -> ${match[1]}`);
  }
  const refs = [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]).filter((ref) => !ref.startsWith('#'));
  for (const ref of refs) {
    const clean = ref.split('#')[0];
    const target = path.resolve(path.dirname(path.join(root, file)), clean);
    if (!fs.existsSync(target)) errors.push(`broken ref: ${file} -> ${ref}`);
  }
}

const allText = required.filter((file) => fs.existsSync(path.join(root, file))).map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
if (/AssistantsList|MessageBubble|ChatArea|InputBar|Loading Starward/i.test(allText)) errors.push('generic chat scaffold remains');

for (const legacyRoot of ['src', 'ui_kits']) {
  const target = path.join(root, legacyRoot);
  if (fs.existsSync(target)) errors.push(`legacy scaffold directory remains: ${legacyRoot}`);
}

const design = fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8');
const scss = fs.readFileSync(path.join(root, 'tokens.scss'), 'utf8');
const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
if (!/状态：\*\*未选择候选\*\*/.test(design) || !/不代表已选择、已采用、已实现或生产合规/.test(design)) errors.push('DESIGN.md candidate boundary missing');
if (!/Unselected candidate/.test(scss)) errors.push('tokens.scss candidate boundary missing');
if (!/unselected candidate/.test(skill) || !/fixed 14-family semantic taxonomy/.test(skill) || !/92×48rpx visible track/.test(skill)) errors.push('candidate SKILL boundary or durable occupancy rules missing');

const css = fs.readFileSync(path.join(root, 'colors_and_type.css'), 'utf8');
if (!/Candidate only; not adopted authority/.test(css)) errors.push('colors_and_type.css candidate boundary missing');

const handbook = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const handbookSections = [
  'handbook-overview',
  'principles',
  'color-modes',
  'type-icons',
  'spacing-layout',
  'mobile-baseline',
  'radius-elevation',
  'components',
  'motion',
  'dense-states',
  'accessibility',
  'integration',
  'application-validation'
];
const actualHandbookSections = [...handbook.matchAll(/<section id="([^"]+)" class="[^"]*handbook-section[^"]*"[^>]*data-handbook-section/g)].map((match) => match[1]);
if (JSON.stringify(actualHandbookSections) !== JSON.stringify(handbookSections)) {
  errors.push(`unexpected handbook section inventory: ${actualHandbookSections.join(', ')}`);
}
let previousSectionPosition = -1;
for (const id of handbookSections) {
  const position = handbook.indexOf(`id="${id}"`);
  if (position < 0) errors.push(`handbook section missing: ${id}`);
  else if (position <= previousSectionPosition) errors.push(`handbook section out of order: ${id}`);
  previousSectionPosition = Math.max(previousSectionPosition, position);
  if (!handbook.includes(`href="#${id}"`)) errors.push(`handbook navigation link missing: ${id}`);
}

if (!/Starward 微信小程序设计系统手册/.test(handbook)) errors.push('handbook identity missing');
if (!/未选择候选 · 非生产实现/.test(handbook)) errors.push('handbook candidate boundary missing');
if (!/user:starward-mini-program-sky-canvas-field-signal-revision/.test(handbook)) errors.push('handbook candidate id missing');
if (!/sha256:eb3d6c5cb2b498195e61b410727e9c93b28c52c502b331e08ec02ada9766b5b2/.test(handbook)) errors.push('handbook authority closure missing');
if (!/target\.system\.wechat-miniapp-sky-canvas-2026-08-25/.test(handbook)) errors.push('handbook target missing');
if (/id="representative-scenes"|代表性非地图场景/.test(handbook)) errors.push('prototype gallery still presented as primary handbook content');

const validationPosition = handbook.indexOf('id="application-validation"');
for (const href of ['preview/spot-detail.html', 'preview/spot-night.html', 'preview/contribution.html', 'preview/my-plan-settings.html']) {
  const linkPosition = handbook.indexOf(`href="${href}"`);
  if (linkPosition < validationPosition) errors.push(`product preview link appears before application validation: ${href}`);
}

const baseComponentFamilies = [
  'buttons', 'search-field', 'text-input', 'checkbox-group', 'radio-group', 'switch', 'choice-bar',
  'list-cell', 'badge-status', 'cards-containment', 'progress-loading', 'recovery-states', 'toast-snackbar', 'dialog-bottom-sheet'
];
const domainComponentFamilies = ['decision-summary', 'observing-window-risk', 'time-data', 'freshness-disclosure', 'system-states'];
for (const family of [...baseComponentFamilies, ...domainComponentFamilies]) {
  if (!handbook.includes(`data-component-family="${family}"`)) errors.push(`component family missing: ${family}`);
}
const renderedBaseFamilies = [...handbook.matchAll(/data-component-family="([^"]+)"/g)].map((match) => match[1]).filter((family) => baseComponentFamilies.includes(family));
if (renderedBaseFamilies.length !== 14 || new Set(renderedBaseFamilies).size !== 14 || !/14 个语义家族/.test(handbook)) {
  errors.push(`base component directory must contain exactly 14 unique semantic families: ${renderedBaseFamilies.join(', ')}`);
}
for (const genericFamily of ['inputs', 'selection-controls', 'navigation-actions', 'feedback-status', 'segmented-control', 'filter-chips', 'tabs']) {
  if (handbook.includes(`data-component-family="${genericFamily}"`)) errors.push(`generic component family must be split into first-class families: ${genericFamily}`);
}
if (!/data-od-id="component-family-index"/.test(handbook)
  || baseComponentFamilies.some((family) => !new RegExp(`href="#component-[^"]+"[\\s\\S]*data-component-family="${family}"`).test(handbook))) {
  errors.push('first-class component catalog is not directly discoverable');
}
const componentContractHeadings = [
  'Button / Icon Button', 'Search Field', 'Text Input / Textarea', 'Checkbox Group', 'Radio Group', 'Switch', 'Choice Bar / View Switcher',
  'List / Cell / Action Row', 'Badge / Status Tag', 'Card / Containment', 'Progress / Loading / Skeleton',
  'Empty / Error / Permission Recovery', 'Toast / Snackbar', 'Dialog / Bottom Sheet'
];
for (const [index, heading] of componentContractHeadings.entries()) {
  if (!design.includes(`### 7.${index + 1} ${heading}`)) errors.push(`DESIGN.md first-class component contract missing: ${heading}`);
}
const domainContractHeadings = ['Decision Summary', 'Primary / Backup Observing Window', 'Risk Strip', 'Time Rail', 'Condition Band', 'Sun / Moon Event Node', 'Route / Elevation Summary', 'Provenance / Freshness', 'Partial / Stale / Offline State', 'Evidence Disclosure'];
for (const [index, heading] of domainContractHeadings.entries()) {
  if (!design.includes(`### 6.${index + 1} ${heading}`)) errors.push(`DESIGN.md domain information contract missing: ${heading}`);
}
const practiceAxes = ['Layout 布局', 'Whitespace / density 留白密度', 'Type hierarchy 字体层级', 'Color 色彩', 'Cards / containment 卡片容纳', 'Buttons / actions 按钮动作', 'Visual focus 视觉焦点', 'Mobile adaptation 移动适配'];
if (!/### 4\.5 八轴实践矩阵/.test(design) || !/data-od-id="practice-axis-matrix"/.test(handbook)) errors.push('eight-axis practice matrix missing from rule source or handbook');
for (const axis of practiceAxes) {
  if (!design.includes(`| ${axis} |`) || !handbook.includes(axis.split(' ')[0])) errors.push(`practice axis missing: ${axis}`);
}
for (const searchState of ['idle', 'editing', 'query', 'clear', 'loading', 'suggestions', 'result', 'empty', 'error', 'scoped']) {
  if (!handbook.includes(searchState)) errors.push(`search state missing: ${searchState}`);
}
for (const checkboxState of ['unchecked', 'checked', 'indeterminate', 'disabled', 'max-selection', 'select-all']) {
  if (!handbook.includes(checkboxState) || !design.includes(checkboxState)) errors.push(`checkbox contract state missing: ${checkboxState}`);
}
for (const cardVariant of ['内容 / 事件', '已保存计划 / 动作', '证据 / 新鲜度', '决策 metric tile']) {
  if (!handbook.includes(cardVariant)) errors.push(`card containment specimen missing: ${cardVariant}`);
}
if (!/data-od-id="card-full-width-spot-object"/.test(handbook) || !/观星点信息/.test(handbook) || !/full-width 长对象卡/.test(design)) {
  errors.push('full-width single-object card contract or specimen missing');
}
for (const recipe of ['press', 'selection', 'disclosure', 'sheet-reveal', 'data-arrival', 'time-sync', 'mode-change', 'reduced-motion']) {
  if (!handbook.includes(`data-motion-recipe="${recipe}"`)) errors.push(`motion recipe missing: ${recipe}`);
}
if (!handbook.includes('class="radius-shape radius-sheet"')) errors.push('semantic radius specimen missing: sheet');
if (!handbook.includes('data-od-id="motion-contract-table"')) errors.push('motion behavior contract table missing');

const handbookCss = fs.readFileSync(path.join(root, 'preview/shared.css'), 'utf8');
const handbookJs = fs.readFileSync(path.join(root, 'preview/shared.js'), 'utf8');
const mobileHandbookCss = handbookCss.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/)?.[1] || '';
const narrowHandbookCss = handbookCss.match(/@media \(max-width: 360px\) \{([\s\S]*?)\n\}/)?.[1] || '';
if (!/\.handbook-frame\s*\{[^}]*width:\s*calc\(100% - 32px\)/.test(mobileHandbookCss)
  || !/\.mode-block\s*\{\s*margin-inline:\s*-16px;\s*padding:\s*14px 16px;\s*\}/.test(mobileHandbookCss)) {
  errors.push('compact handbook gutter and mode-block full-width alignment contract missing');
}
if (/\.mode-block\s*\{/.test(narrowHandbookCss)) errors.push('320px media query must not desynchronize mode-block from the 16px frame gutter');
if (!/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/.test(handbookCss) || !/table\s*\{[^}]*min-width:\s*680px/.test(handbookCss)) {
  errors.push('wide handbook tables must retain local horizontal scrolling');
}
const handbookClasses = new Set([...handbook.matchAll(/class="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)).filter(Boolean));
for (const className of handbookClasses) {
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\.${escapedClassName}(?![\\w-])`).test(handbookCss)) errors.push(`handbook class missing CSS selector: ${className}`);
}
for (const hook of ['data-handbook-nav-toggle', 'data-handbook-section', 'data-choice-bar', 'data-clear-target', 'data-search-demo', 'data-search-input', 'data-indeterminate', 'data-sheet-toggle', 'data-time-sync', 'data-arrival-toggle', 'data-disclosure-button', 'data-state-controller', 'data-motion-toggle', 'data-reduced-toggle', 'data-theme-target']) {
  if (handbook.includes(hook) && !handbookJs.includes(`[${hook}]`)) errors.push(`handbook interaction hook missing JS binding: ${hook}`);
}

for (const color of [
  '#FBFAF7', '#FFFFFF', '#F5F5EF', '#282B29', '#5E655F', '#E2E5DD', '#8A9088', '#6174D8',
  '#8799F6', '#EFF1FF', '#4859B8', '#202332',
  '#F2C94C', '#FFF7D6', '#6F5500', '#3A2E00',
  '#62C88B', '#E9F8EE', '#1F6B45', '#153B2A',
  '#E66F66', '#FFF0ED', '#973D37',
  '#11120F', '#181A17', '#A9B6FF', '#F6D56F', '#7ED7A1', '#FF8F87'
]) {
  if (!design.includes(color) || !scss.includes(color) || !css.includes(color) || !handbook.includes(color)) {
    errors.push(`new direction color missing from synchronized handbook contract: ${color}`);
  }
}
for (const staleColor of ['#F6F8FC', '#172033', '#4B5FD6', '#0B1020', '#111A2C', '#FAFBFC', '#5968D8', '#101114', '#17181C', '#3A7D5D', '#8B6508', '#B94A42']) {
  if ([design, scss, css, handbook].some((source) => source.toUpperCase().includes(staleColor))) {
    errors.push(`deprecated dark/corporate color remains in handbook contract: ${staleColor}`);
  }
}
if (!/"Noto Sans SC"[^\n]*"PingFang SC"[^\n]*"Microsoft YaHei UI"/.test(design)
  || !/"Noto Sans SC"[^\n]*"PingFang SC"[^\n]*"Microsoft YaHei UI"/.test(scss)
  || !/"Noto Sans SC"[^\n]*"PingFang SC"[^\n]*"Microsoft YaHei UI"/.test(css)) {
  errors.push('native CJK font stack is not synchronized');
}
if (!/\$sw-control-visible:\s*\(compact:\s*60rpx,\s*default:\s*72rpx,\s*commit:\s*96rpx\)/.test(scss)
  || !/--sw-control-compact:\s*30px/.test(css)
  || !/--sw-control-default:\s*36px/.test(css)
  || !/--sw-control-commit:\s*48px/.test(css)
  || !/\$sw-control-type:\s*\(compact-size:\s*24rpx,\s*compact-line:\s*36rpx,\s*default-size:\s*26rpx,\s*default-line:\s*38rpx,\s*commit-size:\s*30rpx,\s*commit-line:\s*42rpx\)/.test(scss)
  || !/--sw-type-compact-size:\s*12px/.test(css)
  || !/--sw-type-action-size:\s*13px/.test(css)
  || !/--sw-type-commit-size:\s*15px/.test(css)
  || !/--sw-type-snackbar-size:\s*13px/.test(css)
  || !/--sw-type-status-size:\s*11px/.test(css)
  || !/\$sw-letter-spacing-cjk:\s*0/.test(scss)
  || !/\$sw-page-gutter-rpx:\s*\(compact:\s*32rpx,\s*standard:\s*32rpx,\s*reference:\s*32rpx,\s*wide:\s*40rpx\)/.test(scss)) {
  errors.push('visual-occupancy type ladder, button geometry, or compact density is not synchronized');
}
if (!/\$sw-whitespace-layers:\s*\(screen-gutter:\s*32rpx,[^)]*visual-weight:\s*balanced\)/.test(scss)
  || !/data-od-id="whitespace-occupancy-principle"/.test(handbook)
  || !/屏幕 \/ 布局留白/.test(design)
  || !/视觉重量留白/.test(design)) {
  errors.push('four-layer whitespace and visual-occupancy contract missing');
}
const fieldControlRule = handbookCss.match(/\.field-block input,\s*\.field-block textarea\s*\{([^}]*)\}/)?.[1] || '';
const searchInputRule = handbookCss.match(/\.input-shell input\s*\{([^}]*)\}/)?.[1] || '';
if (!/\$sw-target-min:\s*88rpx/.test(scss)
  || !/--sw-target-min:\s*44px/.test(css)
  || !/min-height:\s*var\(--sw-target-min\)/.test(fieldControlRule)
  || !/min-height:\s*var\(--sw-target-min\)/.test(searchInputRule)
  || !/text\/search input 本体至少 88rpx/.test(design)
  || !/text\/search input 本体 ≥88rpx/.test(handbook)) {
  errors.push('text and search inputs must expose a native 44px / 88rpx target');
}
const buttonBaseRule = handbookCss.match(/\.primary-button,\s*\.secondary-button,\s*\.tonal-button,\s*\.quiet-button,\s*\.destructive-button\s*\{([^}]*)\}/)?.[1] || '';
const buttonSurfaceRule = handbookCss.match(/\.primary-button::before,\s*\.secondary-button::before,\s*\.tonal-button::before,\s*\.quiet-button::before,\s*\.destructive-button::before\s*\{([^}]*)\}/)?.[1] || '';
const compactButtonRule = handbookCss.match(/\.button-compact\s*\{([^}]*)\}/)?.[1] || '';
const compactButtonSurfaceRule = handbookCss.match(/\.button-compact::before\s*\{([^}]*)\}/)?.[1] || '';
const finalButtonRule = handbookCss.match(/\.final-commit-button\s*\{([^}]*)\}/)?.[1] || '';
const finalButtonSurfaceRule = handbookCss.match(/\.final-commit-button::before\s*\{([^}]*)\}/)?.[1] || '';
if (!/min-height:\s*var\(--sw-target-min\)/.test(buttonBaseRule)
  || !/font:\s*500 var\(--sw-type-action-size\)\/var\(--sw-type-action-line\) var\(--sw-font-sans\)/.test(buttonBaseRule)
  || !/letter-spacing:\s*0/.test(buttonBaseRule)
  || !/padding:\s*0 14px/.test(buttonBaseRule)
  || !/inset:\s*4px 0/.test(buttonSurfaceRule)
  || !/font-size:\s*var\(--sw-type-compact-size\)/.test(compactButtonRule)
  || !/padding-inline:\s*10px/.test(compactButtonRule)
  || !/inset-block:\s*7px/.test(compactButtonSurfaceRule)
  || !/min-height:\s*var\(--sw-control-commit\)/.test(finalButtonRule)
  || !/font-size:\s*var\(--sw-type-commit-size\)/.test(finalButtonRule)
  || !/padding-inline:\s*20px/.test(finalButtonRule)
  || !/background:\s*var\(--sw-meteor\)/.test(finalButtonSurfaceRule)) {
  errors.push('button visible-size, label, padding, or 44px hit-region contract missing');
}
if (!/data-od-id="button-final-commit"/.test(handbook)
  || !/重复选择 \/ 筛选/.test(handbook)
  || !/普通内联动作/.test(handbook)
  || !/安静 \/ 图标动作/.test(handbook)
  || !/破坏性动作/.test(handbook)) {
  errors.push('scene-specific button hierarchy specimen missing');
}
if (/\.primary-button\s*\{[^}]*width:\s*100%/.test(handbookCss)
  || !/\.fixed-action \.final-commit-button\s*\{[^}]*width:\s*100%/.test(handbookCss)
  || !/@media \(max-width: 360px\) \{[\s\S]*?\.decision-evidence\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(handbookCss)) {
  errors.push('ordinary actions must shrink to content and Decision Summary must reflow compactly at 320px');
}
if (/(?:outline-offset|sw-focus-offset|\.is-focus-visible)/.test([design, scss, css, handbookCss, handbook].join('\n'))
  || /box-shadow:\s*inset 0 0 0 var\(--sw-focus-width\) var\(--sw-focus\)/.test([css, handbookCss].join('\n'))
  || !/Touch feedback, text editing, and keyboard focus are separate contracts/.test(handbookCss)
  || !/@media \(pointer:\s*coarse\)/.test(handbookCss)
  || !/box-shadow:\s*inset 0 calc\(-1 \* var\(--sw-focus-width\)\) 0 var\(--sw-focus\)/.test(handbookCss)
  || !/触摸点击不留下持续焦点框/.test(design)
  || !/pointer:\s*coarse/.test(design)
  || !/触摸按下后不保留焦点框/.test(handbook)) {
  errors.push('touch/editing/keyboard focus branching must avoid persistent full or outer frames');
}
if (!/\$sw-switch:\s*\(track-width:\s*92rpx,\s*track-height:\s*48rpx,\s*thumb:\s*40rpx,\s*inset:\s*4rpx,\s*travel:\s*44rpx\)/.test(scss)
  || !/--sw-switch-width:\s*46px/.test(css)
  || !/--sw-switch-height:\s*24px/.test(css)
  || !/\.toggle\s*\{[^}]*width:\s*var\(--sw-switch-width\)[^}]*height:\s*var\(--sw-target-min\)/.test(handbookCss)
  || !/\.toggle\[aria-checked="true"\]::before,[^\n]*background:\s*var\(--sw-trail\)/.test(handbookCss)
  || /\.toggle\s*\{[^}]*width:\s*52px|\.toggle i\s*\{[^}]*width:\s*28px/.test(handbookCss)
  || !/46×24px track/.test(handbook)) {
  errors.push('slender 46x24 switch with 20px thumb and 44px row target is not synchronized');
}
if (!/data-component-family="choice-bar"/.test(handbook)
  || !/data-choice-bar/.test(handbook)
  || !/\.choice-bar__indicator\s*\{[^}]*transform:\s*translateX\(calc\(var\(--choice-index\) \* 100%\)\)[^}]*transition:\s*transform var\(--sw-duration-medium\)/.test(handbookCss)
  || !/group\.style\.setProperty\('--choice-index'/.test(handbookJs)
  || !/peer\.setAttribute\('aria-selected'/.test(handbookJs)
  || !/\.choice-bar__indicator/.test(handbookCss.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*/)?.[0] || '')
  || /data-segmented|data-simple-tabs|data-component-family="(?:segmented-control|filter-chips|tabs)"/.test([handbook, handbookJs].join('\n'))) {
  errors.push('Choice Bar must own one interruptible transform indicator and replace shape-based duplicate families');
}
if (!/scale\(\.985\)/.test(handbookCss) || !/scale 1 → \.985/.test(handbook) || !/scale 1 → \.985/.test(design)) {
  errors.push('pressed state must use the causal 80ms scale .985 contract');
}
if (!/id="mobile-baseline"/.test(handbook)
  || !/### 4\.4 移动基线 → Starward 应用/.test(design)
  || !/visible-control--compact/.test(handbook)
  || !/visible-control--default/.test(handbook)
  || !/visible-control--commit/.test(handbook)) {
  errors.push('mobile baseline to Starward application contract missing');
}
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (!/DESIGN\.md`：本候选唯一规则源/.test(readme)
  || !/宿主项目另行更新 authority/.test(readme)
  || !/14 个语义家族/.test(readme)) {
  errors.push('candidate rule-source hierarchy or expanded component inventory missing from README');
}
if (!/\.component-index\s*\{[^}]*grid-template-columns:\s*repeat\(4/.test(handbookCss)
  || !/@media \(max-width: 360px\) \{[\s\S]*?\.component-index,\s*\.search-state-grid,\s*\.explicit-card-grid,\s*\.whitespace-layers\s*\{\s*grid-template-columns:\s*1fr/.test(handbookCss)
  || !/@media \(max-width: 360px\) \{[\s\S]*?\.spot-object-card__row\s*\{\s*grid-template-columns:\s*1fr/.test(handbookCss)) {
  errors.push('component catalog does not reflow from desktop to 320px');
}
if (/score-row|reason-list|class="score"/.test(handbook)
  || !/class="decision-evidence"/.test(handbook)
  || !/evidence-metric--score/.test(handbook)
  || !/evidence-metric--window/.test(handbook)
  || !/evidence-metric--time/.test(handbook)
  || !/evidence-metric--risk/.test(handbook)) {
  errors.push('compact semantic Decision Summary specimen is not synchronized');
}
if (/font-weight:\s*700\b/.test(handbookCss) || /line-height:\s*1\.75\b/.test(handbookCss) || !/普通界面禁止 700/.test(design)) {
  errors.push('deprecated heavy typography remains in the handbook contract');
}
if (!/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.sheet-motion-surface[\s\S]*animation:\s*none/.test(handbookCss)) {
  errors.push('reduced-motion contract does not cover travel and data-arrival animation');
}

const documentedTokenColors = new Set((css.match(/#[0-9A-Fa-f]{6,8}\b/g) || []).map((color) => color.toUpperCase()));
for (const file of ['preview/shared.css', 'preview/shared.js', ...actualPreviewFiles.map((file) => `preview/${file}`)]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (/#[0-9A-Fa-f]{6,8}\b/.test(source)) errors.push(`raw color outside token contract: ${file}`);
}
for (const color of handbook.match(/#[0-9A-Fa-f]{6,8}\b/g) || []) {
  if (!documentedTokenColors.has(color.toUpperCase())) errors.push(`handbook documents color outside token contract: ${color}`);
}

const obs = css.match(/\[data-theme="observation"\]\s*\{([\s\S]*?)\n\}/)?.[1] || '';
const allowedObservation = new Set(['#000000', '#110000', '#190000', '#240000', '#5B1712', '#7A1E18', '#A83229', '#C23D32', '#D84A3C', '#FF6B58', '#000000E6', '#3A0A07']);
for (const color of obs.match(/#[0-9A-Fa-f]{6,8}/g) || []) {
  if (!allowedObservation.has(color.toUpperCase())) errors.push(`observation color outside warm-red/black set: ${color}`);
}
const observationTable = handbook.match(/<table id="observation-token-table"[\s\S]*?<\/table>/)?.[0] || '';
if (!observationTable) errors.push('strict observation token specimen missing');
for (const color of observationTable.match(/#[0-9A-Fa-f]{6,8}\b/g) || []) {
  if (!allowedObservation.has(color.toUpperCase())) errors.push(`observation specimen color outside warm-red/black set: ${color}`);
}

function extractParenBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return '';
  const open = source.indexOf('(', start + marker.length);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

for (const theme of ['day', 'night', 'observation']) {
  const scssBlock = extractParenBlock(scss, `${theme}:`);
  const cssPattern = theme === 'day'
    ? /:root,\s*\[data-theme="day"\]\s*\{([\s\S]*?)\n\}/
    : new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`);
  const cssBlock = css.match(cssPattern)?.[1] || '';
  const scssTokens = new Map([...scssBlock.matchAll(/([a-z][\w-]*):\s*(#[0-9A-Fa-f]{6,8})/g)].map((match) => [match[1], match[2].toUpperCase()]));
  const cssTokens = new Map([...cssBlock.matchAll(/--sw-([a-z][\w-]*):\s*(#[0-9A-Fa-f]{6,8})/g)].map((match) => [match[1], match[2].toUpperCase()]));
  for (const [name, value] of scssTokens) {
    if (cssTokens.get(name) !== value) errors.push(`token mirror mismatch: ${theme}.${name}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: handbook inventory, eight-axis whitespace/occupancy matrix, 14 semantic base component families, Choice Bar motion, slender switch geometry, application-validation hierarchy, ${htmlFiles.length} HTML pages, local links, candidate boundaries, density/type/color token mirrors, narrow-screen reflow, reduced motion, observation palette, and scaffold cleanup verified.`);
