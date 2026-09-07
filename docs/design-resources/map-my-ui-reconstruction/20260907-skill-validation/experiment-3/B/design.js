/* Independent frozen-v2 experiment-3 B. Standard Figma Plugin API only. */
async function buildDesign({ root, page, direction, width = 390, height = 844, mode = 'day', state, fonts, icons, mapImageHash, fixture }) {
  if (![0, 1, 2].includes(direction)) throw Error('Unknown direction');
  if (mode !== 'day') throw Error('Round-0 covers day only; theme expansion is unverified.');
  if (page !== 'map' && page !== 'my') throw Error('Unknown page');
  const f = fixture;
  const C = { ink: '#282b29', secondary: '#5e655f', muted: '#6d746d', line: '#e2e5dd', strong: '#8a9088', white: '#ffffff', subtle: '#f6f7f5', sky: '#4859b8', skySoft: '#f5f6ff', skyFill: '#8799f6', green: '#1f6b45', greenSoft: '#e9f8ee', gold: '#6f5500', goldSoft: '#fff7d6', coral: '#973d37' };
  const P = [
    { title: 19, line: 27, weight: 'medium', inset: 18, radius: 12, top: 390 },
    { title: 18, line: 26, weight: 'bold', inset: 16, radius: 8, top: 402 },
    { title: 20, line: 28, weight: 'medium', inset: 20, radius: 16, top: 382 }
  ][direction];
  const owners = { map: 'apps/wechat-miniapp/src/pages/map/index.tsx', panel: 'apps/wechat-miniapp/src/pages/map/spot-panel.tsx', time: 'apps/wechat-miniapp/src/pages/map/time-ruler.tsx', my: 'apps/wechat-miniapp/src/features/my/my-library-page.tsx', nav: 'apps/wechat-miniapp/src/components/custom-nav.tsx' };
  const rgb = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
  const paint = h => [{ type: 'SOLID', color: rgb(h) }];
  root.resize(width, height); root.fills = paint(C.white); root.clipsContent = true;
  root.setPluginData('direction', String(direction)); root.setPluginData('round', '0');
  root.setPluginData('fixtureDate', f.date); root.setPluginData('page', page);
  let sourceIndex = 0;
  function frame(parent, name, w, h, fill, radius = 0) {
    const n = figma.createFrame(); parent.appendChild(n); n.name = name; n.resize(w, h); n.fills = fill ? paint(fill) : []; n.cornerRadius = radius; n.clipsContent = false; return n;
  }
  function position(n, x, y) { n.x = x; n.y = y; return n; }
  function rect(parent, name, x, y, w, h, fill, radius = 0) {
    const n = figma.createRectangle(); parent.appendChild(n); n.name = name; n.resize(w, h); n.fills = paint(fill); n.cornerRadius = radius; return position(n, x, y);
  }
  function stack(parent, name, w, gap = 0) {
    const n = frame(parent, name, w, 1); n.layoutMode = 'VERTICAL'; n.primaryAxisSizingMode = 'AUTO'; n.counterAxisSizingMode = 'FIXED'; n.itemSpacing = gap; return n;
  }
  function row(parent, name, w, h, gap = 0) {
    const n = frame(parent, name, w, h); n.layoutMode = 'HORIZONTAL'; n.primaryAxisSizingMode = 'FIXED'; n.counterAxisSizingMode = 'FIXED'; n.counterAxisAlignItems = 'CENTER'; n.itemSpacing = gap; return n;
  }
  async function text(parent, value, w, size = 14, line = 20, weight = 'regular', color = C.ink, name = value) {
    const n = await StarwardFigma.text(parent, String(value), { fontName: fonts[weight], size, width: w, name, color: rgb(color) });
    n.lineHeight = { unit: 'PIXELS', value: line }; n.letterSpacing = { unit: 'PIXELS', value: 0 }; n.textAutoResize = 'HEIGHT'; return n;
  }
  function icon(parent, key, size = 18, color = C.ink) {
    const svg = icons[key + '-day'] || icons[key]; if (!svg) throw Error('Missing supplied icon: ' + key);
    return StarwardFigma.icon(parent, svg.replace(/currentColor/g, color), { size, name: 'Icon/' + key });
  }
  function tag(n, key, owner, label) { StarwardFigma.control(n, key, owner); n.setPluginData('accessibleName', label || key); n.setPluginData('role', 'button'); return n; }
  async function button(parent, { key, label, glyph, w = 44, h = 44, owner = owners.map, fill, color = C.ink, radius = 8, size = 14, line = 20, visible = 32, selected = false }) {
    const c = figma.createComponent(); root.appendChild(c); c.name = 'Component/' + key; c.resize(w, h); c.fills = []; c.clipsContent = false; position(c, width + 100, sourceIndex++ * 100);
    if (fill) rect(c, 'Visible surface', 0, (h - visible) / 2, w, visible, fill, radius);
    const body = row(c, 'Content', w, h, 6); body.primaryAxisAlignItems = 'CENTER';
    if (glyph) icon(body, glyph, label ? 17 : 19, color);
    if (label) { const tx = await text(body, label, Math.min(w - (glyph ? 31 : 8), label.length * size + 2), size, line, 'medium', color); tx.textAlignHorizontal = 'CENTER'; }
    if (selected) rect(c, 'Selected indicator', w / 2 - 9, 39, 18, 2, C.sky, 1);
    const n = c.createInstance(); parent.appendChild(n); n.name = 'Control/' + key; tag(n, key, owner, label || key); return n;
  }
  function divider(parent, y, inset = 0, w = parent.width - 2 * inset) { rect(parent, 'Divider', inset, y, w, 1, C.line); }
  async function systemShell() {
    const status = frame(root, 'System safe area', width, 44, C.white);
    position(await text(status, '9:41', 50, 12, 18, 'medium'), 24, 15);
    for (let i = 0; i < 4; i++) rect(status, 'System signal', width - 75 + i * 4, 27 - i * 2, 2, 3 + i * 2, C.ink, 1);
    const battery = frame(status, 'System battery', 23, 11, C.white, 3); position(battery, width - 45, 20); battery.strokes = paint(C.strong); rect(battery, 'Battery level', 2, 2, 17, 7, C.ink, 1); rect(status, 'Battery cap', width - 21, 23, 2, 5, C.strong, 1);
    const chrome = position(frame(root, 'WeChat title and capsule', width, 44, C.white), 0, 44);
    position(await text(chrome, '今晚去观星', 190, 15, 22, 'medium'), P.inset, 11);
    const capsule = position(frame(chrome, 'WeChat capsule', 84, 30, C.white, 15), width - 100, 7); capsule.strokes = paint(C.line);
    position(icon(capsule, 'ellipsis', 20), 13, 5); rect(capsule, 'Capsule separator', 43, 7, 1, 16, C.line); position(icon(capsule, 'circle-dot', 17), 56, 6.5);
  }
  async function navigation() {
    const y = height - 88;
    const nav = position(frame(root, 'Primary navigation', width, 54, C.white), 0, y); divider(nav, 0);
    const inner = position(row(nav, 'Two destinations', width - 72, 44, 0), 36, 5);
    for (const [key, label, glyph] of [['map', '地图', 'map'], ['my', '我的', 'user-round']]) {
      const selected = page === key;
      await button(inner, { key: 'nav-' + key, label, glyph, w: (width - 72) / 2, owner: owners.nav, color: selected ? C.sky : C.secondary, selected });
    }
    position(frame(root, 'Bottom safe area', width, 34, C.white), 0, height - 34); rect(root, 'System home indicator', width / 2 - 54, height - 12, 108, 4, C.ink, 2);
  }
  async function evidenceEntry(parent, key, label, glyph, w) { return await button(parent, { key, label, glyph, w, owner: owners.panel, color: C.secondary }); }
  async function astronomy(parent, contentW) {
    const gap = frame(parent, 'Section separation', contentW, 24);
    await text(parent, '天文信息', contentW, 16, 23, 'medium');
    const ruler = frame(parent, 'Shared time ruler / one supplied slice', contentW, 60); tag(ruler, 'time', owners.time, f.date + ' ' + f.time); ruler.setPluginData('role', 'adjustable'); ruler.setPluginData('availableSlices', JSON.stringify([f.time]));
    position(await text(ruler, f.date, 112, 12, 18, 'regular', C.secondary), 0, 10);
    const tm = await text(ruler, f.time, 74, 18, 25, 'medium', C.sky); tm.textAlignHorizontal = 'CENTER'; position(tm, contentW / 2 - 37, 0); rect(ruler, 'Only genuine selected tick', contentW / 2 - 1, 29, 2, 21, C.sky, 1);
    const metrics = row(parent, 'Weather comparison', contentW, 57, 0);
    for (const [label, value] of [['总云量', f.spot.cloud + '%'], ['气温', f.spot.temperature + '°C'], ['风速', f.spot.wind + 'm/s']]) {
      const cell = stack(metrics, 'Metric/' + label, contentW / 3, 2); await text(cell, label, cell.width, 12, 18, 'regular', C.secondary); await text(cell, value, cell.width, 16, 23, 'medium');
    }
    await text(parent, '月光影响 ' + f.spot.moonImpact, contentW, 14, 20);
    await text(parent, '透明度、视宁度、光污染：暂无数据', contentW, 14, 20, 'regular', C.secondary);
    await text(parent, '月相、日月升落、可见目标：暂无数据', contentW, 14, 20, 'regular', C.secondary);
    await text(parent, '低 / 中 / 高云量：暂无数据', contentW, 14, 20, 'regular', C.secondary);
    const source = row(parent, 'Freshness and source', contentW, 44, 0);
    await text(source, f.updatedAt + ' 更新', contentW - 96, 12, 18, 'regular', C.secondary);
    await evidenceEntry(source, 'data-source', '数据来源', null, 96);
  }
  async function mapPage() {
    const map = position(frame(root, 'Unmodified OSM reference / fixed 390×480', 390, 480), (width - 390) / 2, 88); map.fills = [{ type: 'IMAGE', imageHash: mapImageHash, scaleMode: 'FILL' }]; map.clipsContent = true;
    const marker = position(frame(map, 'Selected formal spot', 44, 44), 173, 187); tag(marker, 'marker', owners.map, f.spot.name);
    const pin = position(icon(marker, 'map-pin', 28, C.sky), 8, 6); pin.name = 'Formal marker / fixed anchor 195,209';
    position(await button(root, { key: 'search', label: '搜索观星点', glyph: 'search', w: width - 32, fill: C.white, visible: 40, radius: P.radius, color: C.secondary }), 16, 100);
    position(await button(root, { key: 'locate', glyph: 'locate-fixed', fill: C.white, w: 44, visible: 36 }), width - 56, 232);
    position(await button(root, { key: 'layers', glyph: 'layers-3', fill: C.white, w: 44, visible: 36 }), width - 56, 280);
    const panelTop = P.top + height - 844;
    const attribution = position(frame(root, 'OSM attribution', 200, 20, C.white, 3), 8, panelTop - 26); position(await text(attribution, '© OpenStreetMap 贡献者', 192, 12, 18, 'regular', C.secondary), 4, 1);
    const sheet = position(frame(root, 'Formal spot information panel / ' + (state || 'medium'), width, height - 88 - panelTop, C.white, P.radius + 4), 0, panelTop); sheet.clipsContent = true;
    const handleBand = frame(sheet, 'No-media handle band', width, 44);
    const handle = position(frame(handleBand, 'Handle exclusive drag hit', 104, 44), (width - 104) / 2, 0); tag(handle, 'handle', owners.panel, '调整地点面板高度'); handle.setPluginData('tapBehavior', 'no-op'); rect(handle, 'Handle', 37, 12, 30, 3, C.strong, 2);
    const clip = position(frame(sheet, 'Continuous document viewport / medium is clipped', width, height - 88 - panelTop - 116), 0, 44); clip.clipsContent = true; clip.overflowDirection = 'NONE'; clip.setPluginData('largeScrollOwner', 'This same document becomes vertically scrollable at large.');
    const doc = stack(clip, 'Single retained spot document', width);
    const identity = stack(doc, 'Place identity', width, 1); identity.paddingLeft = P.inset; identity.paddingRight = P.inset;
    if (direction === 1) await text(identity, f.spot.region, width - P.inset * 2, 12, 18, 'regular', C.secondary);
    await text(identity, f.spot.name, width - P.inset * 2, P.title, P.line, P.weight);
    if (direction !== 1) await text(identity, f.spot.region, width - P.inset * 2, 12, 18, 'regular', C.secondary);
    identity.paddingBottom = direction === 2 ? 7 : 3;
    const rail = row(doc, 'Sticky in-document section navigation', width, 44); rail.paddingLeft = P.inset; rail.setPluginData('sectionNavigation', 'Promote medium to large then locate section; never switch document.');
    await button(rail, { key: 'overview', label: '概览', w: 54, owner: owners.panel, color: C.ink });
    await button(rail, { key: 'astronomy', label: '天文', w: 54, owner: owners.panel, color: C.secondary }); rect(rail, 'Selected section underline', P.inset + 13, 40, 28, 2, C.sky, 1);
    const basic = stack(doc, 'Overview / arrival and facilities', width - 2 * P.inset); basic.layoutAlign = 'CENTER';
    const route = row(basic, 'Route and arrival', basic.width, 44, 8); icon(route, 'route', 18, C.green); await text(route, '路线与到达', basic.width - 106, 14, 20, 'medium'); await button(route, { key: 'navigate', label: '导航', w: 72, owner: owners.panel, color: C.green, fill: C.greenSoft, visible: 28 });
    const unknown = stack(basic, 'Unverified access and facilities', basic.width, 2); unknown.paddingTop = 4; unknown.paddingBottom = 6;
    if (direction === 1) { await text(unknown, '开放时间待核实', basic.width, 14, 20); await text(unknown, '停车、厕所待核实', basic.width, 14, 20, 'regular', C.secondary); }
    else { await text(unknown, '开放时间待核实', basic.width, 14, 20, 'medium'); await text(unknown, '停车、厕所待核实', basic.width, 14, 20, 'regular', C.secondary); }
    const evidence = row(basic, 'Supporting evidence routes', basic.width, 44);
    for (const [key, label] of [['field', '场地资料'], ['guides', '观星攻略'], ['spot-contribution', '反馈纠错']]) await evidenceEntry(evidence, key, label, null, basic.width / 3);
    divider(evidence, 0);
    await astronomy(basic, basic.width);
    const action = position(frame(sheet, 'Fixed spot action pill', width - 40, 44, C.subtle, 22), 20, sheet.height - 56);
    const actionRow = row(action, 'Three actions', action.width, 44);
    for (const [key, label, glyph] of [['favorite', '想去', 'star'], ['share', '分享', 'send'], ['sky', '云观星', 'telescope']]) await button(actionRow, { key, label, glyph, w: action.width / 3, owner: owners.panel, color: key === 'sky' ? C.sky : C.ink });
    root.setPluginData('coveredState', 'medium/no-media; astronomy and time remain below same-document crop; gestures and jumps not executed');
  }
  async function myEntry(parent, { key, title, subtitle, glyph, color = C.secondary, soft = C.subtle, w, compact = false, side, foot }) {
    const n = stack(parent, 'Entry/' + key, w); n.paddingTop = compact ? 10 : 14; n.paddingBottom = compact ? 10 : 14;
    const r = row(n, 'Entry content', w, 1, 10); r.counterAxisSizingMode = 'AUTO';
    if (glyph) { const tile = frame(r, 'Semantic tile', 28, 28, soft, direction === 1 ? 6 : 9); position(icon(tile, glyph, 17, color), 5.5, 5.5); }
    const col = stack(r, 'Editable entry text', w - (glyph ? 38 : 0) - (side ? 84 : 24), 3);
    await text(col, title, col.width, 14, 20, 'medium');
    if (subtitle) await text(col, subtitle, col.width, 12, 18, 'regular', C.secondary);
    if (foot) await text(col, foot, col.width, 14, 20, 'regular');
    if (side) { const s = await text(r, side, 74, 12, 18, 'regular', C.secondary); s.textAlignHorizontal = 'RIGHT'; }
    else icon(r, 'chevron-right', 14, C.muted);
    n.minHeight = 44; tag(n, key, owners.my, title); return n;
  }
  async function myPage() {
    const content = position(stack(root, 'My account and content hub', width - 2 * P.inset), P.inset, 106);
    const account = row(content, 'Compact account identity', content.width, direction === 2 ? 78 : 66, 10);
    const av = frame(account, 'Current account avatar', 34, 34, C.subtle, direction === 1 ? 8 : 17); position(icon(av, 'neutral-avatar', 30), 2, 2);
    const identity = stack(account, 'Account identity', content.width - 98, 2);
    await text(identity, f.account.title, identity.width, P.title, P.line, P.weight);
    await text(identity, f.account.identity, identity.width, 12, 18, 'regular', C.secondary);
    await button(account, { key: 'settings', glyph: 'settings', owner: owners.my });
    frame(content, 'Account separation', content.width, direction === 1 ? 10 : 16);
    const utilities = stack(content, 'Plan and contribution shared surface', content.width); utilities.fills = direction === 0 ? paint(C.subtle) : []; utilities.cornerRadius = P.radius;
    utilities.paddingLeft = utilities.paddingRight = direction === 0 ? 12 : 0;
    const uw = content.width - (direction === 0 ? 24 : 0);
    if (direction === 0) {
      await myEntry(utilities, { key: 'plan', title: '今晚计划', subtitle: f.plan.date, foot: f.plan.spotName + '\n' + f.plan.detail, glyph: 'calendar-days', color: C.green, soft: C.greenSoft, w: uw });
      rect(utilities, 'Plan contribution divider', 12, utilities.height, uw, 1, C.line);
      await myEntry(utilities, { key: 'contribution', title: '现场反馈与纠错', subtitle: f.account.drafts + ' 条草稿 · ' + f.account.pending + ' 条待审核', glyph: 'message-square-warning', color: C.gold, soft: C.goldSoft, w: uw, compact: true });
    } else if (direction === 1) {
      const plan = stack(utilities, 'Entry/plan', uw, 4); plan.paddingTop = 12; plan.paddingBottom = 14; tag(plan, 'plan', owners.my, '今晚计划');
      const heading = row(plan, 'Plan heading', uw, 24, 8); icon(heading, 'calendar-days', 17, C.green); await text(heading, '今晚计划', 92, 14, 20, 'medium'); const date = await text(heading, f.plan.date, uw - 141, 12, 18, 'regular', C.secondary); date.textAlignHorizontal = 'RIGHT'; icon(heading, 'chevron-right', 14, C.muted);
      await text(plan, f.plan.spotName, uw, 15, 22, 'regular'); await text(plan, f.plan.detail, uw, 12, 18, 'regular', C.secondary);
      const ln = frame(utilities, 'Shared divider', uw, 1, C.line);
      await myEntry(utilities, { key: 'contribution', title: '现场反馈与纠错', subtitle: f.account.drafts + ' 条草稿 · ' + f.account.pending + ' 条待审核', glyph: 'message-square-warning', color: C.gold, soft: C.goldSoft, w: uw });
    } else {
      const plan = stack(utilities, 'Entry/plan', uw, 8); plan.paddingTop = 12; plan.paddingBottom = 16; tag(plan, 'plan', owners.my, '今晚计划');
      const h = row(plan, 'Plan identity', uw, 24, 8); icon(h, 'calendar-days', 17, C.green); await text(h, '今晚计划', uw - 40, 14, 20, 'medium'); icon(h, 'chevron-right', 14, C.muted);
      const detail = row(plan, 'Plan date and destination relation', uw, 58, 12);
      const date = stack(detail, 'Plan date', 82, 2); await text(date, '2026-09', 82, 12, 18, 'regular', C.secondary); await text(date, '07', 82, 18, 26, 'medium', C.sky);
      const line = frame(detail, 'Date destination separator', 1, 42, C.line);
      const destination = stack(detail, 'Destination', uw - 107, 4); await text(destination, f.plan.spotName, destination.width, 14, 20, 'regular'); await text(destination, f.plan.detail, destination.width, 12, 18, 'regular', C.secondary);
      await myEntry(utilities, { key: 'contribution', title: '现场反馈与纠错', subtitle: f.account.drafts + ' 条草稿 · ' + f.account.pending + ' 条待审核', glyph: 'message-square-warning', color: C.gold, soft: C.goldSoft, w: uw, compact: true });
    }
    frame(content, 'Utility routine separation', content.width, direction === 1 ? 18 : 24);
    const routine = stack(content, 'Routine content entries', content.width);
    await myEntry(routine, { key: 'profile-links', title: '主页链接', subtitle: f.account.profileLinks + ' 条已保存', glyph: 'link', color: C.sky, soft: C.skySoft, w: routine.width, compact: true });
    frame(routine, 'Routine divider', routine.width, 1, C.line);
    await myEntry(routine, { key: 'import', title: '内容导入', subtitle: '导入自己的帖子并提交审核', glyph: 'file-up', color: C.green, soft: C.greenSoft, w: routine.width, compact: true });
    root.setPluginData('coveredState', 'normal/current WeChat identity; fixture counts; one settings control');
  }
  await systemShell();
  if (page === 'map') await mapPage(); else await myPage();
  await navigation();
  return root;
}
