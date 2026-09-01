# 来源与边界

## 候选身份

- 产品：《今晚去观星》微信小程序。
- 候选：Sky Canvas Field Signal revision。
- 基线 Design Authority closure：`sha256:eb3d6c5cb2b498195e61b410727e9c93b28c52c502b331e08ec02ada9766b5b2`。
- 目标：`target.system.wechat-miniapp-sky-canvas-2026-08-25`。
- 状态：未选择、未采用、非生产实现；当前项目权威保持不变。

## 用户提供的本地参考路径

以下路径仅记录为来源上下文。本次工作严格留在 Open Design workspace，未修改外部 Starward 仓库。

- `E:\Dev\Starward\DESIGN.md`
- `E:\Dev\Starward\project_context\global.md`
- `E:\Dev\Starward\project_context\architecture.md`
- `E:\Dev\Starward\project_context\areas\main.md`
- `E:\Dev\Starward\project_context\areas\main\product-surfaces\wechat-miniapp.md`
- `E:\Dev\Starward\project_context\areas\main\screen-contracts\wechat-miniapp.md`
- `E:\Dev\Starward\project_context\development-workflow\authority-and-scope.md`
- `E:\Dev\Starward\docs\design-resources\miniapp-design-system-2026-08-25-sky-canvas\selected-provider-design-system.md`
- `E:\Dev\Starward\apps\wechat-miniapp\src\styles\tokens.scss`

## 适用边界

候选只处理微信小程序非地图界面的视觉与组件表达：语义色、几何、信息组件、运动、状态、无障碍和平台适配。不重定义信息架构、路线、状态职责、算法或真实数据。

明确排除：地图提供商、底图/瓦片、原生地图外观、地图专属标记/气泡/图例/Finder、地图专属动效、原生 App、owner-operations/运营端。

## 产物可信度

预览中的地点名称、评分、时间、天气、海拔和路线值均为明确标注的演示数据，只用于验证视觉合同。它们不是 fixture 的实时化，也不能支持产品事实或业务结论。

设计值的候选权威顺序为 `DESIGN.md` → `tokens.scss` → 浏览器镜像 `colors_and_type.css`。任何正式采用都需要后续明确选择和 authority closure 更新。
