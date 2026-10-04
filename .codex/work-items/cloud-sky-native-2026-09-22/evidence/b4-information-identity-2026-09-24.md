# B4 搜索、资料与来源身份及恢复链

## 结果与责任

搜索和位置响应已有查询/观察上下文身份校验，但天体资料响应只经通用 envelope 类型检查。实际网络或缓存若返回另一对象的资料，当前对象弹窗及独立来源页可能显示错误身份/出处。现在资料请求在 `api-client` 边界验证 `reference`、类别及弹窗/来源消费者需要的结构，错对象或畸形事实/署名立即失败，并撤回该 HTTP 缓存键；既有 Query 错误/重试通道负责恢复，不修改独立星图和位置结果。

资料弹窗现在区分三种可用性：刷新失败且已有资料时保留事实、标记过期并提供页内重试；响应不可用时不呈现其事实并提供重试；正式服务可返回的 `PARTIAL`（例如中文别名出版物缺失）保留现有目录事实并允许重试。来源页同样保留已取得的来源与 `PARTIAL` 重试。跳到来源页后，隐藏的星图会卸载自己的资料组件；所选对象仍由星图页面持有，返回时重新挂载，避免隐藏页面继续展示资料/发出提示。原生 Back 所有权仍按前一轮的可见性边界。

## 检查

- 错引用、错类别、畸形事实与署名被资料适配器拒绝；同引用的有效内容原样保留。资料弹窗实际组件的 stale/不可用/partial 分支及重试可调用，来源页 partial 来源卡和重试可调用，隐藏页面的实际 JSX 挂载条件有检查。资料 stale 页内重试的测试在修复前失败。
- 正式 `CelestialObjectInformationService` 当前 BSC v3 路径的 `HR:7001`、`SAO:1`、`M:31`、`PLANET:VENUS` 响应逐一通过同一适配器，内容状态分别为 READY/BASIC_ONLY/READY/BASIC_ONLY；这核实真实出版结构，不仅是手写 fixture。
- 与搜索、位置、Context 和来源返回的受影响组合 26/26 通过；Mini `typecheck` 通过。最终正式 WEAPP 构建写入专属 `sky-b4-infoidentity-final-0924` 隔离 slot 并通过，日志 [b4-information-identity-final-build-2026-09-24.log](b4-information-identity-final-build-2026-09-24.log)。已有三条 webpack 样式顺序/资产大小提示仍在。前一个 `sky-b4-infoidentity-0924` 构建是中间快照。

这些证据不等于目标微信真机上的弹窗/来源页合成、焦点、Back、Canvas 返回或完整时间/模式组合。Android 旧包的来源返回 Canvas 失败仍保留 P1；没有占用手机或当前 IDE。
