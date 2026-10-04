# 已绘光学来源与 accepted 页面发布：有限开发记录

2026-10-02。Goal active、无预算、未完成；HEAD 72e65cf3、原分支/worktree未变，六项 Settings/outbox 修改保持。普通 science/default registry 未开启；没有新取源、GPU矩阵、IDE启动或手机操作。

## 用户结果与责任

页面来源、资料光学版本、状态和恢复现在消费一次实际完成的光学快照。legacy 记录实际成功主层或粗层；science 记录所有实际参与的 fine/coarse 字段及共同出版身份，不能将 coarse 的完成结果展平为最新 finer 元数据。一个字段退休时，独立存活字段仍可保留来源；全部退休、隐藏、无正尺寸 Canvas、旧 Canvas generation 或非当前场景不得获得当前照片资格。

`sky-sdss-optical-completion.ts` 是这个共同责任的唯一 owner。caller 保证 draw/getter 的同帧关联；owner 校验 actual publication/asset/层级、prepared 与 positive、EMPTY 矛盾，复制冻结 receipt/字段数组及包装。admitted publication/asset 本身沿既有 immutable boundary 复用，不重新序列化或建立第二个 publication validator。完成但无参与字段的 science 观察保留空数组；live consumer 返回 null，不能解释为天文缺测或图像错误。

Scene 的完成输出已从裸 `sdssOpticalImage` 改为 `sdssOptical` union。排队 frame 输入仍用原名字/合同；普通 v1 的绘制与谱段策略不改，science envelope 仍不能进入 legacy JPEG passes。status、modal、recovery 和 sameScene 已迁移，不保留另一个 completed optical 来源 owner。历史 task scripts 的旧 callback 合同未重执行或升级。

## 实际页面发布边界

`spot-sky-page.tsx` 的 Scene painted callback 仅暂存本次 publish closure。Scene completed wrapper 以本次 frame 和捕获 Canvas generation 进入 page-local pending slot；只有实际 `createSkyCanvasLifecycle` 接受的 `presented` port 才发布 picking、实际相机/校准 basis、完成来源、DOM frame 和 inspection revision。invalidated 清 slot；旧/repeated/rejected done 不能覆盖或清除新 attempt。

同场景新的姿态仍可以接受较早绘制的实际 view，保首次可见性；这不代表接受不同场景或旧 Canvas。Scene 当前同步，受控 deferred callback 回归证明的是接口 fencing，没有声称已观察到原生异步竞态。

science global-positive 仅供来源参与，**没有**被用作目录辅助/名称的局部 readability。现页的该辅助光学开关明确只沿 legacy；这项 staging 不完成 science 自然淡化。black fine 核心 + positive coarse 外围、同帧 Canvas/DOM opacity、退休后 replacement paint 仍按[局部可辨认度设计独审](experience-pre-aid-readability-design-independent-2026-10-02.md)保留。

## 检查及绑定

- [r1 工具回执](../../../../output/science-optical-completion-consumer-1002-r1/checks.json)绑定当时源码，含 actual writer metadata/controlled callback 的 43 个相关检查、实际旧 page staged-only 反例失败与修后通过。它不重新绑定后续测试类型别名或 unused import 删除；r1 source binding `972ea4260b0d533288c3db1966d6c8df3c0921cb289db25c9c4e54928e9616ba` 保持原物。
- [r2 当前源码/输入绑定](../../../../output/science-optical-completion-consumer-1002-r2/bindings.json) `0585be4d8c90cccc4b4b41f48e94c90f062134ad187490910768e95a7981f13f`，17 项及六保留文件。completion owner `bf989376…`；actual writer publication `34015aff…`，仅复用 admitted metadata 与受控 native handles/receipt。
- [r2 最后检查](../../../../output/science-optical-completion-consumer-1002-r2/checks.json)：相邻消费者批次 31 通过/2 dome fixture 失败；两个 fixture 漏已有 resolver 且沿旧 immediate-painted 假设。只修 fixture，改用 actual resolver/accepted port，dome 6 通过；最终 app TS5.9.3 无诊断。既有已通过 lifecycle/page checks 不为填数量重跑。

这些是 production 源码边界、实际 AST/lifecycle 受控行为和 admitted metadata 的开发证据，不是新 science GPU 渲染、WEAPP/WXML 合成、连续原生手势、颜色/PSF/高清或手机性能验收。宽场 W3、环境/星座/地景完整组合和全部原33义务继续。

## 独立审查与下一依赖

[独立审查](experience-optical-completion-consumer-independent-review-2026-10-02.md)已通过本代有限开发边界，未发现新增生产缺陷。actual Scene/页面/lifecycle 十项控制及三项 production 内存变异有作用；r5 默认 budget 字段拼写漏检与三个直接 import 的原 prebinding 缺口已在独立 additive closure 用正确复数 AST 反例、当前绑定和小函数补证，不倒填 r5。root 回读实际脚本、全部结果及[独立/当前源码汇合](../../../../output/science-optical-completion-consumer-root-join-1002-r2/result.json)，核 r5 115、补证158、当前17绑定和六保留文件；该范围不认证 science GPU/质量/native。

只读现有 route/common/sky vendor source maps 未匹配这三个原始 TS/TSX 文件条目，保留[第一观察](../../../../output/science-optical-completion-consumer-1002-r2/watch-readonly.json)与[owner map观察](../../../../output/science-optical-completion-consumer-1002-r2/watch-readonly-owner-maps.json)。这未证明本代发射或运行，也不证明 watch 故障；未因此启动/重启任何会话。

完成该 bounded consumer 边界后，继续 task-scoped **同一个实际 Scene/renderer** science group：固定 publication/auxiliary policy，join 全部 expected ready 注册/prepare，whole-cutout W3 选择与 finish 后完成字段。HAS/有效黑色选择 optical；submitted UNKNOWN 禁止 W3 回填；完整 expected-ready qualified EMPTY 与明确无提交 unavailable 分支分别处理。后续 aid 局部规则、完整成本/原生预算、质量采用及默认启用仍各有责任，不以 union 接入替代。
