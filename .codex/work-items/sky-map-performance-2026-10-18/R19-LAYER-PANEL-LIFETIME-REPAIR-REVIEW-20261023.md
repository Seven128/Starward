# R19 面板挂载资格修复独立复核 — 2026-10-23

结论：上一轮 [P2 卸载资格缺口](R19-LAYER-PANEL-RETURN-REVIEW-20261023.md)在当前源码责任边界内已修复；本次未发现需要阻止普通构建及针对性手机复核的新 P1/P2。这里的通过是独立代码及 host 行为检查，不是修后手机通过。原 gen13 的[图层返回正文回顶](R19-GEN13-SHARED-PRESS-LAYER-PHONE-20261023.md)仍是修前证据，必须由新普通预览实际对照。

## 卸载、异步与恢复资格

- `use-panel-return-position.ts:42–46` 新增的是每个 hook 实例自己的 `mounted` ref：effect setup 为 true、cleanup 为 false。新挂载创建自己的 ref，不会让旧实例因后继出现而复活。旧实例 `document.record`、`gallery.onScroll`、`takeOver` 均先检查挂载资格；不能再经 Map 的 `recordPanelPosition` 覆盖后继阅读位置，也不能取消后继的查询。
- `observe` 在启动、nextTick 和原生回调边界检查挂载资格；原可见性 cleanup 仍递增 measurement 并取消 pendingReads，取消会清除 1000 ms 定时器、从集合移除并只结算一次。已经返回的原生批次还需通过 measurement ticket、epoch、visibility 和 effect retired 围栏才能写回。`prepareSourceNavigation` 在 await 后再次核对挂载、可见性、epoch 和 ticket，卸载或退休返回 false，公共 SourceButton 会静默取消该次跳转。
- 卸载前已发起、等待原生 `exec` 回调的实际生产 hook 路径也已在内存中核对：1 个待回调 query，卸载后 preparation 为 false，新增父级记录 0，迟到文档和相册事件均为 false。首次内存检查只覆盖尚待 nextTick 的查询；随后显式推进 nextTick、保留 exec 回调再卸载，区分了这两个边界，没有把前者写成后者。
- 可见性变化仍由 render 更新 visibility/epoch；新增挂载 cleanup 不改它们。hide 保存当前文档/相册位置，取消旧读取；show 使用当前内容 readiness 和原 acknowledgement 恢复。旧依赖 effect 的 cleanup 不再能把新 show render 的 visibility 写成 false。
- 新挂载资格 effect 可按 setup → cleanup → setup 恢复为 true；cleanup 不篡改身份或 render epoch。原查询通过 cancellation/measurement 退休，不依赖单向不可恢复的布尔锁。此处核对的是新增资格围栏的可重入语义，未将它扩大为整个 UI 的 StrictMode 认证；当前 `app.tsx` 及 src 中未启用 StrictMode。
- 返回对象中沿用的 `remember`、`setReturnTop`、`reveal` 等仍只影响该旧实例本地 ref/state，不持有父级 `onPositionChange` 或导航权限。来源实际消费还经过 SourceButton 自身的 mounted/active/pending 和当前来源身份检查。未发现卸载后借这些本地方法写入新面板或打开来源的通路。

## 真实消费者与单一所有者

- 正式 `spot-panel.tsx:279` 与私人 `pending-proposal-panel.tsx:50` 继续共用该 hook；没有按消费者复制恢复或生命周期状态机。正式文档 identity 为 spotId；私人文档与相册身份保留当前 owner/submission 边界。身份/照片集合变化、readiness、原触摸接管和照片交接没有被本修复绕过。
- Map `openLayerSheet` 在切换前保存 extent、selectedSpotId 和完整位置对象；`closeLayerSheet` 被系统 Back 与再次点击图层共同调用，仍经选择核验把两轴与 anchor 交给原 `setBottomPresentation`。底部唯一 owner 仍为 `none | spot-panel | layer-sheet | spot-editor`，没有新增并列 active flag，也没有把中档写死。
- 正式面板按真实几何恢复 anchor，缺失块回退数值；私人面板按同一挂载资格恢复数值。原 `restoreInitialScroll`、原生 acknowledgement 与照片独立 identity 围栏保留。此次修复不改变采用视觉、地图相机、选点业务、账户或草稿存储。

## 检查与剩余目标运行时义务

复核读取当前 AGENTS、global/default Context 路由、最新 uiux/development/performance Skill、相关 Map/Shared State 合同及 DESIGN 面板/图层范围，复用前轮已采用资源和修前手机差异。本次没有远端设计读取、资源生成或重新采用。

独立执行包工作目录下既有检查：

```text
node ../../tools/run-node.cjs --import tsx --test
  src/pages/map/use-panel-return-position.test.ts
  src/pages/map/map-layer-sheet.test.ts
  src/components/spot-media-gallery-position.test.ts
  src/components/source-button.test.ts
19 tests / 19 pass / 0 fail / 0 skip，exit 0
```

覆盖本次卸载回归、隐藏/恢复、替换身份/相册、两种图层关闭恢复、anchor、触摸退休和来源取消。Root 已完成的其余相关检查和生产 typecheck 作为已有证据复用，未为 reassurance 扩展测试矩阵。独立首轮从仓库根直接跑该组时，`map-layer-sheet` 装载缺少 `@/navigation` 的包 tsconfig 别名；其他 10 项通过。改用原包工作目录后上述 19 项全过。该首轮是检查入口错误，不是产品失败，未改源码或断言规避它。

新普通预览应复用同一点、非零正文位置，打开/关闭图层后实际核对返回位置和下一次 Back。没有本轮修后手机帧；旧 gen13、host 检查、构建成功均不能替代该目标证据。完整主题/设备、私有账号切换、来源整页和完整 Goal 不在本次独立复核结论内。

## 审查源身份与操作边界

| 文件 | SHA-256 |
| --- | --- |
| `pages/map/use-panel-return-position.ts` | `05c0d4e4471cd06eca82244cb94f383561e2a5a0e343d8514338c8786bdcff35` |
| `pages/map/use-panel-return-position.test.ts` | `5188b17151bf951cdfe28721c1248b7e678530ebf7d81d7ba8eb4f0fb5320336` |
| `pages/map/index.tsx` | `fb5a3d70b2ade5d8017d840ce595d386e05f79ffe9b1be415946c9515a7dfe98` |
| `pages/map/map-layer-sheet.test.ts` | `63ee79c7e0df2841dfbb7bb0f1a87b3e600b53713bfe5a037f4afbc6e1a66d18` |
| `pages/map/spot-panel.tsx` | `fae98352fa958dda12124f3b3bc7c367eeb196ff9d338560aa2e38cc6ddae0bb` |
| `pages/map/pending-proposal-panel.tsx` | `25c63c634a73d2b39573aa67bcc92dc3f31ff8c13a72ee0514fce6dd83d7c830` |

本报告是唯一写入。没有手机、IDE、服务、HTTP、浏览器、构建、送达、账号或存储操作；没有修改生产/测试源码，没有提交、上传、删除或移动原件。内存检查只向既有 harness 暂时暴露推进 nextTick 的方法，执行未改写的生产 hook；不新增持久脚本或测试框架。没有另开子代理。
