# R20 地点身份卡样式分包独审

2026-10-24，独立审阅者 `review_spot_card_style_package_owner`。本批只审阅 root 的样式加载归属变化，不重审已完成的 JSON 操作窄投影。读取项目交互 Skill、WEAPP Screen Contract、DESIGN 的现有范围以及实际消费者；未改生产、正式测试、PLAN、HANDOFF、Context、依赖或 Git，未构建、prepare、refresh、操作 IDE/USB/网络/服务或冻结代。所有检查进程已结束。

**结论：未发现本次范围内未闭合 P1/P2。** 源码和当前编译产物支持将这份原共享样式留在两个实际子包消费者。正式 2MiB 准入仍须 root 的普通官方结果；本审阅没有新的手机画面或目标视觉/交互验收结论。

## 责任和真实消费者

生产 diff 只有三处加载变化：`app.scss` 删除全局 `@use`，`pages/map/search-page.scss` 和 `content/contribution/contribution-records.scss` 在各自局部覆盖之前引入同一个 `components/spot-identity-card.scss`。原共享文件 SHA-256 保持 `4646f19e4e851db89b13bc0077ebe0ca7f84161b1fb843e7eec273f5f8608b42`，未复制规则或修改颜色、尺寸、主题、媒体规则、内容、资源和行为。

实际 JSX 中只有 SearchResultCard 和 ContributionSpotIdentityCard 创建这组卡片，二者复用 SpotIdentityContent。前者由注册的 `spot/search/index` 包装 MapSearchSurface；后者的列表和详情均由 `content/contribution/index` 引入的 records 样式负责。Map 内共享投稿编辑器没有取得记录详情渲染器，不因此需要这组私有记录样式。全仓生产类名/组件引用与当前完整产物交叉核对，main JS 中该 family 引用为 0。没有恢复退役路由或改变当前注册清单。

## 完整产物读回

root 告知完整构建终态后才读取 canonical 输出。旧完整 JSON-only 快照为 `8YIUGU/generation-000001-mH9h8u/project`，仅 snapshot、未作官方投递；本审阅独立逐件指纹核对如下：

| 产物 | 文件数 | 总字节 | SHA-256 |
| --- | ---: | ---: | --- |
| JSON-only before | 339 | 5,034,469 | `542d00f00cc321296156fedb49fa4d55113f50b353bf1610f771fa719c9c7588` |
| 当前样式归属 after | 339 | 5,037,752 | `082ae11d91cbe54ca811c1c043c496eac8f3ed4f4ddfad4acd7e340bae38abfa` |

只有三个文件字节变化：

| 文件 | before → after |
| --- | ---: |
| `app-origin.wxss` | 64,345 → 61,062 B |
| `spot/search/index.wxss` | 17,904 → 21,187 B |
| `content/contribution/index.wxss` | 10,743 → 14,026 B |

本批 main 净减 **3,283B**，两个消费者各增加同量，总包净增 **3,283B**。全部 JS、WXML、图片、配置和其它 WXSS 逐字不变。页面及 `comp` 的既有 `apply-shared` 作用域配置也未改；没有以更换运行载体取得字节差。

## 实际加载和级联核对

从实际 WXSS 展开 `@import`，保留加载顺序、选择器分组展开、祖先 at-rule、属性值、重复声明和 `!important`，没有仅按类名非零判断：

- 全局均为 `app.wxss → app-origin.wxss → common.wxss`。
- Search 继续加载 `spot/search/index.wxss → spot/sub-vendors.wxss`。
- 投稿继续加载 `content/contribution/index.wxss → content/sub-vendors.wxss`。

main 排除已移出的 family 后，剩余声明的**完整顺序序列**相同。两个消费者组合全局与页面样式后，全部选择器/祖先条件/属性值/important/出现次数相同；同一选择器的属性历史顺序相同；family 内部及其余声明各自的完整顺序序列也分别相同。因此原日间/夜间/观测、媒体存在/缺失、响应式和局部记录覆盖均保留在实际消费者中，没有以删除规则获得预算。

对于 family 移过其它样式的相对顺序，先保守列出相同优先级且属性可能冲突的候选：Search 65 项、投稿 68 项，**这些是待排除的静态交叉候选，不是测试失败或产品缺陷**。随后按未变 JSX 的实际节点和父链复核：卡片 `::after` 与普通元素不是同一目标；其余候选都要求地址图标的实际父链不具有的 My、terrain、其它表单/工具祖先。两条真实地址路径均为 semantic icon → address → copy → identity card → Search 结果或投稿记录容器；同优先级的实际冲突剩余为 0。原 SharedButton 的按压/禁用规则及局部覆盖未被该移动逆转。

这些是编译 CSS 责任和级联兼容证据，不是浏览器模拟截图或 WEAPP 实际像素通过。正常 My/合法 Picker、真实 Search/投稿资料下的目标画面、原连续交互/资源与全部 Goal 验收义务继续保留。

## 原件和冻结

自有原件位于任务 `tmp/spot-card-style-package-review-20261024/`：`compare-wxss.mjs`、`comparison.json`、`comparison-order-check.json`、`refine-cascade-crossings.mjs`、`cascade-refinement.json` 及 `source-before.json`/`source-after.json`。前后及收尾均核 root 的四份 source pins；未变共享文件另与 Git HEAD 读回核对。比较脚本只读生产输入，仅写本审阅目录；未调用构建或设备工具。

无自有服务、监听、数据库、网络或设备操作遗留。root 接续普通官方预算结果与同一候选的必要设备核验；本报告不代报正式预算、UI、内存/OOM或完整 Goal 完成。
