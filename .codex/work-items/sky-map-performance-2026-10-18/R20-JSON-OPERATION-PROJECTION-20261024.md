# R20 JSON 操作元数据窄投影

本批实施[主包实际成本判别](R20-PACKAGE-GAP-DISCRIMINATION-20261024.md)中的生成与消费者边界。接手源码为 main `61953dd1`；root 最新对同一普通 gen2／bundle `367a703a…`、无开发大包 flag 的官方调用明确返回 code10、main **2053KB > 2048KB**，原件归 `RvUEM2` feedback。本文作者没有执行该调用，也没有构建、prepare、refresh、IDE、USB、服务、网络、冻结代或 Git 写入操作。

**本批只证明生成合同与受影响消费者通过；实际包体收益、普通官方准入及目标运行结果仍未验证。** 原完整134项对象中46项 raw 元数据的3,845B，不是本批净收益，也不保证关闭当前正式缺口。UI → 叠层 → Sky顺序、手机网络恢复和完整 Goal 的未完成义务不变。

## 实现责任

- 唯一 `miniapp.operations.json` 不变。现有 `generate-miniapp-sdk.mjs` 从同一声明生成完整134项表、独立88项 envelope 传输表，以及独立 BASE_PATH 叶模块；没有运行时筛选、手写端点名单或新 codec。`--check` 依次检查全部三个生成输出，任一缺失／过期仍返回原 `miniapp_generated_sdk_stale`。
- 原 `miniapp-api.generated.ts` 的完整 method/path 表、所有公开类型和直接导入的 `MINIAPP_API_BASE_PATH` 兼容保留；BASE_PATH 转发到唯一新叶模块。JSON 叶的运行时只有静态 method/path 声明，对完整类型的依赖为 type-only，`satisfies` 校验它与当前 `MiniappApiJsonOperationId` 精确闭合。
- `src/index.ts` 继续纯转发，分别从对应叶模块转发完整表／类型、BASE_PATH、JSON 表。没有扩大 `sideEffects:false` 或修改现有初始化审计。此举避免主请求器为取 base 而依赖含完整表的入口；真正分包仍需 root 完整编译确认。
- `authenticated-operation.ts` 仅将两处路径／方法读取换成窄表。原泛型ID、认证／重认证、原账号限制、scope、请求键、HTTP参数、取消、缓存和错误语义未改。`api-client.ts` 移除一个未使用的完整表 import；没有重新迁移旧 facade 或恢复已拒方案。
- 完整表的 Sky 资源消费者与 raw 传输源码未改。除生成目录内两个新叶模块外，没有新生产文件，无新依赖、全局 minifier、资源／UI／图像／星表或科学输出变化。

## 实际检查

原件统一在任务 `tmp/json-operation-projection-20261024/`，全部进程已结束，无自有服务或数据库。

| 责任 | 本批实际结果 | 原件 |
| --- | --- | --- |
| SDK 全生成物一致性 | `npm run check:miniapp:sdk` exit0 | `sdk.log` |
| 合同与小程序类型 | 两个 workspace `typecheck` 均exit0 | `contract-types.log`、`weapp-types.log` |
| 合同／原 prepared discovery | 2文件 **14/14**，无fail/skip | `contracts.log` |
| 实际请求与资源消费者 | 10文件 **74/74**，无fail/skip | `requesters.log` |
| 根转发初始化审计／原webpack隔离fixture | **2/2**，无fail/skip | `reexports.log` |
| 三个输出的实际过期拒绝 | 隔离复制现生成器／声明，三文件逐一变更→`--check`拒绝，逐一原字节恢复→接受；真实源码未变 | `generated-check.log`、`generated-check-results.json` |

新增的一条正式合同检查逐项对照声明：完整表134项不丢、JSON表仅有允许的88项、两表method/path和旧／新base一致；原raw排除类型检查保留。生成物过期对照仅在任务独立fixture执行，没有临时破坏工作区生成源码。

74项沿原入口覆盖 account-reauthentication、session-retry、contribution/profile operation-dispatch、plan-mutation-scope、share-creation-scope、sky-report-auth、stellar-catalog-client、deep-sky-image-client、prepared-optical-discovery。没有迁移或削弱既有行为断言，也没有新增共享测试平台。资源URL／来源／版本／原校验仍由原消费者执行。

限定 `git diff --check` 通过，只有既有LF/CRLF提示。冻结清单 `tmp/json-operation-projection-20261024/source-freeze.json` 记录8份本批源码／测试和3份未变控制输入／raw消费者；root与独审应以该清单逐件读回后进行后续工作。本文不以测试数量替代完整构建或官方结果。

## Root 接续与保留边界

Root 负责从这批冻结源码完整编译一次普通 WEAPP，读取实际 main／Sky／总包和模块归属，确认46项原raw元数据退出main且原资源能力仍在其真实子包。JSON投影可能增加总包重复字节，必须同时核对。随后以普通预算而非开发大包flag取得官方结果；若无有效收益，保全反证后停止该机制。

新独审、实际构建／官方准入／USB可见结果、最终Git和精确CI不由本作者代报。正常My／合法Picker、真实H4／连续手势／资源返回、完整六字段／Play与OOM、生产／多版本／Native／通知／API完整family及全部原义务保留；gen34、私有原件、原dirty成果与旧失败未动。
