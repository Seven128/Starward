# R19 图层往返正文位置恢复独立审查 — 2026-10-23

审查结果：Map 的挂起/恢复接线及两种关闭入口的收敛方向正确；发现一项同责任的卸载资格缺口，修复后仍需新普通预览实际核对正文返回。本报告不认证目标运行时已通过。

## 发现：卸载的旧面板仍能发布位置（P2）

- 位置：`apps/wechat-miniapp/src/pages/map/use-panel-return-position.ts:68–71`、`:193–211`；实际消费在 `index.tsx:217`、`:1520`。
- 当前可见性 effect 的 cleanup 仅递增 `measurement` 并取消原生几何读取。面板因 `bottomPresentation` 切为 `layer-sheet` 而直接卸载时，没有一次 `visible=false` render；其 `visibility.current` 仍为 true，`epoch.current` 也仍等于旧回调捕获的 `renderedEpoch`。
- 因此，卸载前取得的 `document.record(0)` 和 `gallery.onScroll({detail:{scrollLeft:0}})` 在卸载后仍被接纳，并继续调用父级 `recordPanelPosition`。新修复的 `extentBeforeLayer.position` 保留的是旧对象引用，能够保护已挂起的这一次恢复；但旧回调若在新面板已经恢复并发布当前阅读位置之后到达，仍会覆盖父级位置 ref，使后一次挂起取得错误的 0/0。这是旧挂载回调的资格问题，不需要改变视觉、数据或地图 owner。

本次用已有 `use-panel-return-position.test.ts` 的 `hookHarness` 在内存中执行生产 hook，只在内存 harness 返回值增加 `unmount()`，调用其已登记的真实 effect cleanup。先完成正常恢复及 native acknowledgement，再卸载并调用卸载前保存的两个回调，结果为：

```json
{"before":{"identity":"spot:a","top":471.5,"galleryIdentity":"spot:a:one|two","left":198.3},"unmountedDocumentEventAccepted":true,"unmountedGalleryEventAccepted":true,"after":{"identity":"spot:a","top":0,"galleryIdentity":"spot:a:one|two","left":0}}
```

这建立了生产 hook 接纳旧挂载回调的反例。它不建立手机一定会在该时序派发旧 native scroll，也不将此前 gen13 的实际回顶症状全部归因于这个时序。

必要修法：在原 hook 增加可重入 setup/cleanup 的挂载资格，卸载时退休这一个实例的写回、takeOver 和 source preparation 资格；新实例继续使用自己的资格。原可见性、身份、gallery、measurement 和 acknowledgement 围栏保持。不能只在依赖 `[visible]` 的旧 cleanup 中单独写 `visibility=false` 或递增 epoch：show render 已安装的新值可能被其旧 cleanup 覆盖；也应检查 StrictMode 的 setup/cleanup 重入。只需在原测试 owner 补“旧实例卸载后不能发布位置、新挂载能正常恢复”的回归，不扩展成新的状态或测试框架。

Root 已收到此发现，并明确接手同责任修复；本次审查未编辑生产或测试文件。

## 已核对的修复与真实消费者

- 对比私有 gen13 源 `panel-return-probe-20261023/map-repaired.tsx` 与当前 Map。实际差异仅为：共享 setter 接收可选恢复位置；挂起记录加入 `position`；再次点击图层复用 `closeLayerSheet`；关闭把挂起位置传回原面板。没有复制第二个 bottom owner、改变原 Back 顺序、修改采用视觉或重新选择资源。
- `openLayerSheet` 在卸载前读取当前 `panelPosition`，其中包含纵向 top、gallery identity/left 和可选阅读 anchor。挂起后父级 ref 的替换不会重写已保存对象；两种关闭入口进入同一个恢复函数。没有原面板时不虚构面板，正式选择已换点时不恢复旧点；正式新选择的 `openDetail` 仍清除旧挂起记录并以中档打开。
- `SpotInformationPanel` 与 `PendingProposalPanel` 都收到同一 `restorePosition`/`onPositionChange` 接线。原 hook 对文档 identity 和照片集合 identity 分别准入：更换文档拒绝旧位置，更换照片集合不把旧 left 套到新相册；正式正文有 anchor 时按实际几何恢复，块不存在时回退原数值。原 `restoreInitialScroll` 避免新挂载的初始化章节命令覆盖有效恢复位置。
- 私人面板的文档 identity 包含当前 owner 与 submissionId，照片集合也带同一 owner/submission；账户投影与选中提案的原围栏保留。本次改动不调用账户登录、草稿保存/删除、选点提交或服务请求，不修改 N05、原账户和其他草稿。未发现本次改动引入的另一项可复现账户/草稿越界；这不等于真实换号验收。
- Map Back 的 disclosure/viewer/calendar/editor → layer → panel extent 次序未变；关闭图层只调用原恢复函数，后一次 Back 仍由原档位 owner 处理。没有恢复 medium 的硬编码或额外时间窗口。

## 采用资源与实际画面对照

读取当前 `AGENTS.md`、`project_context/global.md`、Context manifest、最新 `.codex/skills/uiux_design/SKILL.md` 与 `starward-miniapp-development/SKILL.md`，并按职责读取 `DESIGN.md` Mini Program 范围、Map/Shared State Screen Contract 与开发反馈边界。采用稿保持同一范围，未进行远端读取或资源生成。

实际查看已采用输入 `implementation-input-20261022/ADOPTION.md`、`review-images/map.png` 和 `review-images/layers-cloud.png`，以及 gen13 私有原件的 450 比例审阅图：

- `screen-148cf9f3-c869-42ce-8136-a7726601502b.review-450.png`：中档正文开头为开放时间，后接开放/进入/安全与设施卡。
- `screen-701e6bf4-2019-4d0b-a45d-124d0c61e22c.review-450.png`：同一点中档返回身份/地址标题，开放与设施被推到下方，且出现近期天气异常通知。

与 [本代手机报告](R19-GEN13-SHARED-PRESS-LAYER-PHONE-20261023.md) 一致，原 gen13 存在可见回顶差异。两图是修前普通预览证据；当前源码接线、host 回归或同代其他路径不能转写为修后手机通过。修复本次接线和卸载资格后，应在新普通预览用同一点非零正文位置打开/关闭图层，实际核对返回位置及下一次 Back；复用该批图覆盖所需消费者，不重开无关验收。

## 检查、身份与边界

Root 提供的聚焦 41 项通过、生产 typecheck exit 0，以及旧实现两条返回路径均因 null 失败，作为已有开发证据复用；本审查没有为重复确认重跑。已阅读新 AST 测试对原 setter/open/close 的实际提取与执行，确认它检查两轴及 anchor 的内容，不以成功消息或空结果代替恢复。旧 fixture 缺少 `panelPosition` 的修复明确为 null，没有借此弱化断言。

审查时源 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `pages/map/index.tsx` | `fb5a3d70b2ade5d8017d840ce595d386e05f79ffe9b1be415946c9515a7dfe98` |
| `pages/map/use-panel-return-position.ts` | `684258ada237bb2a38a335cf1f900c969aba97818732a7f0b6a3214fef6e7a4b` |
| `pages/map/map-layer-sheet.test.ts` | `63ee79c7e0df2841dfbb7bb0f1a87b3e600b53713bfe5a037f4afbc6e1a66d18` |
| `pages/map/spot-context-race.test.ts` | `8a12003a285b5a0ccbe372eff72618e35fada35a95ee150dfce93cba596fefe8` |

额外执行仅为上述具体卸载未知点的内存反例。首次 VM 直接保留 `import.meta.url` 导致语法拒绝，未执行 hook；把它在内存中替换为实际测试文件 URL 后得到上述结果。未添加脚本或改写任何测试。

没有手机/IDE/服务/HTTP/浏览器操作，没有重建或重新送达，没有提交/上传，没有删除/移动原件。本报告是唯一写入文件。完整 native 返回、其他主题/设备、精确动作时序及完整 Goal 仍由原任务和其目标运行时证据负责。
