import fs from 'node:fs';
import crypto from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
const edit=(p,fn)=>{const old=read(p),value=fn(old);if(old===value)throw Error(`No change: ${p}`);write(p,value);};
const replace=(s,a,b)=>{if(!s.includes(a))throw Error(`Missing anchor: ${a.slice(0,80)}`);return s.replace(a,b);};
const status='**2026-10-02讨论后当前状态：Goal paused、无预算、未完成。** 本轮只授权文档/计划更新；待用户全量替换[新目标文本](GOAL-OBJECTIVE-2026-10-02.md)并明确继续后执行。200 DAU和生产预期/4GB测试、全景淡出、共享影像质量及端云缓存要求已采用；不表示代码实现、云采购或容量验收。唯一下一依赖见PLAN新增当前段；下面各代次证据保历史适用条件。';
const phase=`## 当前依赖：全景、影像与端云协同（2026-10-02讨论采用）

本段替代下文旧代次的“下一步/下一依赖”，仍属同一PLAN。此前33项全部有效义务及商业排除不减；补充要求映射原C01/C04/C06/C09及交互、数据、成本、验证责任，不另建竞争计划。

1. **先统一完整球面与地景渐隐（责任3前置，联动1/2）。** 可连续浏览地平以下天空；地景靠近中心淡出、离开恢复；普通浏览默认隐藏地平圆和两类坐标网格，显式开启/关闭一致。保真实高度/升落和同一帧/相机，统一CPU/GPU绘制、标签、拾取、遮挡证书、请求资格及恢复。先做一条真实端到端路径验证地平下有正确身份的天体确实可见可点，再扩消费者与组合。旧无条件地平裁剪不能认证新需求；宽场纹理窗口prototype只属未采用试算，先复核其半球假设。覆盖拖动反向/缩放、跟踪/时间、普通/红光、hide/Back；数学地平不人为贴合山脊。
2. **共享影像质量与出版链（责任3/4）。** 复用现有合法输入/研究/数据，不重下月面或逐个手抠。来源适配→配准/覆盖→有依据的拼接/背景/颜色处理→多级分辨率→自动质量检查/异常抽查→不可变出版。用代表机制验证真实清晰度、完整范围、矩形/接缝、粗细切换、缺测、已绘来源和失败回退；M51/M82已知问题保持开放。高质量真实源优先，生成式补全不进入真实天空层，不恢复排除来源或新付逐项授权费。
3. **持久缓存与端云传输（责任1/4）。** 生产按200 DAU、一台4核16GB/12Mbps/2000GB月出流量/180GB SSD规划；4GB测试服不变。沿公共request/file/loader/publication/GPU owner实现跨页面/跨启动压缩文件缓存，与解码/native/GPU分开；版本/哈希键、完整写入、并发去重、活跃租约、配额与损坏、迟到取消、版本迁移和清理恢复一并完成。旧hide文件归零属于旧实现证据，不再要求合法公共持久文件也清零；活动资源仍须释放。全小程序文件额度留余量，具体预算经实际数据与设备验证，不直接耗满200MB或扩大GPU额度。首次先可浏览再细化，按视口/清晰度加载并有界预取。服务端离线出版、同机Caddy静态直出为初期方向，保完整来源/旧版本/权限和环境边界；CDN/对象存储非云观星前置，投稿媒体要求不变。先本地验证静态/客户端实际链，不擅自云部署。
4. **组合质量与容量交付（原阶段4/5）。** 在干净固定候选验证完整进入→全天/地下/局部→识别→搜索/资料→时间/跟踪→来源/退出/恢复。测冷暖首屏与细节、帧时、客户端解码/native/GPU总量、服务CPU/RSS/DB/任务/磁盘与真实出口；普通混合业务加10/20同时冷缓存进入为初始峰值场景，非并发上限。4GB测试证明功能/协议/恢复，不外推16GB容量；生产同等配置独立压测后才给容量结论。既有WXML FAILED_DEVTOOLS、手机不可用/新版月面未推、Android+iOS、包体、费用和独立审查继续开放。

判定收益同时看质量、响应和总资源；不能以减少某一层内存却增加整场负担认定完成。200DAU是全产品规模，云观星全200人使用仅作明确情景；旧500/1000DAU、820/1080/318元和CDN算例不作为当前预算，天气位置/刷新不随DAU同比缩放。采购/云发布仍须另有授权。资源权威见[部署容量](../../../project_context/deployment/decisions-and-verification.md#current-capacity-target-200-dau-2026-10-02)，产品见[Sky契约](../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#全景浏览影像质量与端云性能2026-10-02)，共享实现方向见[影像架构](../../../project_context/architecture/runtime-and-domain.md#adopted-full-sphere-visibility-and-resource-direction-2026-10-02)。

`;
edit(task+'PLAN.md',s=>{
 s=replace(s,'# 云观星当前执行方案','# 云观星当前执行方案\n\n'+status+'\n\n'+phase);
 s=replace(s,'**当前：2026-10-01新对话Goal active、无预算、未完成；','**历史续接状态（已被本页2026-10-02暂停更新覆盖）：2026-10-01新对话Goal active、无预算、未完成；');
 s=s.replaceAll('下一依赖量化宽场W3＋星座／地景的实际暖帧驻留与传输','该代次遗留宽场W3＋星座／地景的实际暖帧驻留与传输问题，现按本页2026-10-02当前依赖推进');
 s=s.replaceAll('下一项量化实际宽场W3＋星座／地景暖帧驻留与传输','该代次待解决实际宽场W3＋星座／地景暖帧驻留与传输，现以前述全景可见性为前置');
 s=replace(s,'## 当前阶段与依赖顺序','## 既有阶段责任与证据（顺序以本页2026-10-02当前依赖为准）');
 s=replace(s,'实时核对后按下表从责任1推进。','下表保留各责任证据，当前执行先按本页2026-10-02段完成责任3全景可见性，再推进共享质量与端云缓存。');
 return s;
});
for(const name of ['STATE.md','INDEX.md','HANDOFF-2026-10-01.md'])edit(task+name,s=>{
 const end=s.indexOf('\n');s=s.slice(0,end+1)+'\n'+status+'\n'+s.slice(end+1);
 s=s.replaceAll('**2026-10-01新对话已继续：Goal active、无预算、未完成。**','**历史2026-10-01续接状态（当前已暂停）：当时Goal active、无预算、未完成。**');
 s=s.replaceAll('下一依赖量化宽场W3＋星座／地景的实际暖帧驻留与传输','该代次遗留宽场W3＋星座／地景驻留与传输问题；当前先按PLAN新依赖补全景可见性');
 return s;
});
edit(task+'REQUIREMENTS.md',s=>replace(s,'# 范围、约束与证据','# 范围、约束与证据\n\n**2026-10-02要求补充：** 原33项有效义务全部保留。C01/C04包含完整天球/地平以下连续浏览、地景接近视野中心渐隐与恢复；C09普通默认隐藏地平圆/网格并可显式开启；C06及数据责任包含共享影像质量/出版链，不能靠生成式补全伪造真实细节；成本/性能/验证采用全产品200DAU、生产预期4核16GB/12Mbps/2000GB/180GB、4GB测试及端云共同优化。持久公共文件缓存与活动解码/GPU释放分开，不将旧文件清零当新缓存验收。完整细则见当前PLAN、Sky产品owner、影像架构及部署容量owner；此次仅更新要求，旧证据不升级。'));
edit('project_context/deployment/current-state.md',s=>{
 s=replace(s,'## Current Status','## Current Status\n\n**2026-10-02 planning update:** Production is expected to use a separate 4-core/16-GB, 12-Mbps, 2000-GB/month, 180-GB-SSD host for 200 DAU; staging remains 4 GB. See [capacity owner](decisions-and-verification.md#current-capacity-target-200-dau-2026-10-02). These are intended resources, not an observed purchase, upgrade or deployment. Historical receipts below remain historical.');
 s=replace(s,'The selected rollout sequence is to use this first host only as staging during setup, then fully decommission its staging state and reprovision it from a clean base as the persistent production host before public launch. It must not be promoted in place with staging data, volumes, credentials, queues, caches, backups or process state.','The earlier plan to repurpose this first 4-GB host as production is superseded by the 2026-10-02 capacity target. Keep staging at 4 GB and production separately provisioned at the expected shape; no host is promoted in place with staging data, volumes, credentials, queues, caches, backups or process state.');
 s=replace(s,'Production promotion remains blocked until a second, separately owned staging host exists and re-establishes the complete staging receipt for the exact candidate.','Production promotion requires a separately owned production runtime and a complete staging receipt for the exact candidate; a second staging-host purchase is no longer an automatic prerequisite when the existing host remains staging.');
 return s;
});
edit('project_context/deployment/decisions-and-verification.md',s=>replace(s,'- Public-launch traffic and cost budget, production compute/data placement, provider contracts/redistribution rights, backup retention, recovery objectives, monitoring/alert recipients and incident operator.','- The 200-DAU traffic target and expected production compute shape above are selected. Actual purchase/renewal cost, measured service budgets, final region/data placement, provider contracts/redistribution rights, backup retention, recovery objectives, monitoring/alert recipients and incident operator remain to be established.'));
edit('project_context/deployment/release-and-environments.md',s=>replace(s,'- The BFF and worker consume `packages/miniapp-contracts/**` and the same release image/source revision. The client calls only its environment\'s BFF origin; it never receives provider secrets or calls weather, map, media or content providers directly.','- The BFF and worker consume `packages/miniapp-contracts/**` and the same release image/source revision. Business API calls use the environment\'s BFF origin. Published public sky assets may use an explicitly environment-bound, project-controlled static resource origin, initially the same HTTPS edge; publication/version/integrity and access rules remain enforced. This planned static path does not grant arbitrary upstream-provider access, expose secrets or imply an existing CDN deployment. Weather, map, media and content provider credentials stay server-side.'));
const baseline=JSON.parse(read(task+'tmp/resume-preserved-hashes-2026-10-01.json'));
for(const f of baseline){const hash=crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex');if(hash!==f.sha256)throw Error(`Preserved file changed: ${f.path}`);}
console.log(JSON.stringify({updated:'task entries, plan, requirements and deployment consistency',preservedFiles:baseline.length}));
