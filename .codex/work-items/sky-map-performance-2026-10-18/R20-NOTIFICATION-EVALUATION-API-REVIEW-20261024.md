# R20 通知评估 API/domain 独立审阅

审阅者 `review_notification_pipeline`。只读生产/正式测试，写本报告及自身 task tmp；没有修改生产、正式测试、Context、PLAN/HANDOFF/INDEX、Git或依赖，未构建，未操作IDE/手机/共享服务或更改网络/VPN配置、冻结代、原件上传。**本批修后限定 API/domain 责任未发现未关闭 P1/P2**；两项修前真实失败保留如下，整通知family与目标设备/生产资格仍未完成。

## 冻结与实际检查

- 首次及两条反例之后均核17份 backend/domain/公开合同冻结hash，全部匹配原 `r20-notification-evaluation-backend-freeze.json`。原件 `tmp/notification-api-independent-review-20261024/{initial-freeze,pre-fix-findings-freeze}.json`。
- 读取完整实现证据、Source Plan `notifications-and-toolbox` 及批准默认、PLAN 独立API/F14、默认Context和实际 native API/forecast/通知责任。第一次合并输出截断后已按缺失范围补读，不把截断当完整读取。
- 独立运行作者三个 API/start/bounds 文件：**3文件9/9、无skip**，日志 `affected.log`。这没有覆盖下述两条独立反例，不能据9/9宣布通过。
- 实际审查 primary acquisition 的源资格/时间/点位、Forecast cache retry、模块worker、SQLite transaction/cursor/edge/candidate/controls/Inbox、真实startup路由及OpenAPI。公开入口没有客户端provider-event写入路由；Node持久适配器留在API内。默认全局与类别off、规则历史marker不等执行状态、内部Inbox不冒OS送达这些边界在本批范围内保留。

## 确认 P2：新 source 缺少旧候选 hour 仍借旧成功投递（修前，现已关闭）

`sqlite-inbox-repository.ts::evaluate` 只迭代本次 `event.hours`。若新采集省略某个已有edge/candidate的hour，该旧hour没有进入unknown/待新证据状态；到时仍从旧true候选创建Inbox，并宣称 `same-condition`。

独立 `missing-hour.test.ts` 通过实际ForecastQueryService、真实astronomy计算、正常HTTP路由、归一器、SQLite和worker运行：规则lead0，20:30对21:00建立false；20:31新source为true并排一个21:00候选；20:40的新source仅有20:00，明确没有21:00；21:00实际drain仍投递旧20:31资料，其旧expiry21:01尚未到，Inbox `current=same-condition`。期望没有借旧hour投递的实际断言 **0/1失败**，原件 `missing-hour-before.log`。非空旧触发/来源、pending=1及最新缺覆盖均先被实际检查，不是空输入或仅源码匹配。

该缺口不同于已有null字段检查：省略hour也是有效覆盖缺口，不能让最后一次旧成功继续冒当前。原Goal对missing/partial/旧源意义与本批“缺测等待新资料”的合同仍须满足。已告root并由同一作者处理，受影响冻结已解除。

## 确认 P2：已知 enqueue 失败被空队列读取清成 ready（修前，现已关闭）

`NotificationEvaluationService.acceptForecast` 在source存储失败时设置 `failed=true`；但普通 `inbox()` 发起 `kick()`，无已保存队列时马上执行 `failed=false`。这并没有成功接受原失败采集，因而失败/未知状态被一次普通读取抹掉。

独立 `enqueue-readiness.test.ts` 使用实际runtime/ForecastQueryService与SQLite `BEFORE INSERT` trigger：原false source已成功持久；随后新true采集被source表拒绝，独立有效forecast仍返回非空10%及“通知评估暂未确认”，source行数仍1；实际Inbox读取却返回空items、`evaluationStatus=ready`。期望unavailable的相关断言 **0/1失败**，原件 `enqueue-readiness-counter-before.log`。它验证的是HTTP直接调用的实际service方法，不复制状态机。

首次该探针误用 `forecast.query` 而非实际 `get`，只有harness失败，独立保存在 `enqueue-readiness-before.log`，不算产品反例。修正调用后才取得上述相关失败。已告root，同批修正待复验；不扩大成更多指标/对象矩阵。

## 修后独立复验与终态

- 作者/API修后再次冻结17份，首尾独立全部匹配新hash：`repair-freeze-initial.json` / `repair-freeze-final.json`。本审阅没有将仍在写入中的混合源码当终态；从作者与root新冻结通知后才执行下列复验。
- 上述两份**原独立probe及原相关断言不改，2/2通过**，原件 `counterchecks-after.log`，探针hash另存 `countercheck-source-hashes.json`。省略21:00后不再借旧true写入Inbox；真实source写入失败后普通空读不再清为ready。
- 独立重跑当前 API/start/bounds 三文件 **11/11，无skip**，原件 `affected-after.log`。它包含新增正式覆盖：缺21保22、旧源不复活unknown；source就绪失败保资格、另一点位成功不清未知、旧候选仍新鲜也不投递、恢复journal无需重拉provider。该批与原两例是不同范围，不相加冒全仓或真机验收。
- API工作区typecheck **exit0**，`types-after.log`；冻结17文件限定diff-check通过。
- 实际读回修后owner：edge保原合格hour/window/query/算法身份，按仍有效旧窗口和新窗口共同更新；省略变unknown，当前有效兄弟hour继续有自己的资格。观察水位同时限制due与current，旧源/未确认的新源不能恢复旧成功。
- 入站以独立提交的readiness intent保原id/digest/payload，随后原子接受source并确认；worker按原内容恢复。普通空队列、他点成功不构成确认。整盘写不可用时仅保最小volatile header/digest并由原forecast cache持原输入；只据确切接受读回或有效expiry退休水位收口。该fallback并未被描述为进程/整盘输入丢失后的持久保证。
- 已核source-intent/source-page/due各阶段一次执行机会、失败不1ms原条件空转，普通读返回已提交结果/处理状态；原rule配置/receipt不被后续执行状态改写，OpenAPI继续将当前activity/Inbox与历史marker区分。

必要证据已足够判断这批修复，不继续按指标/对象/主题扩矩阵。两项修前失败、一次本审阅harness方法名错误及作者此前失败原件均未删除。未据局部通过关闭完整通知能力。

## 保留范围与资源

上述原件统一归 `tmp/notification-api-independent-review-20261024/`；合成SQLite目录也保存在该task目录，所有自建Fastify/SQLite/runtime均在finally关闭，无新监听/进程。两个问题修复前不能通过本限定审查；上述终态只在新冻结及原反例复验后成立。

即使后续本批修复通过，也不关闭实际生产ProviderRun epoch/区域覆盖/连续数据供应、OS权限和排程、APNs/FCM/厂商/Expo、通知合法深链、原生App设备/存储及完整通知family/Goal。内部Inbox、受控上游或源码/本地检查不能替代这些结果。
