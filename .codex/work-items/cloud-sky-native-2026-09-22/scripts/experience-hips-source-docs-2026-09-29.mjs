// Update the existing single plan and its recovery pointers after real evidence.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22");
const report="evidence/experience-hips-source-binding-2026-09-29.md";
const checkpoint="**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。** 本輪C/B3核实际同HiPS FITS／JPEG及独立Atlas WCS，修正共享网格图像两轴，W3广域／光学候选共用；真实软件GPU及旧轴反例已核。M42三档源绑定PNG／TAN FITS候选保真实非有限为透明、有限暗色仍为实测，已核共享GPU缺测／亮部；尚未接入出版／BFF／Mini链，源条带与整体质量仍未修完。详[共享坐标与源绑定候选]("+report+")。最新clean-v17只含共享轴修复，未打开；M42 PNG不在该包。v16及旧候选保历史条件，旧HiPS位置证据不能认证新版，v12当前Frame／Context／4B夹具仍未知。未新开原生窗口、重试取消提权或推手机。完整旅程、B3/C质量／配准／合法覆盖、真实姿态／校准／后台、Android/iOS／资源性能／官方包体／费用／独立审查义务保持，新月面未获本代手机验收，Goal未完成。";
const planPath=path.join(item,"PLAN.md");let plan=await fs.readFile(planPath,"utf8");
const oldDependency="**当前可执行依赖：复用新M42原始成对输入，核成品与coverage的确切关联及源质量的适用处理；已有会话可安全恢复时核一个最新v16组合。**";
assert(plan.includes(oldDependency),"plan_changed_since_read");
plan=plan.replace(oldDependency,"**当前可执行依赖：复用已核M42三档源绑定候选，在原出版／加载链完成版本化接入与旧offer兼容；已有会话可安全恢复时核一个最新v17组合。**");
plan=plan.replace("最新无诊断clean-v16已构建、尚未打开。","最新无诊断clean-v17已构建、尚未打开，含共享HiPS两轴修复；M42 PNG仍是未接入候选。");
plan=plan.replace("再用一个v16批量核","再用一个v17批量核");
const oldSourceParagraph="   当前已有[真实M42原始输入](evidence/experience-w3-atlas-validity-2026-09-29.md)：同coadd的INT／COV与SIN WCS取得；源零coverage／NaN与低响应条带分清，JPEG亮度不能推定有效性。先在原出版owner核成品／原始coverage关联、重采样与适用降级，再决定版本化资源；局部最近点不能直接成为全图mask或回填153张覆盖率，不改CRPIX掩盖源质量。原始样本、现有下载及已失败CDS主／备用不重复；不强加全153科学mask普遍完成门槛，已知缺测／错误位置／失真合成仍须修复。沿既有合同／共享加载／注册／GPU／来源消费者接合，不隐藏对象凑质量，不让纹理精修独占主线。缺独立输入时转同阶段可执行组合／恢复差距；全部合法覆盖、B3/C整体质量、完整旅程和目标义务保持。";
assert(plan.includes(oldSourceParagraph));
plan=plan.replace(oldSourceParagraph,"   [本輪共享坐标／源绑定候选]("+report+")已确认JPEG列NW／行NE及FITS反行，修复共享HiPS owner，W3广域／光学候选一起迁移；旧轴反例、独立Atlas WCS及实际GPU相互核对，不能用旧HiPS位置证据认证v17。TAN目标图／银河全景等独立证据保条件。复用20个实际HiPS原始瓦片与M42自有完整TAN几何，三档非有限样本保透明，有限黑色不冒充缺测；候选已核共享注册／GPU亮部和缺测呈现，尚未出版或接入实际加载。下一步在原影像出版owner完成新像素身份／PNG和处理说明／几何／来源及v1-v2兼容，再核真实消费者；有限样本比例不能改名为无伪影科学有效率，原Atlas coverage不是候选mask，源条带及整体质量仍开放。原始样本、已成功瓦片和已失败CDS主／备用不重复；不强加全153科学mask普遍完成门槛，不填洞／改CRPIX／隐藏对象凑质量。沿既有合同／共享加载／注册／GPU／来源链接合，不让纹理精修独占主线。缺独立输入时转同阶段可执行组合／恢复差距；全部合法覆盖、B3/C整体质量、完整旅程和目标义务保持。");
plan=plan.replace("新M42原始SIN成对输入仅定位局部科学缺测／源条带，未取得匹配CDS成品头／精确HiPS重采样或产品mask；","已取得匹配同HiPS FITS／JPEG，修共享轴错误并制备三档自有TAN源绑定候选，缺测alpha／亮部有软件GPU证据；尚未版本化接入，有限源条带仍存在；旧CDS成品头未取得，不将新采样冒充旧JPEG精确mask；");
plan=plan.replace("匹配CDS成品头／HiPS关联及适用有效性处理仍未核，已失败主/备用同请求不重复。","同HiPS成对与坐标已核、M42三档自有源绑定候选已生成；版本化出版／BFF／Mini加载链仍未接，有限源条带仍存在。新PNG有限比例不认证无伪影或旧JPEG精确mask；已失败CDS主/备用同请求和已取输入不重复。");
plan=plan.replace("当前context/resource均pass、held/active0；","截至该历史轮context/resource均pass、held/active0，本轮未重读服务状态；");
const oldRestore=/当前恢复补充：最新prepared clean-v16，[\s\S]*?参考标签保留，不新增viewport覆盖。/;
assert(oldRestore.test(plan));
plan=plan.replace(oldRestore,"当前恢复补充：最新prepared clean-v17，SHA256 79fc7b725f35190c094862b58a34fa35cf57e602e8de5a60a9303194ceac7a9e，257文件／4,476,370 rawB、main2,084,707B；与v16原始量相同、内容不同。仅共享HiPS轴修复入包，M42三档PNG仍在ignored候选，尚未版本化接入；没有打开v17或新版原生Frame／Context读回。v16与旧候选构建／运行事实保原条件，无新窗口、常驻服务、云／手机动作或提权重试；参考标签保留。" );
assert.equal(plan.match(/\*\*当前可执行依赖：/g)?.length,1);
await fs.writeFile(planPath,plan);
for(const file of ["STATE.md","INDEX.md"]){
 const target=path.join(item,file);let text=await fs.readFile(target,"utf8");
 assert(text.includes("**当前检查点："));text=text.replace(/\*\*当前检查点：[\s\S]*?(?=\r?\n\r?\n)/,checkpoint);
 if(file==="STATE.md")text=text.replace(/最新准备：clean-v16，[\s\S]*?(?=\r?\n\r?\n)/,"最新准备：clean-v17，SHA256 79fc7b725f35190c094862b58a34fa35cf57e602e8de5a60a9303194ceac7a9e，257文件／4,476,370 rawB；尚未打开，仅共享轴修复入包，M42 PNG未接入。v16及旧候选原指纹保留，v12最后可靠恢复／4B夹具仍待核，未取得本代原生Frame／Context。当前依赖只见PLAN。");
 else text=text.replace("## 当前入口\n","## 当前入口\n\n[共享HiPS坐标与M42源绑定候选]("+report+")：两类瓦片同owner的轴修复、独立真实输入／GPU、三档自有TAN候选及缺测alpha，尚未版本化接入；未打开v17。当前依赖只看PLAN。\n");
 await fs.writeFile(target,text);
}
const progressPath=path.join(item,"PROGRESS.md");let progress=await fs.readFile(progressPath,"utf8");
const heading="## 2026-09-29 C/B3：共享HiPS坐标与源绑定候选";
assert(!progress.includes(heading));
progress=progress.replace("# 执行记录与证据入口\n","# 执行记录与证据入口\n\n"+heading+"\n\n核采用源实际FITS／JPEG与原Atlas SIN坐标，确认共享HiPS图像列／行接反并一次修复红外广域／光学候选责任；修前失败、CDS包装及独立原始方向、生产软件GPU旧轴反例／修后输出支持当前边界。以20个实际瓦片制备M42三档自有TAN／PNG候选，非有限保持透明、有限暗色保留，不填洞或掩盖有限源条带；共享GPU实际缺测和亮部检查通过。候选尚未接入出版／BFF／Mini链，v2清单、153张JPEG及v1旧offer未变，不认证全源科学覆盖率。详[证据]("+report+")。\n\n最新prepared v17含共享轴修复，未打开，M42 PNG不在包中。没有新增原生窗口、常驻服务、重复无响应RPC／取消提权、手机或云动作；v12Frame／Context／夹具仍未知。原完整旅程／质量／合法覆盖／目标资源性能／费用／独立审查与新月面本代手机验收保持未完成。Goal active、无预算；当前依赖仅PLAN，此条为过程记录。\n");
await fs.writeFile(progressPath,progress);
console.log(JSON.stringify({uniquePlanUpdated:true,checkpointUpdated:["STATE.md","INDEX.md"],progressEntry:heading}));
