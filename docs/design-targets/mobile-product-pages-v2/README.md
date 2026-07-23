# 今晚去观星 / Starward · 全系统移动端交互原型 v2

这是一个系统级、可评审、可交互的中文简体上游 Source。直接打开 **index.html** 即可运行，无构建步骤、无外部依赖。中心设备固定为 390 × 844；左右为桌面评审壳，不属于产品界面。

## v2 视觉 P0 修复

- **地图**：`map-route-discovery` 改为地图画布填满产品内容区的沉浸任务面；搜索 / 地点与观测夜上下文、筛选、定位、图层均为地图覆盖控件。Marker、聚合、地点评分、主备角色与路线共享同一状态；`selected-spot-sheet` 支持 25% / 55% / 90% 三档、拖动吸附、按钮直达与 ARIA 状态，展开后承载筛选摘要、图层摘要、路线编辑和外部导航交接。
- **天空**：`sky-orientation-ar` 改为天空画布填满产品内容区的沉浸任务面；地点 / 时间 / 目标 / 图层位于顶部覆盖层，底部控制层承载时间拖杆、手动方向、校准、遮挡轨迹、器材视场与可选 AR。拖动时间以及切换目标、图层、视场会同步更新画布；无传感器 / AR 时保留手动与 degraded 路径。
- **红光**：删除 `.screen[data-mode="red"]` 的整屏 `filter`，改为只作用于手机屏幕的显式低亮红阶 `--red-background / --red-surface / --red-foreground / --red-border / --red-accent`；桌面左右评审栏继续使用规划色。
- **交互与可达性**：地图、天空和现场产品控件保持不小于 44 px；Bottom Sheet、天空控制层、时间 scrub 与模式切换保留 reduced-motion 路径；产品内容区横向溢出被禁止。
- **覆盖契约**：12 个 Outcome、83 个 unique stable control、五个一级 Tab、11 种评审状态、route、共享上下文、`data-outcome` / `data-control` 与未声明边界均继承 v1；`coverage-manifest.json` 保持与 v1 字节一致。

### 实际修改区块

- CSS：红光模式变量作用域；`.content.is-immersive`；`.immersive-map` / `.map-*`；`.immersive-sky` / `.sky-*`；`prefers-reduced-motion`。
- Renderer：`renderMap()` 与 `renderSky()`；其余 10 个 Outcome renderer 保持 v1 内容。
- Interaction：地图 detent / 拖动、Marker / 图层 / 主备 / 路线同步，天空控制层、时间 / 目标 / 图层 / 视场 / degraded 同步，以及评审清单跳转到被折叠控件时自动展开。

## 交付物

- **index.html**：完整交互原型、五项一级导航、二级路由、状态切换器、三种显示模式和 390 × 844 iPhone 评审壳。
- **coverage-manifest.json**：12 个 Outcome、83 个稳定控件的 route、state 与 interaction 覆盖清单。
- **README.md**：信息架构、模式、约束、数据边界与未宣称事项。

## 信息架构

五个一级 Tab 固定为「今晚、地图、行程、天空、我的」。主路径是：

今晚结论 → 地图选点 / 路线 → 地点详情 → 行程 → 天空 / 摄影 → 现场

二级路由承担首次使用、专业预报、摄影、现场、贡献、通知工具箱与账号隐私：

| Outcome | Route | 产品内入口 |
| --- | --- | --- |
| mobile-shell-and-preferences | /onboarding-preferences | 我的 → 偏好与权限 |
| tonight-decision | /tonight | 一级 Tab：今晚 |
| forecast-and-astronomy | /forecast | 今晚 → 查看专业证据 |
| map-route-discovery | /map | 一级 Tab：地图 |
| spot-detail-and-trust | /spot/qingshuihe | 地图 → 地点详情 |
| itinerary-and-collaboration | /trips | 一级 Tab：行程 |
| sky-orientation-ar | /sky | 一级 Tab：天空 |
| shooting-assistant | /shooting | 天空 → 摄影助手 |
| field-offline-safety | /field | 行程 → 进入现场模式 |
| community-contribution | /contribute | 地点详情 / 我的 → 贡献 |
| notifications-and-toolbox | /toolbox | 我的 → 通知与工具箱 |
| identity-profile-privacy | /me | 一级 Tab：我的 |

评审抽屉可以按 Outcome 或 control id 直达，但不替代上述产品内导航。

## 共享决策上下文

出发地、观星夜、时刻、偏好、目标、选中地点、主备角色、路线、行程 revision、数据新鲜度与风险由同一上下文持有。地图 marker、地点卡、Bottom Sheet 与路线选择同步；时间拖杆会更新天空与持续上下文；主备切换会同步行程角色。刷新期间旧结论先标记为 stale，完成后才恢复 fresh。

## 状态模型

桌面评审壳可在同一页面族切换：

success / loading / empty / no-results / stale / partial / degraded / unknown / error / disabled / saving

状态不是复制的静态屏。Loading 保留壳和上下文并说明 15 秒兜底；错误保留输入，提供重试，并在三次失败后给出可复制错误 ID；partial、degraded、unknown 与 stale 在原有内容上明确说明缺失、降级或过期。

## 显示模式

- 规划：白色主画布，次表面为薄云灰。
- 夜间：低亮深色表面，信息架构和控件位置不变。
- 红光：在相同深色结构上作低亮单色变换；不靠颜色单独表达状态。

三种模式不改变阅读顺序、路由、触控位置或控件语义。

## 交互与无障碍约束

- 主要触控目标不小于 44 px；所有稳定控件节点带 data-outcome 与 data-control。
- 键盘焦点可见，表单在失焦时验证，错误使用文字、形状与语义角色，不只依赖颜色。
- 按下反馈目标不超过 80 ms；普通按钮演示 0.98 缩放与 0.88 透明度，地图 marker 与危险动作不缩放。
- Bottom Sheet 支持约 25% / 55% / 90% 三档，可拖动并在释放时吸附。
- 时间拖杆按指针 1:1 更新样例时刻，可中断和反向。
- prefers-reduced-motion 下移除循环 / 轴向动效，保留不超过 120 ms 的淡变或立即切换。
- 危险或不可逆流程展示影响说明，并要求再次确认。
- HTML 只演示交互结构与行为，不宣称原生手势、传感器或渲染性能。

## 样例数据边界

界面使用中国大陆简体中文、公制、24 小时制与真实感样例结构。地点名、距离、海拔、天气、天象、评分、路线、停车、设施、实况、时间、账号、协作、设备、通知与错误 ID 均为“设计样例”，不用于真实出行、安全或拍摄决策。

预测、估算、用户实况与人工核验在界面中分别标注。来源、许可、版本、生成 / 过期时间、可信度、warnings、缓存与缺失字段是信息架构样例，不代表已经获得生产数据或授权。

## 明确未宣称

- 不是生产 React Native / Expo 实现，也不含生产组件 API。
- 不连接真实地图、天气、天文、路线、AR、相机、传感器、通知、账号、同步或位置分享服务。
- 不提供实时性、可用性、路线通行或人身安全保证。
- 不执行真实外部导航、登录、邀请、分享、数据导出或删除。
- 不修改 Context、DESIGN、Source Plan，不包含 Figma 迁移，也不代表最终选择或验收结论。

## 覆盖核对

**coverage-manifest.json** 是机器可读的覆盖清单。每个 control id 必须在 **index.html** 的实际交互节点上通过同名 data-control 出现，并与对应 data-outcome 成对。评审壳控件使用独立的 data-review-control，不计入 83 个产品稳定控件。
