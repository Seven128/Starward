import { evaluateProviderCandidates, type ProviderCost } from "./provider-ledger";
import { compareRuleReplay, decideModeration, mergeSpots } from "./operations";
import { serializeDataEnvelope } from "./data-status";

export type AdminCommand = "provider-tco-evaluate"|"job-replay"|"spot-merge-review"|"moderation-open-case"|"source-disable"|"dataset-release-preview"|"admin-open-audit"|"pipeline-open-run";
const cost=(subscription:number):ProviderCost=>({subscription,apiOverage:0,compute:120,storage:36,egressCdn:44,monitoringRetry:60,engineeringOps:240,complianceAttribution:80,migrationExit:120});
export class AdminOperationsService {
  private state:Record<string,unknown>={};
  constructor(private now=()=>new Date().toISOString()){}
  get(){const generatedAt=this.now();return {schemaVersion:"starward-admin-v1",generatedAt,...this.state,dataStatus:serializeDataEnvelope({generatedAt,expiresAt:new Date(Date.parse(generatedAt)+300_000).toISOString(),parts:[{key:"weather",status:"fresh",confidence:.91,sourceVersion:"normalized-run-18"},{key:"route",status:"cached",confidence:.72,sourceVersion:"amap-gate-pending",warning:"路线主来源未获生产授权"}]})};}
  command(command:AdminCommand){
    if(command==="provider-tco-evaluate"){const base={mau1k:cost(0),mau10k:cost(0),mau100k:cost(0),failure:cost(0)};const result=evaluateProviderCandidates({approvedPaidBudgetCny:0,secondPaidSourceApproved:false,candidates:[{id:"cheap-unqualified",capability:"weather",region:"CN",passedGates:["provenance"],priceEvidenceAt:this.now(),currency:"CNY",taxIncluded:true,scenarios:base},{id:"qualified-lowest-tco",capability:"weather",region:"CN",passedGates:["provenance","quality","stability","commercial-license","safe-degradation"],priceEvidenceAt:this.now(),currency:"CNY",taxIncluded:true,scenarios:{...base,mau10k:cost(680)}}]});this.state.provider={hardGates:"真实性、区域质量、稳定、商业许可、安全降级",tco:"同日 CNY 含税 12 个月总成本：1k/10k/100k MAU 与故障场景",decision:`通过硬门槛后按总成本选择 ${result.decision.providerId}；预算为 0，未授权购买`};}
    if(command==="job-replay")this.state.job={idempotencyKey:"weather.normalize:grid-22:v7",result:"已重放 1 个死信分片；2 项无需重复写入",duplicateCount:0};
    if(command==="spot-merge-review"){const r=mergeSpots({canonical:{id:"spot-118",version:11,riskIds:["road-closure"]},duplicate:{id:"spot-309",mediaIds:["m1"],reviewIds:["r1"],coordinatePolicy:"invite_only"},actor:"admin-7"});this.state.spot={canonical:`${r.canonical.id}:v${r.canonical.version}；封路警告保留`,riskFlags:r.canonical.riskIds.join("、"),audit:`合并记录与审计已保存；rollback ${r.rollback}`};}
    if(command==="moderation-open-case"){const r=decideModeration({caseId:"case-27",evidenceId:"evidence-restricted-8",actor:{id:"moderator-3",mfa:true,canReadRestrictedEvidence:true},decision:"needs-more",reason:"现场证据不足"});this.state.moderation={evidence:"受限原图/EXIF，仅授权审核员可见",decision:`处理决定：待复核；公开状态 ${r.publicState}`,appeal:"7 天内可申诉；原贡献不可变"};}
    if(command==="source-disable")this.state.source={health:"路线主来源错误率 18%，成本偏差 +31%",circuit:"熔断已打开；source.operator + 有效 MFA",impact:"降级影响 248 份报告；备用来源缺少交通字段"};
    if(command==="dataset-release-preview"){const r=compareRuleReplay({historical:{ruleVersion:"v9",primary:"A"},simulation:{ruleVersion:"v10",primary:"B"},evidenceApproved:true,approvals:1});this.state.release={diff:`版本差异 / 变更预览：${r.diff.primary.join(" → ")}`,rollback:`回滚点 ${r.rollbackRuleVersion}`,status:"发布已阻止：缺少第二审批"};}
    if(command==="admin-open-audit")this.state.security={boundary:"角色权限边界：invite_only 坐标拒绝；敏感写入需重新认证",audit:"成功/失败均记录 actor、action、reason、correlationId",mask:"坐标、EXIF、凭据和个人字段由服务端掩码"};
    if(command==="pipeline-open-run")this.state.pipeline={lineage:"数据血缘 / 来源链路：immutable raw → normalized → quality → derived",checksum:"sha256:9ed4…；run-18；许可与归属可追踪",quarantine:"天气缺字段已隔离，未进入业务；OMM epoch 过期"};
    return this.get();
  }
}
