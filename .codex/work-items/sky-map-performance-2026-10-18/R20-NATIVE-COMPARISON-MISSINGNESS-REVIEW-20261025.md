# R20 Native 模型比较缺测修复独立审查

结论：**在冻结的17项源码与本轮受控输入范围内，未发现新增P1/P2；原单边缺测制造分歧、完全缺测制造共识/可信度，以及Screen把无分歧起点呈为“当前一致”的缺陷已被当前实际服务和消费者修复。** 这不是实际IFS供给、Native真机画面、生产运行或完整Goal验收。

用户已后置层叠与Sky播放性能，本轮只审Native数据正确性。审查者独立读取适用AGENTS/default Context、Native架构与ScreenContract、唯一PLAN的model-comparison责任、原IFS边界诊断、修复报告和实际调用链，并按Native `starward-interaction-design` 规则核对状态文案；没有重新设计或修改产品源码。

## 冻结范围与责任

- [修复冻结清单](tmp/native-comparison-missingness-repair-20261025/source-freeze.json)为9项write、8项control，共17项；manifest SHA256为`098048840d95efff4009c3f53fb899b1cdea15f61699df398d54d3a29bcf8573`。审查开始和结束均逐件核对长度与SHA一致；末次回执见[源码与资源核对](tmp/review-native-comparison-validity-20261025/review-completion-source-resources.json)。这只绑定清单范围，不代替全仓冻结。
- `packages/domain/src/forecast/model-comparison.ts`是比较与资格化呈现的单一纯owner。API真实series构造后调用该owner；`ForecastScreen`为搜索确认的实际生产UI消费者，调用同一presenter，不再自行用空分歧起点推断一致。依赖由API/UI指向domain，domain仅使用contracts类型，没有反向运行时依赖。
- 比较字段、阈值与原参考可信度公式未改。只比较同一UTC时刻双方有限数值；合法0有效，null不参加数值比较。无任何field pair返回missing、空指标/区间；wire v1的数值型confidence仍保留旧0.45兼容占位，实际UI明确隐藏它。部分覆盖、过期参考和源失败有不同说明，不升级成整体一致。
- 现有单start/end结构仅返回首个真实连续区间；未知或不完整时段不桥接为共识，显著分歧只来自实际字段对。完整小时series和独立有效主模型保留。单区间信息量限制在契约注释和解释中明示，没有伪造多段窗口。

## 独立行为证据

[服务探针](tmp/review-native-comparison-validity-20261025/service-probe.mjs)调用实际`ForecastQueryService.get`，使用现有共享fixture形成经weather contract验证的合法归一输入；断言从原缺陷及契约独立制定，没有复制比较算法。命令exit0，**6/6通过**；[详细输出](tmp/review-native-comparison-validity-20261025/service-result.json)、[运行摘要](tmp/review-native-comparison-validity-20261025/service-probe.log)。

| 机制 | 独立实读结果 |
| --- | --- |
| 原单边缺测：双方云量50，主降水概率40、比较null | partial，仅云量可比，无假分歧、无完整共识，比较源null保留。 |
| 原完全缺测：双方云量/降水概率均null，温度仍有效 | missing、字段和区间空；实际presenter无对比可信度，主温度28仍保留。 |
| 非对称内部缺口与真实分歧混合，双方6小时 | partial；首个完整共识只在h2–h3，真实分歧只在h5；未把h0/h1/h4未知拼成完整区间，6+6小时原数据保全。 |
| 双方两字段真实0 | fresh且有效共识，不误判缺失。 |
| 比较load拒绝 | comparison=null，missing且不显示可信度；主模型2小时独立可用。 |
| 两源过期而字段有效 | stale，呈“模型对比已过期”和“上次参考可信度”，不声称当前一致。 |

每条服务检查同时核对输入归一run未被修改、两源各load一次。以上为受控输入，不能当成真实IFS已恢复或科学可信度重新校准。

[消费者检查](tmp/review-native-comparison-validity-20261025/consumer-review.test.tsx)运行实际`ForecastScreen → forecast-client → fetch适配 → Fastify.inject → ForecastQueryService`，不是直接注入比较结果。仅使用现有测试方式适配RN/Expo宿主和只读shell观察输入。命令exit0，**1文件、2/2通过**，见[运行记录](tmp/review-native-comparison-validity-20261025/consumer-review.log)。

1. 实际查询连续刷新missing→partial→真实0→unavailable：状态与字段随新结果变化，不显示45%占位、假“当前一致”或假分歧；比较源失效后显示“不复制主模型充当第二模型”，没有写shell Decision Context。
2. 过期实际service响应经过同一client/页面路径后显示过期与上次参考；没有把过期资料显示成当前一致。

上述消费者检查使用React DOM宿主适配，不证明Native像素、真机手势、返回、持久化恢复或硬件行为。Vitest有既有esbuild/oxc配置选择提示，但测试执行成功，无产品失败。

## 兼容、保留缺口与资源

- 八项control保持原字节，包括weather schema/normalizer、HTTP、runtime、client及观察夜消费者。没有接受负降水、补0、取绝对值、换模型、改模型选择、请求family、来源freshness/cache频率或虚构上游epoch。原真实IFS负值拒绝没有在本修复中解决，也没有被本轮重新宣告为产品P2。
- 本轮为同版API/client和新服务实例。实际handler既有`private, max-age=300`没有变；未验证旧HTTP缓存或混合部署版本的更新行为。当前比较结果没有新增独立持久化payload迁移，这一边界不构成扩写缓存框架的依据。
- 真实IFS完整/持续供给、实际Native画面与交互、生产/商业资格、完整family与完整Goal仍未验；低云等完整专业比较范围的原承诺仍保留。本报告只收口本次两字段缺测语义与实际消费者，不扩大为完整模型能力验收。用户后置的性能/OOM继续未解决。
- 没有外部HTTP、手机/ADB/IDE/build、共享PG/API、网络/防火墙或部署操作。服务探针无listener；消费者只用inject。teardown卸载React、清QueryClient、关闭Fastify并还原globals/env；forecast-only buildApi未实例化SQLite。所有自有执行均完成，末次CIM按本审查entry路径匹配的Node进程数为0，不推断其他owner进程状态。
- 唯一非tmp写入为本报告；未修改生产/正式测试源码、PLAN、HANDOFF、Context、Git、依赖或私有原件。结束前17项pins再次一致。
