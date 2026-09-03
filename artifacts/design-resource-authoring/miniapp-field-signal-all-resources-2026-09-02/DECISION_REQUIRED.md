# Decision Required — Map / Finder 产品 UI 视觉权威

Status: authorized by owner on 2026-09-02

这是一份 task-local 决策记录，不是需求方案、设计 Source 或选中候选。用户在收到本文件所对应的精确授权问题后回复“继续”；本记录据此关闭该边界，只授权下述最小 Map/Finder 产品 UI 视觉范围，不授权任何更广产品或技术变更。

## 为什么必须询问

- 本任务要求重新生成微信小程序的全部设计资源，`miniapp-map-discovery` 是六个稳定 Product Surfaces 之一。
- 当前 Field Signal 设计系统明确排除 map marker、callout、legend、Finder 构图与地图专属动效。
- 用户已要求旧设计系统和旧页面资源退出当前生成；`target-miniapp-sky-canvas-current-constraint` 因而只能作为历史审计记录，不能补足上述空白。
- Product Surface / Screen Contract 定义了 Map/Finder 的信息、Control、状态和交互语义，但它们不是视觉规范。让生成模型自行补样式会制造第二套视觉权威，并违反“严格遵循新设计系统”。

## 请求授权的最小范围

授权把现有 Field Signal 视觉语言扩展到下列**小程序自有产品 UI 层**：

- Search field、query overlay、quick filters、advanced-filter form；
- Finder Sheet、handle、结果列表及 `closed / peek / expanded` 表现；
- location control、观测条件 Bar、focus layer、layer selector、time control；
- formal-spot marker、selected-spot callout、app-owned legend；
- 上述控件的 day / night / observation、状态、响应式、可访问性与 reduced-motion 表现。

扩展必须复用当前 Field Signal 的 token、字体、间距、边界、层级、触控尺寸、反馈和动效原则，并从当前 Screen Contract 重新构图；不得复制旧设计资源。

## 明确不授权、也不会改变的内容

- 地图 provider、basemap、tile、道路/地形/卫星内容或原生地图渲染外观；
- 产品 Surface、route、信息架构、Control ownership 或 interaction semantics；
- 搜索、筛选、选点、时间同步、定位、导航、收藏等产品/业务/数据逻辑；
- API、schema、算法、权限、安全、持久化、发布逻辑或生产代码；
- 旧布局、旧组件、旧动效、旧兼容 UI 或 old/new 双轨；
- 用户可见的 `version`、`vN`、日期、revision、`旧版`、`新版` 标签。

## 授权后的动作

1. 通过现有 UI/UX Design Authority 路线补齐上述最小视觉规则，并同步 owning Context；
2. 为更新后的当前设计系统创建新的不可变来源，绝不覆盖旧 selected source；
3. 同步 Open Design canonical design-system，并验证 exact binding 与 provenance；
4. 创建新的 bounded all-resources 项目并生成完整交互候选；
5. 完成最小机械、Source、响应式、状态、可访问性与真实渲染检查；
6. 停在 Design Resource Review & Selection Stop，交由用户审计，不自行选中。

## 未授权时的结果

不得生成声称“完整且严格遵循当前设计系统”的全量候选。排除 Map、使用旧视觉、使用模型默认样式或把中性占位伪装成最终 Map/Finder 设计，都不能满足当前 Goal。
