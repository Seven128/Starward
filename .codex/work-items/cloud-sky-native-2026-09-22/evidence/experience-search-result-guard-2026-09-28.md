# B1/B4 搜索改词时的对象身份提交保护

目标是“搜索→点选资料”中的身份一致性：原生输入显示新关键词但 React 尚未撤掉旧结果行时，旧行不能提交上一颗天体。保持现有天体列表、250 ms 防抖、TanStack 查询和正式对象身份 owner；不重选搜索服务或修改天文数据。

## 触发与修订

HORIZON0928 同一公开示例点的官方 SDK 输入观察：稳定“织女星”结果为 Vega；输入“木星”后约 11 ms 的 WXML 样本中，新输入值与旧 Vega 行短暂并存，约 85 ms 样本已变“正在查找”，约 311 ms 为 `PLANET JUPITER`。这是命令和采样耗时，不是屏幕帧时，也不是手机中文输入法证据。[前次画面/搜索观察](experience-painted-star-pick-2026-09-28.md)保留原记录。

`SkyObjectSearch` 原来把旧结果的点击回调直接交给 `onSelect`。新增的定向回归在**输入事件已收到新词、React 尚未重渲染**时调用旧结果回调：修前确实将 Vega 交给选择 owner（测试失败），所以这是边界上的真实代码路径，不以 SDK 的极速点按是否刚好触发为判据。现在输入/确认事件同步更新该组件持有的最新归一化查询；提交结果前核其对应的 `settledQuery`。不匹配时既不关键盘，也不打开资料。正常已稳定的新结果保持原 `hideKeyboard` 与选择路径。改动只在[搜索组件](../../../../apps/wechat-miniapp/src/features/sky/sky-object-search.tsx)及其[定向回归](../../../../apps/wechat-miniapp/src/features/sky/sky-object-search.test.ts)，没有新增第二状态源或改变后端合同。

## 当前候选验证与限制

修前回归退出1、明确多出第二次 Vega 选择；修后4项退出0，Mini typecheck退出0。首次隔离构建 `weapp-check-sky-search-0928` 退出0（[构建日志](experience-search-guard-build-2026-09-28.log)），产物 `sky/detail/index.js` SHA256 `454f64b9647b877b84beb54ecd65ae1cb20d2ca1b0e400d81ab709cff8130681`，包含 `SEARCH0928` 代次；官方CLI打开该 exact project。真实 DevTools 从 Map 搜索公开示例点→Sky手动星场（21:00、13:00Z、4040颗目录星）→天体列表，新词木星稳定后可打开并保持“木星”资料弹层；极快改词/点按探针未打开旧 Vega 资料。当前最终源码与该首次构建相同，后来试验的异步键盘方案已撤销。

**后续代次纠正**：新环境候选的抓图核查发现固定 SDK 端口 9420 仍连接 HORIZON0928；按项目调用的工具与该 SDK 连接并非同一候选。先前没有前后核可见代次的极速 SDK 探针，不能归属 SEARCH0928 或异步键盘试验，也不能据其比较两种源码或将“木星弹层短暂关闭”判为当前源码缺陷。上述比较判断撤回；异步试验源码仍撤销，源回归/构建和 exact-project 工具读回的稳定木星资料事实保留。详[捕获连接纠正及当前环境证据](experience-night-horizon-2026-09-28.md)。

当前含最终搜索保护的 NIGHT0928 通过独立 9428 端口、操作前后可见代次校验重做一次有界探针：输入新词后36 ms采样未见旧Vega行，故旧行点击分支没有执行；无旧Vega/其它资料弹层。它不能替代源码回归对旧回调的证明，亦不证明手机极快操作。随后按项目读取实际稳定 `PLANET JUPITER` 行并自然tap，2秒后资料仍为木星。手机中文键盘、极速改词/点按及真实同层触控继续待目标验证；不再以未核代次的旧短暂关闭样本驱动生产修复。

随后在恢复的最终源码上重跑定向4项、Mini typecheck和差异空白检查，均退出0。构建仍有既有 CSS 顺序、asset size 与 webpack 建议三类警告；两个本地候选都把 API 编译为 loopback，不能推手机。试验构建 `weapp-check-sky-search-ready-0928` 包含已撤销方案，只作反证历史，不是当前源码候选。未进行新版手机预览、云部署、提交或推送。
