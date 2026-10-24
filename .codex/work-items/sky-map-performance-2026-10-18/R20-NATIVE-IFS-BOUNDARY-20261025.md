# R20 Native IFS 载入边界与缺值比较

结论：**本轮唯一新 IFS 载入的首个失败已定位：真实降水数组有负值，现有非负校验抛出 `hourly_70_precipitation_must_be_non_negative`，整个比较源随后会降级为 unavailable。** 这不还原上一轮未保留的异常，也不单凭供应商坏值认定校验器是产品 P2。

另取得一个独立可复现的 **P2：比较 owner 把受支持的 null 值当作0，产生虚假分歧或无数据的“共识”；App 标题还把缺少分歧起点直接呈为“当前一致”。** 本报告没有修产品源码，不证明完整双模型可用、实际Native画面或完整Goal完成。

用户已后置层叠/Sky播放及相关内存/OOM；本次只处理Native数据正确性，没有性能、手机或系统准备。

## 单次执行与原件

先读取适用AGENTS、global/default manifest、架构/Native forecast责任、唯一PLAN、[前轮真实供给](R20-NATIVE-LIVE-FORECAST-SUPPLY-20261025.md)、原允许摘要及实际loader/normalizer/比较消费者。前轮仅有IFS parsed摘要和384小时计数，不能离线重建具体坏字段；没有读取/重造其禁止保留的raw body。

随后只调用 **一次现成 `OpenMeteoHttpClient.withModels(["ecmwf_ifs025"]).load`**，保原公开Greenwich observer输入和真实Date；保实际免费/个人非商业POC gate、原模型/变量/16日请求/单位/默认有限重试，未发GFS。唯一transport观测将原URL/init/JSON原样交给产品，仅保已定义异常码和字段长度/缺失/范围计数；没有替换返回值、改网络/VPN/代理或新建供应客户端。

结果为两个首轮HTTP200（IFS和原AQ），**weather=1、AQ=1，无重试、无第二次load**。`rawRetentionAllowed=false`、rawBodiesSaved=false不变；没有保存整份未准入payload、原响应body、未知异常文本或URL。精确公开点位仅在private intent。

唯一private目录为既有owner的 `device-resume/native-ifs-boundary-20261025-XJet3w/`：

- `result.private.json` SHA256：`bb2feba69bd352fce5f05af2b56510cb779bb67931d59be0b091d5bae70a472d`。
- source pins前后同为13项，manifest SHA256：`2177f366172a69bf2dc7ead021a55edcbf34e298cb0ba8b8ebf7bd763ce426a4`。包括实际live loader/adapter/provider gate/shared HTTP/weather schema、入口及相关reference/lock输入；执行后13份archive原字节逐件读回一致。它不是完整VM模块跟踪或全仓覆盖。
- `controlled-counterexamples.private.json` SHA256：`bc4d6d585e5a756b29c34520a4463df4392f60974513f63f7dec599786c40ac0`。四个负责owner的前后SHA一致、同字节副本另保 `counter-source-inputs/`；这些反例没有外部请求。
- `evidence-integrity.private.json`保留全部上述artifact长度/SHA；task tmp的`native-ifs-boundary-20261025/dispatch.private.json`只准本次派发，不自动重放。

## 实际首个失败边界

| 本轮真实数据/阶段 | 实读结果 |
| --- | --- |
| IFS HTTP/JSON | 200、providerErrorFlag=false、UTC offset为0，时间数组384项。 |
| 云量 | 384槽、363个有限数值、21个缺值，无百分比越界。 |
| 降水概率 | 384槽、363个有限数值、21个缺值，无百分比越界。 |
| 降水 | 单位mm，384槽、361个有限数值、23个缺值；其中3个负数，首次index70。没有保负值本身或以任意数值替代。 |
| AQ | 200，时间数组168项；正常请求family已settled，响应均消费或取消。 |
| 产品load | `normalizeOpenMeteo`的`precipitationMm` → `nonNegativeOrNull`抛RangeError，safe owned code为`hourly_70_precipitation_must_be_non_negative`；没有正常IFS run。 |

当前调用链是 `open-meteo-http-client.ts::load`取得实际weather/AQ → `open-meteo-adapter.ts:98`逐小时归一 → `packages/weather-schema/src/index.ts:100`严格非负校验。`forecast-query-service.ts:306`把比较load拒绝降级为null，保主模型独立可用。没有证据把错误归于网络、单位转换、天文窗口或预报时域。

[官方IFS API定义](https://open-meteo.com/en/docs/ecmwf-api)将precipitation定义为前一小时雨/阵雨/雪总量，单位mm；这一含义不授权把此次负值解释成有效零值，也不足以认定负值来自某种插值/反累积算法。本轮摘要只保缺值数量，不推定其位置或原因。

本轮IFS parsed canonical摘要为`971088b463eabc20298478a0d9f4e4e5b2db533fcc133adb8788074c3c1f412d`，不同于前轮`6dc96b34…`；两者都不是raw wire-byte hash。**不能追认前轮IFS缺口必然同因。**

本地最小机制反例另外使用两小时合成payload（首小时降水0，第二小时-1，后者明确不是保存的真实负值），直接调用现有normalizer也得到`hourly_1_precipitation_must_be_non_negative`。它只证明严格校验及整run拒绝机制，不重放真实来源或证明应如何修复供应值。

## P2：缺值被比较成0并升级为模型判断

`forecast-query-service.ts:226-237`仅按双方时间相交选点，随后对云量/降水概率用`?? 0`比较，所有点又被划为consensus或disagreement，`comparedFields`固定写两个字段。该行为违反当前nullable weather/hour contract及实际Screen“缺失不会改成0/fresh”的含义。

对当前真实 `ForecastQueryService.get` 另做两个**明确合成、无HTTP**的最小反例，source为通过现有 `normalizeOpenMeteo` 的合法partial run；使用真实Date、两个同时间小时，没有替代上面的真实HTTP返回：

| 受支持输入 | 实际错误结果 |
| --- | --- |
| 双方云量同为50；主模型降水概率40、比较模型该字段null | 报两个小时“云量或降水概率显著分歧”，status=partial、confidence=.47、有分歧范围。唯一双方已知字段实际相同，缺值被当0制造了分歧。 |
| 双方云量与降水概率全部null（温度仍有数据，两个run均partial） | status=fresh、confidence=.82、有共识范围，comparedFields仍两个，声称可比较时段未出现显著分歧；实际没有一个可比较字段值。 |

这些反例绑定现行owner source，并非实际供应、校准可信度或Native验收。当前真实IFS数据又确有云量/降水概率缺值，因此**不能只让partial IFS绕过上述load拒绝，就认证比较功能正确**。

实际消费者链为 `ForecastQueryService` → `ForecastBundle.modelComparison` → `apps/mobile/src/data/forecast-client.ts`原样返回 → `ForecastScreen.tsx::ModelSelector`。Screen的可信度标题直接显示该数值（约96行），证据卡约109行只用`disagreementStartUtc`是否存在决定“存在分歧/当前一致”，未检查missing/failed/不可比较。因此前轮真实`comparison=null/status=missing`同样会生成“当前一致”的标题，与其下的不可用说明相矛盾。这里有实际service输出和直接consumer源码追踪，**没有另做React或Native画面复现**。

## 修复边界与保留缺口

- 当前负数校验保住了非负量纲，不能把它单列为已证错误或直接补0、取绝对值、换模型/缩请求范围。若采用字段局部降级，须由原source normalization owner明确区分数值字段不合格与全源身份/权限/单位/时刻不合格，保时间槽、有效独立字段、missing/质量原因；不能弱化全局schema去接受非法归一值。
- 已证比较P2归原comparison owner：比较只使用双方实际可比较的字段/时刻，保真正0和缺值的区别；没有数据不得生成共识/分歧或fresh可信度，部分覆盖也不得伪装完整。App按已资格化状态/说明呈现，不将“没有分歧起点”当“当前一致”。迁移实际consumer，避免在页面再复制另一套比较规则。
- 后续修复先用这两个合成反例及源字段机制反例前后验证，按实际契约变化补必要兼容/部分覆盖检查。新真实资格由Root按修后实际需要决定；本轮不继续发请求、不构建更多来源或测试矩阵。
- IFS实际完整/持续供给、原样本确切异常、上游model epoch、真实Native呈现/交互、通知合法边沿/外部渠道、production/商业资格与完整family仍未完成；不降低科学精度/数据覆盖，也不改变用户后置性能的最新顺序。

## 资源

live source两个normal request families均settled，attempt各1，原响应已消费/取消；工具调用exit0。随后只读CIM实读本任务entry的Node进程数0。没有API/SQLite/listener/后台worker或共享服务操作。四owner控制反例的内联进程亦exit0、无HTTP；所有代码和记录保本机。没有修改生产源码、正式测试、PLAN、HANDOFF、Context、Git、依赖、模型选择、系统安全/VPN或冻结构建。唯一repo非tmp写入是本报告。
