# R20 Native 模型比较缺测修复

状态：**已完成本批实现及限定检查，17份源码冻结，待Root新独审；未认证真实IFS可用、Native画面或完整family。** 用户后置叠层/Sky播放性能的指令保持。本批仅修[诊断实证](R20-NATIVE-IFS-BOUNDARY-20261025.md)中的比较及实际呈现P2，没有操作性能、设备或共享环境。

## 责任和行为

`packages/domain/src/forecast/model-comparison.ts`承接原比较业务规则及其资格呈现。API和实际ForecastScreen共用这个纯owner；没有API依赖mobile、页面复制比较算法、第二字段规则表或新比较框架。原25/30个百分点分歧阈值和POC参考评分公式保留，只在实际可比较的小时上计算；未新增预报可信度校准结论。

- 同一时刻的某字段须双方都有有限数值才比较，真正0仍有效。单边缺测不会变0制造分歧，也不能当作完整共识。
- 没有任何实际配对字段时返回既有`missing`状态、空comparedFields和空共识/分歧范围，主模型及双方完整小时资料独立保留。
- 部分时刻/字段、未对齐时间或内部小时缺口明确为partial；已知字段中的真实分歧仍保留。过期模型沿原descriptor状态返回stale，不改变整体来源freshness、查询/缓存身份或原单位、时间、目标和来源。
- v1合同只容纳一个共识/分歧起止范围。现在分别摘要**首段真正相邻且合格的小时样本**，不把缺测、未比较或相反判断的小时跨成连续范围。首尾是原样本instant，未擅自延长一小时；合同注释和必要说明同步，完整源小时未删。
- `forecastComparisonPresentation`供应状态标题、置信度可用性和中文指标名。实际ForecastScreen改用它：missing/failed或无字段不再显示“当前一致”，也不显示旧占位置信度；partial显示“对比有限”，仅有资格的资料表达未见显著分歧，stale明确过期。

公开字段、`starward-forecast-bundle-v1`和confidence:number形状不变，OpenAPI未改。既有missing分支的0.45继续作为v1兼容占位，不能作已观察可信度；当前真实UI按状态/字段资格隐藏它，避免把这个修复变成另一个伪造数值。未为类型填入降水/云量0，也未把部分比较当成完整判断。

## 真实消费者与回归

共享受支持的归一fixture归`tests/fixtures/native-forecast.ts`，复用原finalize/assertNormalizedWeatherRun。原API测试也迁入这份同一fixture，保原48小时内容及断言。测试是明确合成输入，未伪装真实上游或model epoch。

| 检查 | 结果与原件 |
| --- | --- |
| 比较正式回归修前 | 原5条中**4失败、1真实0通过**；`regression-before.log`。失败覆盖单边缺测假分歧、全缺测假共识、跨缺测连续范围、时间不相交仍fresh。 |
| 当前API owner及原消费者 | **2文件12/12**，`api-frozen.log`；包括7条新比较行为和原5条query/cache/runtime/HTTP检查。另覆盖双方均缺一个内部小时及原expiry。 |
| 旧页面呈现反例 | 仅回放本批前4处呈现代码的完整生产Screen，保留已修API和真实client/inject链；**3/3严格失败**，`consumer-before-presentation.log`。旧页面仍把missing/partial叫一致、显示占位可信度。原/修后完整Screen字节和回放范围有独立receipt；finally已恢复修后SHA。它不是整个旧应用构建或Native画面。 |
| 当前实际Screen→client→Fastify→service | **3/3**，包含在`mobile-frozen.log`。缺模型、两个字段全缺、单边降水缺测均得到相应呈现；一次明确Query刷新从missing恢复到实际有效0资料，实际2次GET，未写shell Context。 |
| 当前mobile受影响批次 | **3文件14/14**，`mobile-frozen.log`：新Screen、原forecast client和F07真实Context消费者。只替换RN/Expo原生适配器与明确observer输入，未替换生产client、比较函数或HTTP route。 |
| API / Mobile workspace类型 | **各exit0**，`api-type-frozen.log`、`mobile-type-frozen.log`。 |

原件均在`tmp/native-comparison-missingness-repair-20261025/`。最初consumer bootstrap的allowedOrigins为空、随后web测试端未配置API base导致准备失败；修正测试适配后才有上述实际消费者结果，不把它们当产品反例。一次旧Screen回放准备遇行尾匹配guard，派发前拒绝、未改Source；最终回放receipt证明修后Source原字节恢复。

## 来源、历史和版本边界

负降水normalizer及weather-schema严格校验未改，已与诊断保存的原字节核对相同。未发任何真实HTTP、切换模型、缩请求时域、放宽schema、补0/取绝对值或造IFS成功。新真实IFS的坏值拒绝仍成立；先前未留异常的样本不能追认同因。

当前契约只有bundle-v1与独立天文算法版本，没有既有comparison算法版本机制。本批不新造版本框架或把内容digest认成上游epoch。ForecastQueryService完成结果cache是实例内Map；原handler的durable runtime仅记录token/query/generatedAt，没有持久化/回放比较payload。未回写旧immutable证据、改HTTP缓存header或查询频率。此次资格对应当前同版API/client新实例；旧HTTP缓存、混合版本及部署资格不由新源码自动建立。

## 冻结与资源

`source-freeze.json`是object.files：**17/17（9写入、8控制）**，SHA256 **098048840d95efff4009c3f53fb899b1cdea15f61699df398d54d3a29bcf8573**。包括原loader/normalizer/schema、handler/runtime、client、decision输入与夜间过滤控制。开始依据parent提供的5767cba3，实际WIP另以本清单为准，没有调用Git；旧CI不覆盖本批。

所有工具调用终态，自有Vitest/React/QueryClient/Fastify及原API fixture SQLite按原teardown关闭；新测试仅inject，无listener。当前按本任务路径及focused文件名实读Node进程0，不处理任何无关进程。资源与源码停写状态归`resources-checkpoint.json`。没有改Root PLAN/HANDOFF/INDEX/Context、行程writer文件、OpenAPI、共享PG/API/服务、网络/VPN/防火墙、手机/ADB/IDE/构建、冻结代、N05或R6；没有部署、Git或上传。

Root可向原forecast owner回写：比较只用实际配对字段与时刻、无数据/partial/过期资格、单范围的首段连续摘要、真实页面按资格消费。过程/计数/机器资料仍留任务。

新的独立审查、Root整合/交付CI、真实Native视觉/触摸/键盘/Back/生命周期、实际IFS完整/持续供给、上游epoch、生产/多版本和完整预报/通知family继续未完成。后置性能/OOM义务保留。
