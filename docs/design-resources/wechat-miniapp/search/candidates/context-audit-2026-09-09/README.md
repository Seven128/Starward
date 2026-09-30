# 搜索筛选局部修订 · 候选

当前入口：[CURRENT.md](CURRENT.md)。本对话最终修订已收敛到页面ADOPTED；下方原稿、各轮审查与未采用表述属于历史过程记录，不能覆盖当前入口。

## 历史来源与逐轮记录

按用户授权使用 Starward design-resource Skill，经官方 Stitch 已登录网页生成。用户尚未审查，不替换 Search/ADOPTED.md。

- 上游规则：[Map/Search Screen Contract](../../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md#filter-semantics-and-coverage)。
- 参考：当前采用包 `../../adopted/search-page/reference/filters.png`，实际通过剪贴板图像附到 Stitch，显示附件 clipboard.png；旧 Stitch 探索画板不是当前采用稿。
- [完整输入](stitch-prompt.md)、[重试与精修输入](stitch-revisions.md)。
- 旧 Stitch 项目已删除（ID `5585184579244766246`）。首稿 DOM 导出的实际 screenId 为 `f46ac9ab614c47d0ad9521298d496123`。
- [未改动首稿](stitch-original/index.html)：从实际画板 iframe srcdoc 保存，包含 Stitch 注入的编辑辅助代码，尚非独立交互原型。原稿含多余步进按钮、常驻范围说明及设备壳，已提交精修；不把此原稿作为最终候选。
- Stitch 网页显示“均衡”；服务模型和单次费用未提供，不推断。

## 当前审查入口

- [可交互候选](review.html)：16项筛选、驾车启用/参数确认取消、五分类与四类覆盖状态演示。
- [390px画面](reference/arrival-390.png)、[320px](reference/arrival-320.png)、[375px](reference/arrival-375.png)、[430px](reference/arrival-430.png)。
- [精修源](stitch-refined/index.html)，实际持久化 screenId `6947ef6be7e84a56bac1d0717adf319d`。服务先报成功但画板未出现，刷新后查到独立新画板并保存；没有再次重复提交。
- [验证范围](verification.md)。

候选preview是Codex的明确集成修订：保留采用包的搜索框、卡片、五分类、浅蓝确认按钮和已有披露/横滑/焦点逻辑；只把Stitch精修的驾车同层输入构图接入，并补充确认/取消、范围错误及画外样例状态。未直接把Stitch改动过的整页和黑色确认按钮替换采用稿。新增区域的44px命中与可访问属性为集成修复；源与修订分别保存，不冒称纯Stitch原稿。仍需用户审查。

本包只涉及非生产设计资源；不实现真实筛选服务，不证明WEAPP/键盘/地图/生产数据通过验证。完整执行进度在任务索引中。

本地预览依赖仓库内既有采用资源和共享卡片。以仓库根为静态根，打开此目录review.html。当前临时服务为 `http://127.0.0.1:5329/docs/design-resources/wechat-miniapp/search/candidates/context-audit-2026-09-09/review.html`；服务关闭后可用任务目录serve-review.mjs重新启动。未部署或发布。

## 第二轮用户反馈修订

本轮继续为候选，未自动采用；仅修改设计资源与Context。修改前源保存在 `before-feedback-02/`。Stitch 本轮原始输出保存在 `stitch-feedback-02/`，当前 `preview/` 是保留原采用壳的 Codex 局部集成，并非未加工的 Stitch 导出。

## 第三轮审查修订

驾车范围重做为轻薄两行：启用项与时间/距离同排，下一行自然数值，不再使用蓝框大卡。44px独立目标与参数确认/取消保留。

修改前 preview 存于 before-feedback-03/；新稿仍待用户审查，未改 ADOPTED 或生产。Stitch 来源见 [第三轮原稿](stitch-feedback-03/README.md)。

## 第四轮

第四轮：驾车输入可见底板44×28px，数值13px，保持独立44px命中区，单位紧邻，与其他筛选统一比例。

[Stitch 原稿与提示](stitch-feedback-04/README.md)；修改前预览见 before-feedback-04/。仍待用户审查，未采用或开发生产。

## 第五轮（当前）

第五轮：驾车范围改为普通40×24px白底细边数字框，12px文字，删除额外底板，保留时间/公里切换。

修改前保存 before-feedback-05/。公共材质见 [共享资源](../../../shared/liquid-glass/README.md)。仍待审，未改生产与ADOPTED。


## 当前状态

本对话已按用户指示收敛，以[CURRENT.md](CURRENT.md)和页面ADOPTED.md为准。以上各轮“待审/未采用”是当时记录，不再与当前入口竞争。生成原稿与本地集成继续分别保存。
