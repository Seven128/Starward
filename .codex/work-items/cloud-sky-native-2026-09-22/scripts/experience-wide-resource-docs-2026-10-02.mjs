import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const events=(await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl','utf8')).trim().split(/\r?\n/).map(JSON.parse);
const count=events.length;
const summary=`[W3实际绘制需求与整场组合](evidence/experience-wide-resource-2026-10-02.md)及[${count}事件绑定](evidence/experience-wide-resource-binding-2026-10-02.json)：W3请求与绘制共用既有16格基础面几何，只排除实际无三角形的面；移出视口的解码引用转为原有界冷文件，不替代光学粗图。25组整场软件已绘像素／身份保持，W3源RGBA需求模型在85／123／139／全天分别少4／5／3／2MiB；更宽暖帧GPU重传仍存在。当前开发器同完整208.386°相机的W3文件12→8，208→85→208保同8份文件序号；Vega资料／来源hide0／Back8份重取、收起资料后公开退出0／原Context重进North45／9文件934831B／revision1／PUT0及模块保持。既有地景预算因此选择细图，实际对应软件源模型14→18MiB、GPU保留10→16MiB，整场不宣称内存下降；该软件42337像素max45、原生26510像素max50均保DIFFERENT。来源Canvas ROI801／max15与最终North10／max1也保严格差异，旧875／1254失败不升级。watch00:25:22仅一次刷新；6项其他修改／两配置／三冻结候选保持。WXML FAILED_DEVTOOLS、总资源／帧时、完整校准／识别旅程、手机新版月面、包体成本与独立审查仍开放。下一依赖量化宽场W3＋星座／地景的实际暖帧驻留与传输，并保完整时间／跟踪／来源／返回，全部33项和商业边界保持。`;
for(const [name,prefix] of [['STATE.md','**最新源码／原生代次：** '],['INDEX.md','**本轮最新：** ']]){
  const file=task+'/'+name,lines=(await fs.readFile(file,'utf8')).split(/\r?\n/);
  assert(lines[2].includes('1325'));lines[2]=prefix+summary;
  await fs.writeFile(file,lines.join('\n'));
}
const planPath=task+'/PLAN.md';let plan=await fs.readFile(planPath,'utf8');
const latest=plan.split(/\r?\n/).find(line=>line.startsWith('**本轮最新：**'));assert(latest);
plan=plan.replace(latest,'**本轮最新：** '+summary);
const next='下一项沿实际更宽尺度及科学／光学粗细层并存继续量化共享资源与恢复；123°暖帧仍5.5MiB';
assert(plan.includes(next));plan=plan.replace(next,`当前${count}代次已修W3无绘制面过取并保原文件冷回程，25组软件输出不变；实际208°地景细化的整场增量及严格像素差异见[W3组合](evidence/experience-wide-resource-2026-10-02.md)。下一项量化实际宽场W3＋星座／地景暖帧驻留与传输；Moon123°仍5.5MiB，W3 North139°仍12MiB，科学／光学粗细与完整恢复保持`);
plan=plan.replace('## 阶段交接审视与优化（2026-10-01）','## 阶段交接审视与优化（持续更新，2026-10-02）');
const rows=plan.split(/\r?\n/);const row=rows.findIndex(line=>line.startsWith('| 1：共享图像可见需求'));assert(row>=0);
rows[row]=rows[row].replace('出屏需求修复及后续银河源像素窗口已接生产并绑定软件原质量/回程/恢复和原生API片段。',`当前${count}代次W3请求复用实际绘制几何，普通软件W3需求少2–5MiB、原图保持；真实208°空出的资源触发既有地景细化，整场模型14→18MiB／GPU10→16MiB，不能计总量下降。出屏需求修复及后续银河源像素窗口已接生产并绑定软件原质量/回程/恢复和原生API片段。`);
await fs.writeFile(planPath,rows.join('\n'));
const architecturePath='project_context/architecture/runtime-and-domain.md';let architecture=await fs.readFile(architecturePath,'utf8');
const anchor=architecture.split(/\r?\n/).find(line=>line.startsWith('An independently optional wide-sky image layer'));assert(anchor);
const fact='`sky-hips-tile-mesh.ts` owns the twelve immutable16-division base geometries shared by rendering and W3 request footprints. The inclusive spherical selection remains the conservative candidate set; W3 suppresses only a face whose same exact-frame, camera, horizon and viewport mesh submits zero triangles. Invalid/unknown footprints retain demand, and this draw certificate does not certify scientific coverage. `use-sky-wide-field-w3.ts` consumes current wanted images and suspends unused decoded handles into the existing bounded immutable-file cache; W3 has one published resolution, so dormant faces are not coarse fallbacks. Optical coarse/fine retention and all source identities, tessellation, original pixels, queue concurrency and budgets remain unchanged. Reduced celestial demand can let the existing landscape owner select detail; evaluate that integrated refinement separately from avoided W3 bytes rather than asserting total-memory savings. Software pixels, encoded-file reuse and Node footprint cost do not establish native/driver/OS allocation, target frame rate, full composition or final quality.';
assert(!architecture.includes(fact));architecture=architecture.replace(anchor,anchor+'\n\n'+fact);await fs.writeFile(architecturePath,architecture);
const screenPath='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';
await fs.appendFile(screenPath,'\nW3广角请求复用`sky-hips-tile-mesh.ts`的实际基础面几何、完整已绘相机／观察帧／视口与地平剪裁，只排除无提交三角形的瓦片；无效／未知保需求，不把绘制空结果当科学coverage。该单分辨率层的非当前瓦片只保原有界文件并释放Hook解码引用，光学粗细fallback保各自规则；转向返回需成功重新解码，hide／出版／Canvas替换退休原owner。避开W3需求可能触发既有地景细化，整场驻留／传输与目标内存必须连同细图和粗fallback计，不从局部节省宣称整场改善。已有源、预算、档位和完整体验要求保持；开发工具／软件输出和编码文件证据不能替代目标验收。\n');
const evidence=`# W3实际绘制需求、冷文件与整场组合（2026-10-02）

Goal active、无预算、未完成；工作位置和HEAD72e65cf3保持。沿唯一PLAN责任1／3继续，全部33项、商业选择和排除理由保持。源码只改共享HiPS几何owner、绘制调用、W3消费及对应回归／两Context；6项其他修改、配置和冻结候选保持。绑定见[${count}事件回执](experience-wide-resource-binding-2026-10-02.json)。

原W3球面帽选出的资源包含绘制器实际不提交的面。复用原16格基础几何后，85／123／139／全天条件的需求7→3、10→5、10→7、12→10，源RGBA模型分别少4／5／3／2MiB。该模型只计选择来源，软件工具预解码全部输入，不能视为物理内存测量。零三角形判断沿原相机／时刻／视口／地平，未知保留；未改源像素、网格、科学coverage、价格或队列／GPU额度。W3无粗细层，离开视口只转冷文件；合法光学仍保粗细图。冻结修前生产Hook的真实绘制反例失败，当前通过；真实request／loader回调核冷返回无新HTTP、成功再解码与hide释放。30项受影响检查通过只证明各自机制。

复用当前BFF元数据、保存报告和校验后的本地出版，未重新下载月面或研究选型。25组真实整场软件输出保原身份／完整RGBA逐像素相同，其中SDSS M51粗图、粗细同场、细图、回程暖帧无重复上传。大视场GPU重传未解决：Moon123°5,767,168B、W3 Moon123°4,194,304B、North139°12,582,912B。Node暖态新增网格需求成本在四个条件p95约0.80–1.34ms；这不是 native FPS 或总CPU预算。

实际开发器先保修前完整208.3863689069151°视图，修后重放同输入得到完全相同相机。原输入计算错误使拟139°实际到208°，原文件名保留，绑定只用实测值。W3文件12→8、少4MiB来源需求及236,??编码字节的实际值见绑定。释放出的额度使原地景策略从overview选择detail；匹配该相机的软件源RGBA模型14→18MiB、GPU暖驻留10→16MiB，warm上传均0。故本轮不能宣称整场内存下降，细化的质量／总峰值与目标开销仍待验。软件原图42,337像素最大差45；实际原ROI26,510像素最大差50，均DIFFERENT，不把全部原生差异自动归因于地景。

同一W3启用范围内208→84.999994→208.38636890691507°，8份W3文件SHA1／序号保持；末位FOV漂移保原值，不称与初次相机字节相同。公开Vega信息／来源页确实显示恒星来源，Sky编码文件0；Back同完整末次相机恢复8份W3并重新取文件，Vega选择／资料状态保持。此Canvas ROI801像素最大差15（799在x1、另2点）；不是完整资料／WXML旅程通过。第一次返回只收起资料，Map文件guard拒绝仍在Sky的状态；记录一次工具失败及实际状态纠正，未重复该点击或重启会话。随后公开页面返回Map、文件0，再用原Context重进North45／4051星／2目标／无选择或modal，9文件934831B、seq43..51。完整North原ROI与1325末次相比10像素max1，保持DIFFERENT。

普通watch00:25:22完成后只一次刷新、立即实际PNG并查看应用后才SDK续接；复用同IDE／BFF60065／现有watch。canonical revision1、PUT0、原瞬间／指纹及真实Sky模块175d…保持。最终PNG和本轮所有实际截图已查看；Source界面可见，但Sky普通WXML仍FAILED_DEVTOOLS。首次类型命令误用根TS6，留下弃用／SCSS诊断和一个新fixture的字面类型错误；fixture已注解，项目声明的本地类型命令通过，未改项目配置或压制诊断。

全部输出、原图、出版哈希、修前代码、trace前缀、有效检查及错误日志均由绑定保留。旧875／1254严格失败仍有效；总native／GPU／OS／GC、首屏／帧时、弱网／包体／成本、完整识别／时间／跟踪／旋转校准、Android／iOS／新版月面及独立审查GAP继续开放。没有手机操作、采购／联络／部署／Git提交推送或新候选。下一依赖仅由PLAN控制：宽场W3＋星座／地景的真实暖帧压力和完整组合／恢复，不循环旧启动或LRU参数。
`;
await fs.writeFile(task+'/evidence/experience-wide-resource-2026-10-02.md',evidence.replace('及236,??编码字节的实际值见绑定','，编码字节差额的实际值见绑定'),{flag:'wx'});
await fs.appendFile(task+'/PROGRESS.md',`\n## 2026-10-02 / ${count}事件：W3实际绘制需求与整场资源组合\n\n${summary}\n\n修前生产反例失败／当前通过；原Node两次TS6错入口及fixture类型修正、一次Map-only guard因首Back只收起modal而拒绝均保真实记录，改用声明项目类型入口和实测页面状态。源与原图／严格差异／所有未验边界见本轮绑定，不由检查数量或局部截图验收整体。\n`);
const handoffPath=task+'/HANDOFF-2026-10-01.md';const handoff=await fs.readFile(handoffPath,'utf8');
const note=`**2026-10-02当前执行入口：** 已沿原Goal继续到${count}事件的[W3整场资源组合](evidence/experience-wide-resource-2026-10-02.md)。最新源码／服务／watch／像素资格及下一依赖只见[STATE](STATE.md)与唯一[PLAN](PLAN.md)；以下阶段交接事实不升级为本代目标验收。Goal保持active、无预算、未完成，6项保留修改及全部商业／原始义务不变。\n\n`;
assert(!handoff.includes(note));await fs.writeFile(handoffPath,handoff.replace('## 1. 先恢复什么',note+'## 1. 先恢复什么'));
console.log(JSON.stringify({eventCount:count,contextOwners:2,plan:'unique',goal:'active,unbudgeted,incomplete'}));
