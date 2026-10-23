# R19 Map 长搜索框样式退休

2026-10-22。主任务确认第二代 UI 的官方 auto-preview 报主包 source size 2050 KB 超过 2048 KB；本项只退休已被采用的圆形搜索按钮取代、且当前生产节点不再使用的长搜索框 CSS。不认证新一代官方上传或手机结果。

## 依据与边界

- 已读取 AGENTS、global、交互 Skill、Map/Search Context 的 2026-10-22 采用范围及 DESIGN 对应规则，查看当前采用增量 `3995519477980461148` 的 `map.png` 和 `review.mjs`。采用稿保留独立 Search 页面，将 Map 搜索入口改为工具列首个圆按钮。
- 当前 `pages/map/index.tsx` 的搜索按钮类是 `map-tool map-tool--search focus-ring`；`data-control="map-search-entry"` 仍是有效语义/自动化键。全生产源码检索没有 `.map-search-anchor`、`.map-search-entry` 或其 placeholder 变体的 class 消费者，也没有 `map-search__` 消费者。
- 仅编辑 `apps/wechat-miniapp/src/pages/map/index.scss`：删除长框独立规则，并从共享选择器组中移除长框选择器。保留其余规则、`--map-search-top` / `--map-search-height` 几何声明与消费者、52 Px 命中尺寸 / 44 Px 可见面、DAY 四个 26 Px 图标、其他主题和所有有效工具列行为。
- `finder-field` 的 import 与 `day-brand-title` 仍有 Map 品牌标题消费者，均保留。Search 页面、导航、图标资产归属、原图尺寸、PLAN、HANDOFF、冻结构建及既有 dirty 成果未改。

## 字节与静态等价性

| 范围 | 修改前 | 修改后 | 减少 |
| --- | ---: | ---: | ---: |
| Map SCSS UTF-8 源码 | 82,142 B | 78,532 B | 3,610 B |
| Sass 1.93.2 compressed CSS | 91,325 B | 87,996 B | 3,329 B |

移除 21 个独立规则；另外 14 个规则仅删旧选择器分支；合计退休 41 个编译后选择器分支。两份源码使用同一原文件 URL 编译，以保留相同 Sass 相对依赖。PostCSS AST 对照先仅过滤旧类，再比较全部其余选择器、声明、顺序及 at-rule 上下文，完全一致；两项 Map 几何变量的完整声明列表也完全一致。

本机原始文件、两份编译 CSS 和 `metrics.json` 保存在：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/search-retirement/`。这是局部 CSS 字节度量，未把它直接当作官方主包 source size。

## 检查与交接

- Sass 前后编译及严格 AST 等价检查通过。
- 在 `apps/wechat-miniapp` 运行 `node ../../tools/run-node.cjs --import tsx --test src/pages/map/map-data-recovery.test.ts src/pages/map/panel-presentation.test.ts`：12 项通过，0 失败。保留搜索语义入口、业务恢复及工具列 release-clock 行为。
- `tools/miniapp/workflow-conformance.test.mjs` 的旧断言仍要求无生产消费者的 `.map-search-anchor` 与 `24rpx` top；已交主任务按本次采用的搜索图标责任迁移。未为通过该旧断言保留死样式，也未擅改 Harness。
- 完整 Taro 构建、官方预览包体复核、目标手机观察及 Git 检查由主任务统一执行。此次不新增行为测试、不重画资源、不改 My 方案、不开展额外设备流程。
