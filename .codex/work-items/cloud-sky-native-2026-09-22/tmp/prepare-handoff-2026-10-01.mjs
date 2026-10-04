import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='.codex/work-items/cloud-sky-native-2026-09-22/';
const goal=readFileSync('C:/Users/777/.codex/attachments/ad3ea83b-947b-4f93-acd7-a6a7bbca38d1/goal-objective.md');
const saved=readFileSync(root+'GOAL-OBJECTIVE-CORRECTED-2026-09-28.md');
if(!goal.equals(saved))throw new Error('goal_backup_not_current');
for(const name of ['PLAN','STATE','INDEX']){const dest=root+name+'-HISTORY-before-handoff-2026-10-01.md';if(!existsSync(dest))copyFileSync(root+name+'.md',dest);}
let plan=readFileSync(root+'PLAN.md','utf8');
plan=plan.replace('**当前：Goal active、无预算、未完成；只改云观星，大字号暂停、手机暂不可用。**','**当前：2026-10-01 阶段提交与交接；实时 Goal paused、无预算、未完成。只改云观星，大字号暂停、手机暂不可用。**');
plan=plan.replace('迁移资料见[HANDOFF](HANDOFF-2026-09-28.md)','当前迁移入口见[HANDOFF](HANDOFF-2026-10-01.md)，上一轮交接保留历史');
plan=plan.replace('不自动切分支/worktree、不reset/clean、不擅自提交推送。常规可逆开发/验证已授权，采购、供应方联络、公开核心源码、云部署/外部发布仍需相应授权。','不自动切分支/worktree、不reset/clean；本轮用户已授权阶段提交与推远端，具体公开推送边界和结果见当前 HANDOFF。常规可逆开发/验证已授权；采购、供应方联络、云部署/外部发布仍需相应授权。');
plan=plan.replace(/^当前运行：分支codex\/remote-main-20260908[^\n]+/m,'当前恢复身份以 [2026-10-01交接](HANDOFF-2026-10-01.md)及其最终回执为准。最新候选 v53-final 仅准备、未打开/未推手机；旧 v52 的 PID24728/exec68590 已失效，不能照抄启动或绑定。v53最后60065/PID5304/exec46700是历史运行记录，新会话复核监听与实际服务。原生末次v47欢迎页，当前SDK/Sky/普通合成未知。');
const section=`## 阶段交接审视与优化（2026-10-01）

本轮先完成用户要求的阶段备份/交接，不扩功能。交接后经用户恢复 Goal 再按下列顺序继续；下表细化原阶段3/4，不建立第二套计划，不改变33项与商业范围。当前源码已有共享相机/帧、天体球面/相位、注册影像、OPAL、固定出版、图片队列/文件/GPU owner；没有推倒重构依据。

| 优先顺序/责任 | 当前证据与实际差距 | 下一步及完成条件 |
| --- | --- | --- |
| 0：恢复可信回归 | 本次完整Sky定向集411项中385通过、26项在VM抽取页面表达式时发生ReferenceError，涉及rawReportData、paintedData/paintedRow、observationTime、resolveSkyDeepSkyScene等新依赖；不是26个已定性产品错误，也不是回归全绿 | 先修7个受影响测试文件的运行输入/实际状态转换，保住时刻/身份/遮挡/手势/迟到反例，不删断言改期待以凑通过；抽取生产协调职责时让测试直接调用实际owner，减少AST名称耦合；全组修后通过且关键回归有有效反例，再扩大实现 |
| 1：共享图像可见需求与峰值 | sky-gpu-textures.finish的16MiB只约束帧后保留；常用峰值22,806,528B/暖帧8,388,608B，139°峰值31,260,672B/暖帧14,942,208B。旧previousFrame保护防止全部可见图循环重传；12组重排无改善，裁边不足单独解决 | 在现有publication/需求/解码/GPU链测投影采样足迹、实际可见集合及驻留/上传来源，先验证一个组合路径的分辨率选择或缓存策略；保源质量、粗细层恢复/身份/像素/归因，不任意隐藏图层、加预算。记录暖帧上传和峰值的真实改善，再在目标平台测解码/native/GPU总量；有限试验无改善即保留结论，转独立组合项，避免新一轮无限调参 |
| 2：状态协调与测试可维护性 | spot-sky-page同时拥有route恢复、时间意图、跟踪/选择、Canvas提交、图层装配与UI，多处ref/effect与AST测试耦合；大量共享绘制责任已存在 | 随本次回归修复优先提取真实“已绘帧可消费判定/协调转换”职责和显式输入，不按文件行数拆分，不重造第二套时钟/相机/selection。保hide/Back/时刻变更/旧响应/Canvas代次语义，迁移所有受影响Sky消费者；其它业务保持范围外 |
| 3：整体体验与面状显隐 | 星点/星座/辅助/纹理已实现不同程度的尺度策略；用户科学影像深局部淡出解释未全闭合，原生普通覆盖层仍缺 | 固定地点时刻/朝向/FOV定义/视口/图层，以进入→浏览→识别→搜索资料→时间跟踪→返回恢复为一个批次；分清marker/name/artwork/science texture/coverage，按实际参照修偏，缩回/点选/来源保持；不得用局部暖色或单体纹理验收全场 |
| 4：出版/路由与交付 | fixed-body-texture-publication/use-sky-opal-bands等已经共享，新增特性却仍易扩大MiniappService/controller/page装配；本地证据/原生/手机混用风险高 | 下一次修改对应边界时复用既有严格publication校验/固定出版和版本兼容；需要抽取Sky路由时保原公开合同/授权/错误/缓存语义，不牵连其他域。固定一个干净候选批量做平台组合、包体、资源/流量/成本及必要独立审查，未取得的保持未验 |

补充的执行效率要求：已经保存的源数据、参考条件、失败试验与工具启动语义复用；不逐天体发包、不为同一欢迎页重开IDE、不以重复全量检查替代开发。每个阶段交付一个用户可观察的组合结果；阶段内相关测试随变动，广泛验收集中里程碑。新的大拆分或精修只在真实共同责任/可测收益成立时做，不让优化取代原目标。

`;
plan=plan.replace('## 实际外部依赖及可继续事项',section+'## 实际外部依赖及可继续事项');
writeFileSync(root+'PLAN.md',plan);
const request='本对话太长了，我想要你做一次阶段性提交代码和推远端（解决冲突的时候务必谨慎），然后做一个handoff，我们本目标其实已经做了好长好长了，是从上一个对话 [@开发云观星模块1](thread://01a0c848-f0f5-7760-a397-84b4a47ff7e2?hostId=local) 续接过来的，你给我一份完整足够详细的交接（在plan中有的也行了），反正我们需要的信息不要漏，比如商业化合规结论那些，在这些基础上复刻stellarium，balabala。然后新对话我也会把我们对话与上一个对话附带上去。\n然后你也看一下我们当前实现与目标，你觉得可以优化的点（比如你觉得架构、性能、或者其他实现逻辑可以优化的你也提一下，或者直接改plan）也进行补充修改';
const updates=readFileSync(root+'USER-UPDATES.md','utf8');
writeFileSync(root+'USER-UPDATES.md',updates.replace('# 后续用户指令','# 后续用户指令\n\n## 2026-10-01 阶段提交、远端备份与完整交接（当前）\n\n用户原文：\n\n'+request.split('\n').map(s=>'> '+s).join('\n')+'\n\n本轮授权阶段代码提交与远端备份，要求谨慎处理冲突；不等于合并其它模块、强推main、云部署或目标验收完成。实际PUBLIC远端与原公开源码边界一起核定；具体回执见HANDOFF-2026-10-01.md。用户自行创建新对话并附聊天，不代建/代发。保留当前唯一PLAN，补充经代码/实际检查支持的优化顺序。实时Goal回读paused、无预算，旧active记录仅属历史，本次未改Goal状态。'));
for(const name of ['INDEX','STATE']){const old=readFileSync(root+name+'.md','utf8');const split=old.indexOf('\n');writeFileSync(root+name+'.md',old.slice(0,split+1)+'\n**2026-10-01 当前交接：** [完整handoff](HANDOFF-2026-10-01.md)与[唯一PLAN](PLAN.md)优先。实时Goal paused、无预算、未完成；已授权阶段提交，远端结果见handoff最终回执。最新普通v53-final仅准备，手机仍暂不可用，大字号继续暂停。下文旧active/候选/进程/下一步只保各自历史，不覆盖现状。\n'+old.slice(split+1));}
console.log(JSON.stringify({goalSha256:createHash('sha256').update(goal).digest('hex'),updated:['PLAN','USER-UPDATES','STATE','INDEX']}));
