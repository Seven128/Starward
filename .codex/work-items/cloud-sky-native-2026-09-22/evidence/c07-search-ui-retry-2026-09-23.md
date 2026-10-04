# C07 官方 DevTools 搜索请求故障与原页重试

- 运行范围：源项目 `apps/wechat-miniapp`，官方 wechatide MCP 的 WEAPP 开发者工具模拟器，427×920；Map 正式示例点进入 `/sky/detail/index` 并打开“对象列表”。本轮未改源码、共享 `127.0.0.1:8787` 服务或手机。
- 为隔离客户端故障恢复，只在 DevTools 当前运行时短暂 mock `wx.request`，令请求走 `fail({errMsg:'request:fail simulated_search_network_failure'})`。在搜索框输入“张宿二”，等待查询后 `.status-panel--error` 出现，文案为“天体搜索暂不可用，请重试或修改关键词”，并有“重试搜索”。随即 restore `wx.request`，没有让 mock 留在运行时。
- 实际点击“重试搜索”后，错误面板消失，`.sky-object-search__result` 显示 `HR 3994恒星 · HR 3994 · 匹配 张宿二`；点击该结果打开 `HR 3994` 资料卡，内含别名“张宿二/張宿二”。本机共享 BFF 的只读真实 HTTP 同时返回 `query=张宿二`、`dataState=FRESH`、`unavailableCatalogs=[]`、`reference=HR:3994`、`matchedAlias=张宿二`、中文别名目录3149行。最终关闭资料卡并 `navigateBack` 回 Map，`.spot-panel` 节点存在。
- 截图及 SHA-256：`c07-search-failure-native-2026-09-23.png` = `B64845B8E79E3C4A241A439FA858F9DC208C95706744F670ED3014D1ED99661F`；`c07-search-recovered-native-2026-09-23.png` = `01AE4D91C43A0DDEA80D8BF0EDB431A61A93C9F3E83391C12BB3B1DFEA76DEA3`；`c07-search-selected-native-2026-09-23.png` = `815778664B68983FB764D553310D4AAA1020C2762EA090377A72187834990D19`。三图已目视检查：失败态、恢复列表和选择资料可见；Canvas 挂载与控件的目标机合成仍不能由模拟器推断。
- 证据边界：mock 模拟的是网络失败，不是中文别名出版物缺失的真实 `PARTIAL` UI。同进程生产镜像的缺包→补包 HTTP 恢复另见 `chinese-alias-http-recovery-2026-09-23.json`；两条分层证据不能替代其组合在生产云环境、Android/iOS 微信里的验证。未测生产DB、弱网、滚动发布、帧性能及真实手机控件层级。C07保持开放。
