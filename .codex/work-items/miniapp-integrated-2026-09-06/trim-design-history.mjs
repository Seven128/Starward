import {readFileSync,writeFileSync} from 'node:fs';
const path='DESIGN.md'; let s=readFileSync(path,'utf8');
const start=s.indexOf('### Design Authority Index'); const end=s.indexOf('## Colors',start);
const old=s.slice(start,end);
const keep=old.split(/\r?\n/).filter(l=>['- Authored exact-value','- Generation direction','- Mini Program reference interpretation:'].some(p=>l.startsWith(p)));
s=s.slice(0,start)+'### Design authority\n\n'+keep.join('\n')+'\n- Product and Screen Contracts own page responsibilities, data and interaction meaning; this file owns the independent App and Mini Program visual profiles. Verify real runtime behavior separately.\n- Edit current rules and their generated adapters directly. Prototype packages, Open Design projects, handoffs, screenshots and historical hashes are not required inputs or synchronized deliverables. Preserve useful production assets and behavior checks.\n- Mini Program work currently targets standard text at 320/375/390/430 logical pixels, day/night/observation modes, safe areas, 44px touch targets, reduced motion and actual loading/error/permission states. Large-text adaptation is paused by the user.\n\n'+s.slice(end);
const a=s.indexOf('### Adoption record'); const b=s.indexOf('### 当前可执行令牌',a);
const preserved=s.slice(a,b).split(/\r?\n/).filter(l=>l.startsWith('- Display name:')||l.startsWith('- Third-party screenshots')||l.startsWith('- Map provider/basemap'));
s=s.slice(0,a)+'### Scope\n\n'+preserved.join('\n')+'\n- Current component and layout rules are maintained below with the owning Screen Contracts. Historical selection records are not development dependencies.\n\n'+s.slice(b);
s=s.split(/\r?\n/).filter(l=>!l.startsWith('- 当前 component/layout source为')&&!l.startsWith('- 所有历史资源仅在 controlling protocol')).join('\n');
const c=s.indexOf('### 12. 投射与审查');
s=s.slice(0,c)+`### 12. 实现与验证

- 当前令牌由 tools/miniapp/generate-design-tokens.mjs 生成到生产 SCSS/TypeScript；修改本文件中的令牌后更新生成文件，不维护浏览器原型镜像。
- 通过 design:system:verify 检查令牌一致性与对比度，通过 test:miniapp:ui-contracts 检查生产职责约束；图标和语义资产继续使用各自生成检查。
- 实际 WEAPP 验证标准字号的字体层级、信息密度、侧边导航可辨识度、44px 点击区、各面板档位及滚动章节同步、媒体和地图状态连续性、三模式、输入法和键盘、失败恢复及真实数据边界。真机和环境限制如实记录。
- 规则和自动检查不能证明页面视觉完成。仅在持久设计决策改变时更新其 owner，不为每次页面修改同步原型、快照、handoff 或历史 hash。
`;
writeFileSync(path,s);
