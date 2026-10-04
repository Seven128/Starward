import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const current='**当前：Goal active、无预算、未完成；只改云观星，大字号暂停、手机暂不可用。** 当前推进整场环境与浏览识别组合。共享大气低太阳暖色和照片／程序地景晨昏亮度已有有限修正；实际软件组合的局部／全天、开关／缩回、身份／点选和释放成立，环境整体与目标质量仍开放。此前地景alpha／投影、SAO渐进加载／真实身份链及退役Hook修复保原证据。普通v53-final仅准备、未打开／推手机，v52冻结保原字节；原生末次v47／s8欢迎页只保历史，当前SDK／Sky／原生Context／Canvas＋WXML未知。全部33项、商业理由与交付义务保持。';
const module='[当前晨昏与整场组合](evidence/experience-environment-composition-2026-09-30.md)及[绑定](evidence/experience-environment-composition-binding-2026-09-30.json)保新参考条件／原图、修前反例与当前生产软件输出；暖色像素通过不等于整体对齐。暮光带宽／强度、固定照片照明及完整图层仍需按影响在组合中评价，不继续循环单色精调。此前[地景边界](evidence/experience-landscape-boundary-2026-09-30.md)保原alpha／GPU／遮挡责任；[SAO组合](evidence/experience-sao-composition-2026-09-30.md)、v51共享失败与v50光栅保持原范围。下一依赖回到共享资源共存／恢复及正常暖帧上传／峰值，再集中组合识别、面状辅助及完整交互，见PLAN阶段3。M82原因、普通覆盖层和目标旅程仍开放。';
const recovery='**恢复与证据：** [v53当前绑定](evidence/experience-environment-composition-binding-2026-09-30.json)持当前源码、v53候选、实际软件组合与新运行epoch。60065／内部55803、PID5304／exec46700由已确认旧进程／监听不存在后恢复；模块及中文出版hash不变。旧Context读回404，新PUBLIC_REFERENCE正式点Context revision1保同一地点与当地09月30日21:50:33意图，GET一致、PUT0，见tmp/v53-context-readback.json和tmp/v53-current-public-report.json；原生Context未知。此前[v52绑定](evidence/experience-sao-composition-binding-2026-09-30.json)、[v51](evidence/experience-texture-failure-pressure-binding-2026-09-30.json)、[v50](evidence/experience-artwork-raster-binding-2026-09-30.json)、[v49](evidence/experience-area-display-support-binding-2026-09-30.json)和其它冻结证据各保原时刻／输入／runtime，不升级新版合成或审查。新报告和软件图不代替实际原生运行。参考原图已经保存；原标签页4当前不在，临时viewport已恢复，不重复取同条件参照。';
for(const name of ['PLAN.md','STATE.md','INDEX.md']){
  const file=task+'/'+name,original=await fs.readFile(file,'utf8');
  await fs.writeFile(task+'/tmp/v53-'+name+'-before',original,{flag:'wx'});
  let text=original;
  const start=text.indexOf('**当前：'),end=text.indexOf('[v49源显示支持]');assert(start>=0&&end>start,name);
  text=text.slice(0,start)+current+'\n\n'+module+'\n\n'+text.slice(end);
  const recoveryStart=text.indexOf('**恢复与证据：**'),recoveryEnd=text.indexOf('[当前工具边界与技能分流]');
  assert(recoveryStart>=0&&recoveryEnd>recoveryStart,name);
  text=text.slice(0,recoveryStart)+recovery+'\n\n'+text.slice(recoveryEnd);
  if(name==='PLAN.md'){
    const old='当前地景边界已用实际发布的完整两档PNG／RLE、生产GPU与同帧点选核过，接缝／局部／全天及开关／缩回无本轮反例，不再重复同条件核查。实际暮光仍较平淡；现有散射显示的通道上限与太阳低空混合是实现参数，原文未固定这些数值。参考页目前调试同步失败，没有新画面；保留该页，取得新的可用状态后在可比正式地点、精确时刻／时区、相机／视场定义、视口、模式和图层下评价并修昼／暮／夜层次与辅助显隐、地景轮廓、银河／星点／星座识别及局部面状淡化／縮回。其间继续共享资源共存／恢复和其它可独立完成的组合义务，不循环启动、开新标签页或以新截图数代替交付。实际差距归已有显示／环境／投影／加载owner集中处理。模拟效果不依赖逐点现场测量，仍须有完整场景质量。';
    const next='当前地景边界的实际发布PNG／RLE、生产投影及同帧遮挡已有适用证据，不重复同条件核查。本轮已取得同正式测试点、暂停时刻和可比视场的新参考，沿既有大气／地景owner修低太阳颜色与前景晨昏亮度；实际软件组合覆盖局部／全天、照片／程序／OFF、红光及返回，身份／点选不变，见[当前环境证据](evidence/experience-environment-composition-2026-09-30.md)。参考亮度／带宽和固定照片照明仍有差异，不据暖色样本宣布整场质量完成，也不以现场测量或全光谱算法加重普遍前置。此次有限修正结束后，下一步优先处理组合浏览中的共享资源共存／恢复和正常暖帧上传／峰值，再集中星点／星座识别、辅助显隐／面状淡化／缩回及公共时间／跟踪／返回交互。后续参照仍记录地点、时刻／时区、朝向、视场定义、视口、模式、图层与源差异；原图已保存，原标签页不在，不为重复同条件截图重开。实际差距归已有显示／环境／投影／加载owner，不循环局部精调、启动或以截图数量衡量进度。';
    assert.equal(text.split(old).length,2);text=text.replace(old,next);
    text=text.replace('60065与当前Context已绑定；只有源码／协议实质变化才重建必要运行服务。','60065与新epoch的公开Context已绑定；必要服务仅在实质源码／协议变化或已证实服务停止时恢复，不因等待超时重建。');
    text=text.replace('当前v52-final仅准备、未打开／推手机，冻结v51与各轮证据保持；','当前v53-final仅准备、未打开／推手机，冻结v52／v51与各轮证据保持；');
  }
  await fs.writeFile(file,text);
}
console.log('Updated existing PLAN, STATE and INDEX; all scope/requirement sections retained');
