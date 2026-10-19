# 正常 Sky A1 / 地形等待观察候选

2026-10-19。当前为 **A1 review-r3**：从当前完整源码构建，未选中 feedback、未预览、未绑定手机。沿原 `build-r17-normal-baseline-v3.mjs` 有限 `--observe-a1 --review-r3` 修订，唯一新 slot 为 `r17-normal-a1-review-r3`；不克隆 builder，不覆盖 r1/r2/gen25/gen26。身份仍为 normal / baseline / buildGeneration27 / probe v3，独有标签 **正常Sky关联 A1 r3**。

当前生产窗口恢复与原生刻度换算修复都已进入此整包。原 gen25 手机、A1 r1 collector HTTP、r2 SDK读数保各自历史身份，不升级成 r3 证据；gen26 UNKNOWN 继续约束手机交付。

## 当前实际身份

| 项目 | 值 |
| --- | --- |
| builder SHA-256 | `9c2a59408d28a4cd79c59e343d0dc30249a86b039de9227963f28f78c254e948` |
| pre-build source/template binding | `f76630fe3c39180d81e272fcef1c2c785018dc530ab6051b81f605e1fc4db472` |
| source manifest SHA-256 | `be6ab705002eac17d33b8107c6e64ef4f06f53039811938b9dafb6731a83a618` |
| complete source snapshot SHA-256 | `4771be5f6c4edc32ae363a05d742dc765ceba47d34edf68a99b78caad4b4116c` |
| 两份完整 bundle SHA-256 | `a2839caade3245fb9ec2cfcec172ce23ad3995ab08b774c6d7d714e68c0c6445` |
| source snapshot | 1,580 files；1,572 个原输入逐项读回；27 个 source delta |
| bundle | 338 files / 5,011,516 bytes |
| main | 2,022,137 bytes；余量 75,015 bytes |
| sky / content / spot | 1,349,680 / 1,041,374 / 598,325 bytes |
| compiled origin | 8798；沿既有私有 runtime 在内存派生，3 个 JS / 7 个同源字面量，无其它 origin |

完整项目 `tmp/r17-normal-a1-review-r3/project`，构建目录为该 trial 的 `source/apps/wechat-miniapp/dist/weapp-check-r17-normal-a1-review-r3`。精确 source/template/consumer binding、软件检查与预算由 [机器证据](R17-NORMAL-A1-PREPARATION.json) 和 manifest 拥有。官方上传预算与手机目标效果未验证。

## 完整正常路径和实测刻度修复

数学、memo、完整 accepted setter/ref/state/updater/equality、BSC/SAO、renderer/GPU/copy/caption、资源 demand/readiness/retirement 保留。15秒 metrics、20秒同次真实产品 Pause、hide/unmount/replacement-run 守卫、terminal、显式同 bytes 重试仍由原 owner 管理。

A1 继续用既有 addR17ACorrelation 和 strict dispatcher，增加有界 request/Page 边界及唯一 helper；原 v1/v2/v3 模板、历史 bytes 不改。地形继续在新 source staging 修改六个真实消费者，gesture marker/runtime 与真实 buildSource 绑定。异步标记仅支持已定义的 ready-before-blank 正向判断，不当同步可见性时钟或 adopted UI。

本修订只集成已审的实际生产修复：[窗口恢复](SKY-RULER-WINDOW-RESTORE.md)和[原生布局换算](SKY-RULER-NATIVE-CADENCE.md)。相对 r2 有七项生产输入变化，精确清单在 `historical-a1-preservation.json`；不是新的性能 disable 变体。统一 native step/零点定位与拖动换算，真实 surface 结束事件准入，退出 retained 闭包使用 live active，resize 持拖保投影至最终提交；不改变观测时间事务。最终六份源码/测试 normalized-LF hash 与[独立审查](SKY-RULER-NATIVE-CADENCE-REVIEW.md)逐项一致；actual OrientationTimeRuler 在 materialized source 中逐字一致。

## 旧结果保留

改 builder 前，r2 builder/准备 MD/JSON 已逐字归档至 `tmp/r17-normal-a1-owner-before-review-r3-20261019`，archive-bindings 保存精确 hash；r1/r2 和原 gen25 archive 共4,595个普通文件构建前后逐项读回未变，依赖链接不动。归档 builder 是字节 provenance，不从移位目录直接执行。r2 原准备 MD/JSON 从此 archive 阅读，旧项目/source/manifest/maps 保原路径。

r2 buildSource `ba02a4d2f888ac0231c4eab8628821e6cb089ac9532b9628faa82919ed0b11c9`，bundle `8db09ed4268a08f209f5a9358c101d657c9a7a9c546247062f23e70c87903ba6`；r1 buildSource `ca9170ccf2fbfe0e520335cc81bdb5ee3e2520b9144fefb1858def5e4d83d758`，bundle `2109fd9522be3c1613a0d4bb45824a9a5cbc79e27953898d04c99adfdf29293d`。更早 gen25 owner/template 归档与历史 manifest 保留。不得用当前 builder 路径的新 hash 反认历史包。

## 实际检查和验收边界

- Materialized normal fixture20/20；原 request/状态/memo/Play/Pause/恢复断言保留。
- strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes：生产0、候选0、新增0。
- 完整 Taro WEAPP build、静态安全/预算、全部源码及两份包 readback通过。
- A1/terrain/protocol/collector原35/35按未变模板复用；本次生产 ruler 另有独立41/41、strict及diff证据。旧窗口修复24项和失败对照保其原 owner。
- 31份 hidden maps / 7,228,132B 外置；18份关键 sourcesContent（包含新 layout helper、motion owner）与 materialized TS逐字一致，绑定对应真实JS hash。两份包共80个JS均无 map/sourceMappingURL。
- 新标签、terrain marker及专用storage key在真实编译JS存在；这不证明手机已运行它们。

构建环节未操作手机、feedback、账号或数据库，也没有commit。root随后官方窗口/SDK与当前服务的实际状态只由HANDOFF和相应运行证据拥有；不可把本准备的静态通过当这些操作的结果。A的目标关联、B的有效正常分配/增长/持续播放/退出、地形真实覆盖顺序、修复后手机刻度与完整Goal均未验收。

后续只读核对已区分外层`project` wrapper与实际`project/weapp`应用：应用仍逐字匹配上文a2839caa...，外层多出的配置使整个容器指纹不同。JSON的`runtimeContainerObservation`保其实际路径、计数和同步核对范围；卡住r3窗口已在核对后单独关闭，细目由[R17-A1-RUNTIME-INTEGRATION](R17-A1-RUNTIME-INTEGRATION.md#同步核对与卡住窗口退役)拥有。原manifest/build身份未改写，未为此重建或预览。
