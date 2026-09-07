import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const task=path.resolve(import.meta.dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const median=a=>{const v=[...a].sort((x,y)=>x-y),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;};
const stats=values=>({count:values.length,minimum:Math.min(...values),median:median(values),maximum:Math.max(...values)});
const weights={hierarchy:.25,typographyIcons:.2,density:.2,crossPageConsistency:.2,details:.15};
const freeze=await read(path.join(task,'retests/v2/frozen-inputs.json'));
for(const f of freeze.files)if(sha(await fs.readFile(path.join(freeze.repository,f.path)))!==f.sha256)throw Error('Changed frozen input '+f.path);
const trials=[],pooled={A:{initial:[],final:[]},B:{initial:[],final:[]}};
for(const experiment of [2,3,4]){
 const root=path.join(task,`experiment-${experiment}`),assessment=await read(path.join(root,'anonymous-assessment.json')),key=await read(path.join(root,'review-key.json')),resources=await read(path.join(root,'resources.json'));
 const mapping=new Map(key.entries.map(x=>[x.anonymousId,x.candidateId]));
 if(assessment.candidates.length!==6)throw Error('Expected six paired candidates');
 const hashes=[],groups={};
 for(const c of assessment.candidates)for(const stage of ['initial','final']){
  if(c[stage].pages.length!==2)throw Error('Expected both pages');
  for(const page of c[stage].pages){const calculated=Object.entries(weights).reduce((s,[k,w])=>s+page.visual[k].score*w,0);if(Math.abs(calculated-page.weightedScore)>.0001)throw Error('Score formula mismatch');const actual=sha(await fs.readFile(path.join(root,page.image)));if(actual!==page.imageSha256)throw Error('Reviewed PNG changed');hashes.push({candidate:c.candidateId,stage,page:page.page,sha256:actual});}
 }
 for(const group of ['A','B']){
  const cs=assessment.candidates.filter(c=>mapping.get(c.candidateId)?.startsWith(`e${experiment}-${group}-`));if(cs.length!==3)throw Error('Expected three directions per group');groups[group]={};
  for(const stage of ['initial','final']){const values=cs.flatMap(c=>c[stage].pages.map(p=>p.weightedScore)),passing=cs.filter(c=>c[stage].pages.every(p=>p.weightedScore>=4&&Object.keys(weights).every(k=>p.visual[k].score>=3))).map(c=>c.candidateId);pooled[group][stage].push(...values);groups[group][stage]={...stats(values),directionCount:3,visualThresholdCount:passing.length,visualThresholdAnonymousIds:passing};}
  groups[group].formalRevisionRounds=Math.max(...resources.boards.filter(b=>b.candidateId.startsWith(`e${experiment}-${group}-`)).map(b=>b.round));
 }
 const result={experiment,groups,pngHashesVerified:hashes,rawExportCount:resources.boards.length,visualBGroupThresholdMet:groups.B.final.visualThresholdCount>=2,userPreference:assessment.userPreference??null,fullProductPassEstablished:false,cost:{inputTokens:null,outputTokens:null,reason:'No reliable independent per-group billing attribution; whole-goal totals are not experimental costs.'}};
 trials.push(result);await fs.writeFile(path.join(root,'ab-result.json'),JSON.stringify(result,null,2)+'\n');
}
const result={version:'design-method-v2',frozenFilesVerified:freeze.files.length,model:freeze.model,modelPolicy:freeze.modelPolicy,independentPairedTrials:3,trials,pooled:Object.fromEntries(Object.entries(pooled).map(([g,s])=>[g,Object.fromEntries(Object.entries(s).map(([stage,v])=>[stage,stats(v)]))])),visualBPassingTrials:trials.filter(t=>t.visualBGroupThresholdMet).length,repeatabilityEstablished:false,userPreference:'New v2 preference not supplied; v1 all rejected, separate historical result',coverageAndHandoff:'Completed once on v1 resources, not re-labelled as v2 coverage or current WEAPP proof',production:'unchanged',limitations:['Same task, fixture and model in a small sample; cannot generalize to other projects or models.','Same independent reviewer rated anonymized images across trials; review order and memory can influence subjective scores.','Main task supplied defect observations during allowed revisions; costs and intervention effort are not reliably normalized.','No phone/native gesture runtime or actual Tencent map appearance verification.','Geometry checks inspect bounds/opaque source colors; they do not certify aesthetics, complex paint contrast or native hit dispatch.']};
await fs.writeFile(path.join(task,'v2-summary.json'),JSON.stringify(result,null,2)+'\n');
const fmt=n=>n.toFixed(3).replace(/0+$/,'').replace(/\.$/,''),lines=['# 设计方法 v2：三次独立成对试验','',`三个样本使用同一冻结版本，${freeze.files.length}份冻结输入哈希复核相同。初稿与最终共72张评审PNG逐一核对SHA和原五维权重计算。B达到预设组视觉门槛的样本为${result.visualBPassingTrials}/3；用户新偏好未收到，完整产品/手机验证未建立，不宣称稳定审美收益。`,'','|样本|组|初稿最低 / 中位|最终最低 / 中位|最终两页达标方向|正式修订轮数|','|---|---|---|---|---|---|'];
for(const t of trials)for(const g of ['A','B']){const q=t.groups[g];lines.push(`|${t.experiment-1}|${g}|${fmt(q.initial.minimum)} / ${fmt(q.initial.median)}|${fmt(q.final.minimum)} / ${fmt(q.final.median)}|${q.final.visualThresholdCount}/3|${q.formalRevisionRounds}|`);}
lines.push('','门槛保持不变：每个B样本至少2/3方向两页均≥4，所有单项≥3；还需要实际产品确认与用户至少认可一个方向。这里表格的“达标”仅指视觉数值，不能抵消产品或偏好缺口。','','模型及档位继承调用任务；本组实测宿主为gpt-6-astra/high，不是Skill固定设置。各组费用与独立用量unknown，不填0。首次版本六组用户全部拒绝，完整保留在experiment-1与user-feedback.json，不计入这三次同版本统计。','','第一版已完成24状态/主题/尺寸板、组件读回与新会话局部改文案测试；它们仍只证明该版本上的运行结果。没有把旧覆盖、交接或.fig冒充v2新设计完整覆盖。当前生产未改，用户未选定。','','本轮失败包括：v2首样本A横向布局轴错误；复验A minHeight=0运行失败，检查无残留后仅技术修正；其他初稿边距/装饰流布局/裁切问题。原始脚本、DOM错误、PNG、同轮结构及全部正式修订保留。通用检查器的历史失败保留，最后稿可见边界通过也不代表全历史包退出0。','','独立完整评审和逐页证据：',[2,3,4].map(n=>`- [样本${n-1}](experiment-${n}/anonymous-assessment.md)`).join('\n'),'','局限：同一任务与同一评审者的小样本；主任务在允许修订内指出实物缺陷；无法标准化人工干预成本。不能推出其他产品、模型或工具的优劣。');
await fs.writeFile(path.join(task,'v2-summary.md'),lines.join('\n')+'\n');console.log(JSON.stringify({pairedTrials:3,reviewedPngHashes:72,visualBPassingTrials:result.visualBPassingTrials,pooled:result.pooled}));
