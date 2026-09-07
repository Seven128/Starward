import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const task=path.resolve(import.meta.dirname,'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(task,p),'utf8'));
const write=async (p,v)=>fs.writeFile(path.join(task,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const now=new Date().toISOString(),summary=await read('v2-summary.json');
if(summary.independentPairedTrials!==3||summary.visualBPassingTrials!==0)throw Error('Reassess report against new results');
await fs.copyFile(path.join(task,'review.md'),path.join(task,'review-v1.md'),fs.constants.COPYFILE_EXCL);
const latest={recordedAt:now,execution:'Skill development and scoped resource experiments completed; acceptance failed, not production completion',version:'design-method-v2',pairedTrials:3,independentRetests:2,rawExports:summary.trials.reduce((s,t)=>s+t.rawExportCount,0),reviewedInitialFinalPngs:72,frozenInputs:168,visualBPassingTrials:0,repeatabilityEstablished:false,v1UserPreference:'reject-all',v2UserPreference:null,adoption:'none',production:'unchanged',report:'review.md',comparison:'http://127.0.0.1:4277/v2-all/index.html',native:'native/Starward-map-my-v2-all-trials.fig',unverified:['v2 user preference','v2 full themes/states/sizes coverage and fresh handoff','Current WEAPP / phone interactions, native Tencent map and screen appearance','Native .fig re-import']};
await write('completion-status.json',latest);
const run=await read('run.json');
run.reviewV1=run.review;run.review={...latest};run.adoption='none';run.resourceWorkCompletedAt=now;run.latestVersion='design-method-v2';
run.failures.push({phase:'v2',kind:'visual-threshold-not-met',detail:'Three frozen paired trials completed; B 0/3 trials meets at least 2/3 directions with both pages >=4. Full results in v2-summary.json.'},{phase:'v2',kind:'layout-and-runtime-failures',detail:'E2 A initial wrong Auto Layout axis; E3 A minHeight=0 failed with no committed owners, original and technical 0-to-null fix retained. E3 B decoration flow and E4 initial crop errors repaired within revision cap; all raw exports retained.'},{phase:'v2-final-check',kind:'expected-synthetic-fixtures',detail:'Raw preflight remains false for two identical frozen credential-redaction test lines. Exact paths, hashes and line provenance verified in fixture-scan-review.json. No frozen file or detector exemption changed.'});
await write('run.json',run);
for(const t of summary.trials){const p=`experiment-${t.experiment}/run.json`,r=await read(p);r.review={status:'independent-initial-final-complete',pngHashesVerified:24,visualBGroupThresholdMet:t.visualBGroupThresholdMet,userPreference:t.userPreference,production:'unchanged',result:'ab-result.json',limitations:'Static 390px day-mode core only; no phone runtime or complete v2 coverage'};r.completedAt=now;await write(p,r);}
await write('review.md',`# 设计资源 Skill 开发与地图／我的资源测试：最终报告

Skill 已开发并实际调用，工具、原生资源和局部交接路径可运行；审美验收未通过。用户拒绝第一版全部六个方向后，已按层级、整体尺寸、有效密度与精致度反馈修改设计方法，并完成新版三次独立成对试验。新版 B 组达到预设组视觉门槛的样本为 **0/3**，不能宣称提升审美下限、稳定性或已获采用。新稿用户偏好仍为空，生产未修改。

完整附件与当前代码适配在 [INDEX.md](INDEX.md)、[current-source-audit.md](current-source-audit.md)、[test-plan-current.md](test-plan-current.md)。本报告覆盖最新结果；[第一版完整报告](review-v1.md)保留 T0、M01–M12、Y01–Y08、T3 和 D01–D10 逐项证据与未验证范围，其中旧的“复验未做／用户待答”仅属当时记录。

## Skill 与用户反馈

唯一发现入口为仓库 .agents/skills/starward-design-resource/SKILL.md。模型和推理档位继承调用任务，不固定 Astra/high；本轮实际宿主记录为 gpt-6-astra/high，仅为本次实验事实。调用配置、参考、脚本、测试与完整冻结副本均保存。无长期任务自举。

设计方法 v2 要求先区分标题、对象内容、状态、操作，再决定字号和强调关系；检查真实内容占高与有效密度；视觉图标尺寸和44px命中目标分别处理；方向差异必须体现信息关系，先回看整屏再修细节。没有把用户拒绝改写为认可，也没有调整量表来让结果达标。新方法和本轮实物仍未解决所有视觉问题。

## 实际试验及结论

三个新版样本分别为 experiment-2、3、4。每个样本 A/B 各三个地图＋我的方向，独立作者使用相同模型、档位、业务输入、素材和字体可用列表；A不读取新Skill设计方法，B读取冻结Skill。168份冻结输入逐一复核未变。每组最多两轮正式视觉修订，技术失败单列。

共84份真实 Figma 导出记录，独立匿名评审覆盖72张初稿／最终PNG，每张SHA和五维权重计算复核。中间修订保留但不冒充独立样本。全量逐页分数、映射和限制见 [v2-summary.md](v2-summary.md) 与各 experiment 的 anonymous-assessment.json/md、ab-result.json。

|新版样本|A 最终达标方向|B 最终达标方向|正式修订 A/B|
|---|---|---|---|
|1|1/3|0/3|2/1|
|2|0/3|0/3|1/1|
|3|1/3|0/3|1/2|

“达标方向”仅指两页加权分均≥4且各单项≥3；原组门槛为至少2/3方向达标，另需产品正确与用户认可。A/B最终18页各自中位数均3.8，最低均3.4；此小样本不支持稳定的视觉收益判断。主任务在允许修订内指出实物缺陷，同一评审者跨样本评审；不能据此推出其他模型、产品或工具的优劣。

## 工程、覆盖与交接

此前29项相关工程测试通过（新Skill26、既有项目3），quick_validate与真实Codex app-server skills/list发现通过；v2只改设计指导，工程代码未在复验期间变更。详细实测在 [final-checks.json](final-checks.json)、[T0-results.md](T0-results.md) 与 [final-checks-v2.json](final-checks-v2.json)。工具探针覆盖真实中文、图片、原生节点、点击跳转、导出、长文重排、目标保护、受控重跑和断连恢复。

新版36张最终图的任务局部几何／实色文字检查没有新增报告项，最低实色文字对比度各样本为5.46、5.58、5.58。检查器不证明审美、复杂合成、遮挡或原生命中分发。通用严格检查仍报告样本1 A第三方向地图时间框底部7px在medium裁切外：完整358×78，可见358×71，文字完整、可见高度≥44；此项保留，不能称完整目标无裁切。三个全历史包分别保留7／2／2条初稿或修订告警。

任务目录最终preflight原结果为false：两份冻结副本的凭证脱敏测试第31行触发模拟值扫描。与现行测试同一行逐字一致，文件SHA一致；[fixture-scan-review.json](fixture-scan-review.json)记录路径和来源，不复制检测值。未修改冻结输入或放宽扫描器；这项人工分类不改写原始失败结果。

第一版的24张状态／主题／尺寸板已真实导出并读回：197个原生组件、189个实例关联可定位；覆盖复查0工程错误、3条滚动边缘审阅项。首次独立新会话交接实际新增My说明并自然重排，Map指纹及PNG完全不变。详细证据在 coverage-check.json/md 与 handoff-output/export。**这些覆盖和交接属于第一版资源，没有重复标成新版验证。** 新版只完成390px、日间、常规字号的成对主状态；新版完整主题／尺寸／状态、连续交互及新会话交接不计通过。

## 交付与边界

- [新版全部18组匿名候选](http://127.0.0.1:4277/v2-all/index.html)：三次样本均可进入，初稿与最终按原逻辑尺寸保留；HTML与图片同时保存在review-site，无公共发布。
- [可编辑 Figma](https://www.figma.com/design/tU01DsKBhSng9IHk1xlJQA/)：专用私有Draft，真实Text／Auto Layout／Component／Instance。地图参考使用共同的OSM实截图，不是当前微信原生地图或腾讯底图运行证据。
- [最新原生备份](native/Starward-map-my-v2-all-trials.fig)：Figma Save local copy实际下载，1,355,443bytes，SHA256 14ec82717b315d19b25638d5ce14bcb10364f39d25a19a3a754bbeb5f2f4c30e；已检查ZIP与canvas.fig的fig-kiwi文件头，没有字体文件；未重导入恢复演练。
- [完整恢复索引](INDEX.md)、[执行记录](execution-log.md)、run.json、completion-status.json 保存输入、版本、失败、实际工具、覆盖和最新状态。原第一版、失败脚本、真实初导及所有修订均保留。

WEAPP／手机的连续手势、原生地图竞争、主题白闪、实时数据与完整路由运行未验证；静态图不能替代这些结果。200%字号依当前owner暂停。示例天气和账户数据不是实时或真实个人数据。图标／照片来源许可见assets/ATTRIBUTION.md。未改变生产页面、根DESIGN、Context或已采用资源；没有发布、采购、公开Figma或执行P4/T5。

每组token与成本无法可靠归属，保持null／unknown；总任务用量不作为某组成本。工具粘贴与下载无需用户人工操作，不等于设计不需要用户反馈。第一版用户结论为全部拒绝，新版未获用户选择；本轮完成的是开发和资源实验交付，视觉验收、采用和生产交付均未完成。
`);
const statusText='Skill开发与本轮资源实验已收尾；设计方法v2三个独立成对样本experiment-2/3/4全部完成，84真实导出、72初稿/最终PNG独立评审SHA已核对，168冻结输入未变。B组视觉门槛0/3样本通过，不宣称稳定审美收益。新版偏好未收到；v1已全部拒绝。详见review.md、v2-summary.json/md、completion-status.json；最新匿名入口http://127.0.0.1:4277/v2-all/index.html，原生备份native/Starward-map-my-v2-all-trials.fig。旧T3覆盖/交接只属于v1；新版及手机未验证项如实列出，生产未改。';
let index=await fs.readFile(path.join(task,'INDEX.md'),'utf8');index=index.replace(/- \*\*最新状态（优先于下方过程记录）\*\*：[^\r\n]*/,`- **最新状态（优先于下方过程记录）**：${statusText}`);index+='\n\n## 最终接续状态（覆盖上方所有运行中描述）\n\n'+statusText+'\n\n- E3 final=A1/B1；E4 final=A1/B2，仅B3 My的最后修订变化，其他五图与B1 SHA相同。全部作者与独立评审已完成；无需继续等待生成任务。\n- 根preflight保留false，两处为冻结测试第31行的已确认模拟值；fixture-scan-review.json给出精确路径/SHA，未改冻结文件或检测规则。\n- review-v1.md为原报告历史快照；review.md为最新合并报告。finalize-evidence.mjs属于v1旧脚本，不可拿来重写最新状态。\n- 新的用户偏好若到达，应按样本和匿名编号另记，不能覆盖历史拒绝或假设批准生产。当前没有选定方向，P4/T5未授权。\n';await write('INDEX.md',index);
await fs.appendFile(path.join(task,'execution-log.md'),`\n\n### ${now} — v2三次独立试验收尾\n\n${statusText}\n\n所有评分绑定72真实PNG；84导出记录与历史失败保留。E3首次minHeight错误经owner审计确认无已提交节点后才技术重试。最新native复制曾因PowerShell参数名错误失败，修正后检查目标存在、ZIP结构和SHA；未把失败命令当交付。最终2处扫描命中经逐字比对确认为冻结脱敏测试模拟值，原preflight false未覆盖。匿名hub与三个子页已真实浏览器打开，初稿/最终原图链接可见。\n`);
await fs.appendFile(path.join(task,'native/README.md'),'\n\n## 新版追加备份\n\nStarward-map-my-v2-trial1.fig是截至新版首样本的历史备份。最新为Starward-map-my-v2-all-trials.fig，包含三次新版独立样本；Figma Save local copy实际下载，1,355,443bytes，SHA256 14ec82717b315d19b25638d5ce14bcb10364f39d25a19a3a754bbeb5f2f4c30e。结构检查见同名.json：canvas.fig头fig-kiwi、thumbnail/meta/4张images、无字体文件。未重新导入。旧备份保留，最新备份不建立手机或连续交互验证。\n');
await fs.appendFile(path.join(task,'retests/v2/README.md'),'\n\n## 实际收尾\n\nexperiment-2/3/4已完成同冻结版三次独立成对试验，84真实导出、72张初稿/最终图独立评审，168输入哈希未变。B三个样本全部未达原视觉组门槛；不成立稳定收益或采用。详见../../v2-summary.md与../../review.md。新偏好为空，旧版全部拒绝单独保留；新版只覆盖390日间主状态，旧24板/交接不算新版结果。\n');
console.log(JSON.stringify(latest,null,2));
