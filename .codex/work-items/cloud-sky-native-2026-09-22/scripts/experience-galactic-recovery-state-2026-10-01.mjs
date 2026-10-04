import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const edit=async(file,changes)=>{let text=await fs.readFile(file,'utf8');for(const [from,to]of changes){assert(text.includes(from),from.slice(0,100));text=text.replace(from,to);}await fs.writeFile(file,text);};
await edit(task+'/PLAN.md',[
 ['常用银河暖帧8MiB与总资源仍开放，有限改善不关闭预算。责任3当前普通watch原生会话已进入READY，','该需求修复时常用银河暖帧8MiB；后续生产源像素窗口在软件常用暖帧降到0，有限改善仍不关闭总资源/目标预算。责任3本代普通watch原生会话已核READY，'],
 ['本轮同源 shader 大幅回读后官方 RPC 超时，当前 UI/试验清理未知，保最后成功帧，未重启或追加输入。','本轮同源 shader 大幅回读后官方 RPC 超时，旧试验清理未量；据该新失败只刷新现有模拟器一次，实际Map→原有Context→手动45°READY已恢复，watch/BFF/IDE未重开。[恢复及有界采样](evidence/experience-galactic-native-recovery-binding-2026-10-01.json)保当前帧；9个16×16 native片段最大差1、释放/GL0，不认证全部原生像素。'],
 ['同源 shader 核验发生官方超时，结果/清理未知。当前不再循环此参数或超时动作，继续责任3独立组合，','大幅同源 shader 核验曾官方超时，旧结果/清理未知；单次现有模拟器刷新恢复原Context，之后9片段采样成立/释放0，当前页面READY。当前不重放大幅回读或循环此参数，继续责任3独立组合，'],
 ['shader大幅回读/页面只读超时，保未知状态、不盲重放。','大幅shader/页面只读曾超时，单次现有模拟器刷新后已恢复原Context/READY，9片段原生对照成立；旧大幅结果/清理与整页因果仍未证，不盲重放。'],
 ['官方RPC在新shader核验后实际超时，当前UI/临时资源状态未确认，未追加输入/重启；不可由早前成功帧推定当前可用。','官方RPC在大幅shader核验后曾实际超时，单次现有模拟器刷新/原Context已恢复当前READY，旧试验临时资源清理未量；当前可用依据最新恢复绑定，不照抄旧帧。'],
 ['后续shader大幅回读/只读官方超时，当前UI未知。','后续大幅shader/只读官方超时；单次现有模拟器刷新→原Context→45°READY已恢复，9个原生片段最大差1/释放0，旧试验清理和全部原生像素仍未证。'],
]);
for(const name of ['STATE.md','INDEX.md'])await edit(task+'/'+name,[
 ['同源shader大幅回读后官方RPC超时，当前UI/清理未知。','大幅shader后官方RPC曾超时，旧清理未量；[单次现有模拟器刷新及采样绑定](evidence/experience-galactic-native-recovery-binding-2026-10-01.json)已恢复原Context/45°READY，9个16×16 native片段最大差1/GL与释放0，新版整页重捕与此前新版仅5通道差1，旧图因果仍未闭合。'],
 ['本轮新shader大幅回读后官方RPC实际超时，当前UI/临时资源未知，未追加输入/重启。','本轮大幅shader后RPC曾实际超时，已单次刷新现有模拟器并恢复原Context/READY；旧试验清理未量，watch/BFF/IDE保持。'],
]);
await edit(task+'/evidence/experience-galactic-production-2026-10-01.md',[
 ['超时不是取消，offscreen 结果/清理未知，当前原生 UI 状态不能由旧图推定。未继续输入、重启或冒称已释放，事件及原脚本冻结。保留 native 全场质量未验证并继续独立工作，后续恢复只在真实会话状态可证时执行有界处理。','超时不是取消，当时 offscreen 结果/清理及当前 UI 未知，事件/原脚本冻结，未冒称已释放。后续仅据这一新失败刷新现有模拟器一次，实际读回 Map，再沿原有 Context/公开手动入口恢复 45° READY；没有新 Context resolve/PUT 或 IDE/watch/BFF 重开。旧大幅试验清理仍未量，不由后续释放替代。\n\n[最新恢复绑定](experience-galactic-native-recovery-binding-2026-10-01.json)保存有界采样结果：同一原生 image、生产 shader/GPU owner、North45、1171×2532 viewport，在九个固定16×16区域比较9,216通道（6,912个非零RGB），7通道差1、最大差1/255；实际局部窗口320×320原texel，GL/释放0 error。包括旧图两处新增亮点的采样区域；只认证这些银河shader采样，不认证完整原生页/所有纹理/手机。页面后读READY成立，当前原图已实际查看，普通WXML依然缺失。刷新后新版中央整页与此前新版只5通道差1，而对旧图仍max128；新版可重复，旧输入状态及差异因果仍未闭合。亮点SDK tap及Canvas touchstart/end没有给出身份，不推断SAO或已证明拾取缺陷。\n\n任务CLI读JSON曾隐式把UTC字符串转DateTime，导致本来相同的时刻守卫失败；已保字符串并按DateTimeOffset比较等价时刻，未改应用时间/合同。这个脚本守卫问题不属于产品故障。大幅回读不重放，native全场质量义务保持。'],
]);
await fs.appendFile(task+'/PROGRESS.md','\n## 2026-10-01 新超时的一次现有模拟器恢复和有界原生采样\n\n前述新shader/只读RPC实际超时已冻结；只刷新现有模拟器一次，官方成功后实际Map读回，原有Context/公开手动45°READY恢复，IDE/watch/BFF未重开。CLI JSON默认DateTime转换造成等价UTC守卫误拒，改任务wrapper保字符串/守卫按瞬时比较，未改产品合同。大幅旧试验的结果/清理仍未量。新有界核验仅North45/九个16×16区域，共9,216通道、6,912非零RGB，生产原生shader和GPUowner完整图对局部图7通道差1、GL/释放0；采样窗口320×320原texel。后读READY，原图已查看，Canvas普通WXML仍缺；刷新后新版中央整页对此前新版5通道差1，对旧图仍max128，因果未明。亮点公开Canvas touch也没有身份，不认SAO/拾取通过或失败。\n\n生产初始冻结绑定不改写；新增recovery绑定冻结后续事件/84源hash/原图/采样/6保留文件。当前官方会话可用依据新读回，旧probe清理及目标全场质量继续未验。独立共享资源收益保持，接续唯一PLAN责任3整体识别/面状尺度/反向恢复，不循环大幅回读或旧参数。\n');
console.log(JSON.stringify({currentNative:'recovered READY',sampleScope:'9 fixed patches; max1',oldProbeCleanup:'unverified',oldPixelCause:'unverified',plan:'next independent composition obligation',goal:'active incomplete'}));
