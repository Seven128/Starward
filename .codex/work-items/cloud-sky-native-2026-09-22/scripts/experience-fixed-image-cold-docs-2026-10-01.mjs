import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const summary='[固定单图冷文件与组合](evidence/experience-fixed-image-cold-2026-10-01.md)及[1254事件绑定](evidence/experience-fixed-image-cold-binding-2026-10-01.json)：真实Moon局部→123°宽场→局部修前删除／重取1,595,187B，现Moon／Mars／Mercury／OPAL／Galaxy共用单图生命周期、原额度和恢复；当前Moon序号13保持，完整相机及局部像素不变。watch22:11:24仅一次刷新，来源hide文件0；未结束尺预览按生命周期撤回、暂停13:50:37.599及Moon跟踪／相机在Back保持；收起／退出0／同Context重进North45、9文件934,831B、原revision1／PUT0／模块成立。两条来源返回原ROI799像素／max16失败，均在x1，另测内部0差异不升级整屏通过；旧875失败保持。6无关修改／两配置／三冻结候选保持。总内存／帧时、普通WXML FAILED_DEVTOOLS、完整校准／旅程、手机新版月面／包体成本及独立审查仍开放；下一依赖接回整场识别／尺度／时间／跟踪与共享资源并存，全部33项和商业范围保留。';
for(const [file,label] of [['PLAN.md','本轮最新'],['STATE.md','最新源码／原生代次'],['INDEX.md','本轮最新']]){
 const target=task+'/'+file;let body=await fs.readFile(target,'utf8');const pattern=new RegExp('^\\*\\*'+label+'：\\*\\* \\[暮光梯度与整场组合\\][^\\r\\n]*','m');
 assert(pattern.test(body),file+' current1113 paragraph missing');body=body.replace(pattern,'**'+label+'：** '+summary);
 if(file==='PLAN.md'){
  const anchor='最新1113暮光梯度与间接光显示近似已接同一shader';assert(body.includes(anchor));body=body.replace(anchor,'此前1113暮光梯度与间接光显示近似已接同一shader');
  const next='下一项回整体浏览识别→搜索资料／来源→时间／跟踪／返回与共享资源组合，环境残差随整场核对，不继续单张逐参数精修';
  assert(body.includes(next));body=body.replace(next,'当前1254单图生命周期已接月面／Mars／Mercury／四种OPAL／Galaxy，实际Moon同Canvas宽场回程不重取正文，公开时间／跟踪／来源hide／Back及退出恢复保各自边界，来源原ROI边缘差异仍失败。下一项把这条共享责任接回整体浏览识别、面状尺度与粗细层并存，按实际源尺寸及加载／解码／GPU路径核总资源和恢复；完整搜索资料／来源／时间／跟踪／返回义务继续，环境残差随整场核对，不继续单张逐参数精修');
  const resource='708及最新1113昼暮夜／梯度组合已接责任3有限改善';assert(body.includes(resource));body=body.replace(resource,'708及1113昼暮夜／梯度组合、1254固定单图冷文件／回程已接责任3有限改善');
 }
 await fs.writeFile(target,body);
}
const progress='\n## 2026-10-01 固定出版单图冷文件与整体浏览／时间／来源组合（PROGRESS，1254）\n\n- 当前真实Moon在局部／123°宽场／局部重复获取1,595,187B的反例成立，序号24→34；共用已有冷文件／解码owner后同Canvas序号13保持。Moon／Mars／Mercury／OPAL／Galaxy迁入同一单图生命周期，原资格、额度、并发、失败重试和页面退休保留。\n- 生产Moon真实反例修前1失败、最终相关检查36通过，类型／Context／diff通过；其他表面／云带保实际hook／受控原生回调开发层，独立共享和最终审查GAP。\n- 普通watch22:11:24一次刷新后立即实际PNG、看见应用再SDK；原完整相机下修前／当前Moon局部及同Canvas回程像素0差异。公共时间实际预览22:00而非最初22:30意图，偏移／更正记录保留；未结束尺预览来源hide取消，暂停13:50:37.599来源Back保完整相机／跟踪。两次来源hide和最终退出文件0；最终原Context North45、9文件934,831B、原revision1／PUT0／模块。\n- 两次Source返回原ROI严格比较799/max16失败，全部在x1；单独内部0差异不改写原比较。875旧失败及普通WXML FAILED_DEVTOOLS保持。新版月面仍未推手机，不认证整体质量／物理手势／目标资源或最终验收。\n- [完整证据](evidence/experience-fixed-image-cold-2026-10-01.md)、[1254绑定](evidence/experience-fixed-image-cold-binding-2026-10-01.json)及原始PNG／日志均冻结，1113与1140前缀、6保留修改／两配置／三候选保持。无素材重获取加工、设备／新watch窗口、Git提交推送或发布。Goal active、无预算、未完成，下一依赖只见唯一PLAN，全部33项和商业理由保留。\n';
await fs.appendFile(task+'/PROGRESS.md',progress);
console.log(JSON.stringify({updated:['PLAN.md','STATE.md','INDEX.md','PROGRESS.md'],currentEventCount:1254,goal:'active,unbudgeted,incomplete'}));
