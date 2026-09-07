# 地图页 · Stitch B 延续

状态：设计候选，尚未正式采用。用户当前要求从地图页开始重新生成设计资源；不包含生产代码迁移。

本轮先生成一张日间、390×844 logical-px、正式点位已选中、信息面板 medium、无场地图片的主稿。延续已选 Stitch B「连贯底抽屉」；不重新探索 A/B，不自动扩展其他页面。其余档位、主题和交互覆盖需后续按确认方向补齐，不能从本图推定完成。

职责：地图保留 Map/My 主导航、固定搜索入口和地图工具；信息面板保留身份、概览/天文定位、客观场地事实及导航/来源/纠错等既有动作；底部固定想去/分享/云观星。交互真源为当前 Screen Contract，不由截图重新定义。

视觉目标：保留 B 的连贯抽屉、平铺信息和轻分隔；改善已记录的点击区、导航换行、缺失状态文案、地图点位对应及错误画板宽度。具体排版补全交给 Stitch，不预写整套几何参数。

来源：
- 根 DESIGN.md 小程序段、project_context/areas/main/screen-contracts/wechat-miniapp.md 及 map-and-finder.md、spot-and-sky.md、information-design.md。
- 当前 apps/wechat-miniapp/src/pages/map/index.tsx、spot-panel.tsx。
- 已选方向：docs/design-resources/map-my-ui-reconstruction/20260907-skill-validation/stitch-trial/user-decision.md 及 outputs/direction-b-original/。
- 地图参考归属：该历史试验 assets/ATTRIBUTION.md；外部 OSM 图只是地图构图参考，不是当前微信截图，也不能证明原生点位坐标准确。

当前 WEAPP 截图：本轮未采集，不以历史资源冒充当前实现。此轮只交付设计资源；当前代码读取用于职责核对。

代表内容：深圳市天文台 / 深圳·大鹏；距离、到达、开放、停车、厕所未提供可核实实时值，因此保持明确缺失，不填造数据。画面内只放产品内容，资源元信息放在画面外。

HEAD：d0c77b613ebc581ee0be9cf283d1edb631643b2c；工作区存在本会话规则更新及其他未提交资源，HEAD 不能代表全部输入，输入哈希见 run.json。
Codex 实际模型/effort：unknown；当前没有可核实的宿主设置来源，不用模型自报填充。
Stitch：已登录官方网页，当前 UI 显示 Balanced，底层模型 unknown。Chrome browser-client 插件缓存版本 26.901.51231；Node 用 v24.16.0。
用量：本轮实际记录见 run.json，未知 token/额度为 null。不得从旧试验总量推算本轮消耗。
