# R19 来源真实页公共核心：独立代码审核

2026-10-22。审核人为独立子代理，未参与公共核心实现。只读审核当前未提交代码；仅新增本报告，未操作设备、IDE、服务或 Git，未修改 PLAN / HANDOFF / Context。

## 结论与范围

本次范围内未确认需要阻止集成的 P1 / P2 缺陷。审核覆盖 `utils/source-document.ts`、`services/source-navigation.ts`、`components/source-button.tsx/.scss`、`source-entry.tsx`、`source-page.tsx/.scss`、`source-document-content.tsx`、`spot/data-source/document-reading.tsx` 及 `index.tsx` 的 reading 分流，并检查 Map 当前调用、原隐藏回调及 Sky 的领域导航接线。其他代理正在迁移的全部消费者不由本报告认证。

依据：用户本轮“统一跳转页面、共享按钮与跳转、内容采用模板”的明确修订；根 AGENTS、最新 development / interaction skills、global / architecture、来源共享 Context、Sky Sources 与资源返回合同、当前 PLAN 的来源页修订及 DESIGN 的本产品尺寸与来源语义。原 inline/sheet 的历史描述不覆盖本轮用户指令。

## 核对结果

- 普通内容复用完整 `SourceSummary` 和既有 `Provenance` 阅读变体，保留发布时间、实际获取时间、有效时段、缺失含义、状态、精度、原文许可与限制。`uniqueSourceRecords` 只合并完整相同记录；同 ID 的异时段、状态、署名、许可记录不会被误并。测试来源仍由原 `isProductSource` 过滤。
- 额外解释使用 text / facts / links / forecast 的数据声明；传递内容没有 ReactNode、查询闭包、图像或 GPU 资源。forecast 继续用已有实际小时覆盖算法；外链继续经原 URL 策略并准确称为复制，未把来源页导航声称为官网打开。
- 原生交接只在 `navigateTo` 成功后通过该次 EventChannel 发送；URL 只有 `reading=1`，没有正文、账号、坐标或令牌。公共模块没有正文 registry、storage 或跨页面缓存。按钮与服务分别约束同实例连点及同时导航，失败后释放锁，当前页面可收到失败反馈。
- 收件页先校验结构并核账号、Map reset、选点、Context ID / revision / fingerprint；身份变化的同一次 render 已停止呈现旧正文，随后清理并退休。hide 清正文且拒绝迟到事件；unmount 解除监听并释放 channel 引用。不存在身份变化后以新来源回填旧文档的路径。无有效交接的页面保留原生返回及重新从当前来源入口打开的恢复提示。
- `SourcePage` 统一主题、CustomNav、独立 ScrollView 和通知承载；数据加载、部分失败、重试及出版资格未下沉到公共视觉组件。原正式点聚合页仍保独立 overview / AQ / recent-weather owner，不以固定快照取代这些读取语义。
- Map 原 `useDidHide` 会停止交互与查询，但未因普通来源导航关闭 layer-sheet 或正式点面板；原面板组件继续保留，新的按钮没有自行改档位、图层或时间。Sky 仍经 `openSkySources` 后进入共享导航器，当前已绘版本前置核验与 Canvas 返回责任仍归 Sky，未被公共导航器接管。

## 平台核对及证据边界

核对了当前安装的 Taro 4.2.1 `types/api/route/index.d.ts` 与 React/runtime 实现：`navigateTo.success` 提供 EventChannel；其 `emit` / `once` / `off` 与调用形式一致。React hook 在 layout effect 注册，页面 mount 后才执行 onLoad，因此当前首次渲染即存在的嵌套 `SourceDocumentReadingPage.useLoad` 有注册机会，不能仅因它不是导出的页函数就判定不支持。现有 auth 页也有相同 native opener 读取先例。

在线仅成功读取 [Taro EventChannel 官方文档](https://docs.taro.zone/docs/apis/route/EventChannel/)，支持上述 API 形状与一次监听/解除监听语义；微信开发者文档直连本次不可读，没有据此编造原生调用次序。Taro 本地实现及文档不能代替目标微信上的真实通道交接。

本报告未运行新增测试、未执行完整构建、未查看新来源页真机画面，也不认证物理内存。主代理应沿已有验证入口，完成关键普通来源交接与同 ID 异记录、隐藏/身份变化清理、导航失败与重开行为检查；目标 WEAPP 需实际确认正确内容、系统 Back 与原图层/时间/面板位置。Sky 精确出版来源与 Back 保资源路径仍由既有相应检查及目标输出验证承担，不额外扩展矩阵。
