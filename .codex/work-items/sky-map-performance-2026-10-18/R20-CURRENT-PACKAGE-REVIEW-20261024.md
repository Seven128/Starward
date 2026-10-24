# 当前主包边界候选独审（2026-10-24）

Root后续已执行本报告拒绝结论：保全候选源码/patch/完整负向构建后，仅撤回本候选自有WEAPP变更，恢复HEAD63ee13b并重编E9；本报告的“当前候选”均指已归档的28ec887b…，不是现生产源码。开发期大包推送成功另归[设备记录](R20-CURRENT-UI-DEVICE-20261024.md)，正式主包限制仍未修。

独立审阅者 `review_current_package_boundary`。只读检查当前 WEAPP 变更、真实调用、认证/请求/缓存/本地恢复与账户清理 owner；仅写本报告及本审阅者 task tmp 原件。没有修改生产、正式测试、Context、PLAN、HANDOFF、依赖或 Git，没有构建、IDE、设备、服务、VPN、冻结代或上传操作。

## 结论

**当前候选不能作为主包预算修复通过。** 行为迁移范围内未发现新的未关闭生产 P1/P2；一处漏迁的旧测试夹具已由 root 修复，独立复验47/47。但实际新构建只有46B总差额，原“两个恢复 factory 留在主包”的定位被编译输出反证。函数迁移、类型通过和行为通过不能替代包体结果。

root 已要求停止同类 facade 移位扫描，保全本候选源码/patch，不把无实际收益的额外职责改造混入交付。本报告不建议删除必需 key predicate，也未发现另一个已验证、可立即实施的不同机制边界。原官方2051KB>2048KB拒包仍需有效新修复及官方准入证据关闭。

## 行为和责任检查

- 两个真实 content Surface 的九个业务调用均迁至各自 client；当前 `app.config.ts` 没有注册这两页，没有以包装优化新增或删除路由、页面和业务。
- 新 client 仍导入同一个 `api-client` 的 `ensureSession`、`requestOperation`、`currentDraftUserId`、`MiniappApiError` 和 `invalidateAfter`；未创建第二 session、transport 或 cache。主 client 不反向导入或 re-export 两新 client。旧 retry 模块仅兼容 re-export 存储归属 predicate，不形成 client 循环。
- profile/import factory 仍各只有一个模块级实例；原请求 owner、完整输入/原键重试、HTTP operation/path、取消 signal、回执返回后的账号 fence 和 invalidation 调用保持。持久恢复 helper 的实现未改变，存储失败/未知结果与其他 pending 的保护继续由原 owner 负责。
- `local-draft-keys` 的两个 key 与原实现都是相同 prefix 加 `JSON.stringify([owner])`；账户删除仍精确清理该已删除账户的记录，保留后继/其他账户的独立草稿与未解决记录。没有按字符串前缀扩大清理，也未因内容模块未加载而缺失清理 predicate。
- 页面 diff 仅改变 import owner，原 handler/用户输入、恢复/取消、账号检查不变。上述是代码与受控行为范围，不建立未注册页面可达、完整业务、设备、持久数据库或科学显示通过。

## 已发现并修复的夹具遗漏

`services/contribution-history-scope.test.ts` 最初仍从 `api-client.ts` 提取已迁出的 `getProfileLinks/getPostImports/getPostImport`，本审阅者真实运行 **3pass/3fail**，失败为 `assert.ok(declaration)`，原件 `tmp/r20-package-review-history-scope.log`。这不是已证生产越权，但完整 WEAPP 检查会因此失败。

root 改为按函数的实际 owner 读取原声明，原六条成功、迟到切账号、expected-owner 断言均保留，没有恢复 main re-export。本审阅者随后运行原六个相关服务文件加该文件，**47/47、0fail/0skip**；日志 `tmp/r20-package-review-affected-final.log`。限定 diff-check 通过。检查时10份实现冻结文件全部 hash 匹配，见 `tmp/r20-package-review-source-hashes.json`；正式历史读回测试的额外 owner 映射属于随后 root 的测试修正。

## 决定性编译反证

本审阅者只读实际 rejected/new bundle，使用原 fingerprint owner 独立计算：

| 本地生成口径 | rejected E9 | 当前候选 |
| --- | ---: | ---: |
| 件数 | 339 | 339 |
| 总B | 5,025,700 | 5,025,654 |
| main B | 2,030,615 | 2,030,584 |
| common.js B | 492,746 | 492,717 |

当前候选SHA为 `28ec887bafcb85553bf0d28bc1d5aa6463a856cecec41624c24a86ea79e3bcd4`。原件 `tmp/r20-package-review-bundle-comparison.json`。本地生成计量与微信官方编译不同，没有发起新官方调用或声称当前官方仍是某个精确数值。

对两代 `common.js` 的 JS AST 字符串逐项读回：两代各有一次 `starward.profile-save.v1:` 和 `starward.import-save.v1:`；profile/import factory 独有的中文恢复失败消息及 `too many uncertain saves` / `too many pending saves` 四个标记，两代均为0。原件 `tmp/r20-package-review-compiled-tokens.json`。因此旧 prefix 的存在证明的是账户清理所需的 key 声明，不是恢复 factory 正文仍被打包；旧 factory 正文已经被编译优化剔除。本候选没有实际移除所假设的主包成本。

## 保留范围与资源

原拒包、夹具失败和两代输出完整保留；本审阅者没有重建/修改它们。所有测试命令已结束，无新进程或连接遗留。NightReport/admin/native 的既有修复、UI采用与目标对照、真实H4、连续手势/资源、完整Sky/Play/OOM、精确CI和完整Goal均不由本审阅关闭。
