# R20 Map 故障 session 与未知退休（2026-10-24）

本批只实现 PLAN Refactor 1 的首条真实源码责任路径：原生栅格命令永不回调后的 Map 故障重建、旧资源所有权、迟到结果与实际页面消费者。没有操作 IDE／手机／构建／服务／网络／冻结代，也没有提交或上传。当前源/设备状态由 root 的 HANDOFF 持有。完整 Goal、物理资源退休及 OOM 没有完成。

## 原问题与限定结果

[原核验](REVIEW-RECONCILIATION-20261023.md) F04 已实际复现：add 成功、update 永不回调，原10秒后两次 suspend 都 remainingIds=[101]、complete=false；页面 retryNativeMap 又等待该 complete，形成恢复闭环。

当前真实页面 handler 不再以正常 Sky 退出的 `suspendMapRasters.ready` 为故障重建许可。它通过既有 `useNativeMapRecovery` 同步退休旧 session 的业务/发布权限，使用新的全进程唯一 Map id/key；相机、选择、面板阅读及 Context 没有迁至新 writer。`native-map-session.ts` 只集中实例身份、栅格准入和未知退休；原 semantic data/coverage、primary navigation、相机及单覆盖安装 owner 不变。My hide/show 仍保同一 Map；普通 Sky 退出仍等待两层真实移除并支持取消/恢复最新目标。

`use-map-raster-installation` 在发出原生命令前把实际 coordinator 注册到该 session。终结/外部卸载不遗失旧 coordinator。旧 coordinator 的 `retired` 只在 terminal 状态且全部 slot 的真实 remove 成功后完成；add/update/remove 的 timeout、React cleanup、generation 失效、后继 Map updated 均不能清 pin。迟到命令使用闭包内原 Map context/唯一 Map id 与原 File 身份，即使 overlay 数字 id 相同也不会清后继文件或发布后继来源。兼容双槽和更严格 same-id-only 透明父图规则未改。

## 两种未知状态与有界恢复

- **栅格退休债**：保原文件及 coordinator，首次直接 fault successor 可继续实际显示。若该 successor 又外部卸载，之后的新页面不再向原生层装入新栅格；独立有效数据和最新 target 保留，原通知/层叠正文显示“旧地图图层仍在清理，完成后会自动恢复。”真实旧 remove ack 清完各自债后通知已挂载 owner，按最新数据重新安装，必须新 ack 才认证来源。既有文件/传输限额不变。这个有限状态是避免故障链扩张，不是测得的新内存预算。
- **整个失败 Native Map 实例**：没有已核的销毁 acknowledgement。即使未启用栅格或所有 remove 成功，也不能从文件数0推断整个 Map／decoded／GPU 已释放。因此首次 fault replacement 后，全 appservice 保留一个独立 native-unknown，不允许第二次 fault replacement；普通健康 Sky 导航不从它制造新的故障债。再故障时现有浮动通知给出“地图暂时无法再次加载，请重启微信后再试。”不会静默丢重试，不伪造销毁确认或在 timeout 后释放。这项 native-unknown 只随实际 appservice 生命周期结束，不由页面返回、同 id remove 或后继 updated 清除。

这一保守恢复上限不是完整反复故障能力或物理回收完成。下一目标观察仍需核当前真实 WEAPP native 节点的失败→替换→恢复输出及实际退休边界；若平台提供可取得的资格事实，再沿此 owner 收口，不能自造 clear 方法或拿 JS remount 当 native/GPU 证明。普通 UI、三层连续交互、H4、Sky 六字段/Play/退出及 OOM 义务全部保留。

## 实际消费者与检查

- `run-wechat-devtools-session.mjs` 的三个固定 `#spot-map` selector 迁为编译原宿主已有 `.native-map`；对应 workflow 声明同步，minimum/动作断言保留。Map JSX 的稳定 class 与每次唯一 id/key 分工，旧 context 不再命中新页面重用 id。独立测试的自有 `spot-map` stub 未机械修改。
- 五个现有/新增责任文件合跑 **60/60、0skip**：native session、实际 recovery hook/Map JSX、真实 coordinator、raster hook、实际 Map 页面/Sky commands。涵盖实际 add→永不回调 update→timeout→页面 fault retry、后继同 overlay id 安装、旧 late callback/remove 不触后继、原双层正常退出/取消，以及无文件的 native-unknown 和外部重入上限。原件 `tmp/r20-map-session-affected-delivery.log`。
- 精确旧 `63ee13b69d87faada00f8f3af495eeccb6d09609` 的 index.tsx 在内存替换读源，复用同一回归入口：**0/1失败**于 `fault retry cannot wait on the failed native cleanup`。preload 不写生产树、不复制 handler；原件 `tmp/r20-map-handler-before-preload.mjs`、`tmp/r20-map-session-before-countercheck.log`。最初 countercheck 缺旧 handler 所需 navigationEpoch，是夹具失败，已单独保留 `tmp/r20-map-session-before-harness-missing-epoch.log`，不算产品反例。补回正式 shared fixture 的原环境后才取得上述相关失败。
- 旧 native recovery 测试曾预期 timeout 后可无限 remount，与本次明确 native-unknown 上限冲突，首次58/59；已换成第一次可重建、后继失败/缺回调结束等待并保可见恢复、不继续扩张的行为断言，保 stale success 不擦 error。
- WEAPP typecheck **exit0**，日志 `tmp/r20-map-session-types.log`；workflow 当前运行消费者定向检查 **1/1**，日志 `tmp/r20-map-session-workflow.log`；限定 diff-check 通过。
- 最后给真实 Map JSX 的原用例补稳定 `.native-map` class 断言后，native recovery 文件 **5/5**，日志 `tmp/r20-map-session-stable-host.log`；未重写生产。11份生产/正式测试的冻结 SHA-256 清单归 `tmp/r20-map-session-source-hashes.json`，供 root 新独审绑定；本文之后不再修改这11份源码。

上述均为受控端口／源码模拟，实际 native composition、销毁、GPU／进程资源和手机可见恢复未验。后继 remount 不是资源回收，successful degradation 不替代完整能力。独立代码/输出审阅由 root 另行取得。

## 平台证据边界与清理

有界查询 [微信 createMapContext](https://developers.weixin.qq.com/miniprogram/dev/api/media/map/wx.createMapContext.html) 和 [Map](https://developers.weixin.qq.com/miniprogram/dev/component/map.html) 当前工具返回不可读，不能从失败查询推断接口不存在。[Taro Map 官方参考](https://nervjs.github.io/taro/docs/components/maps/map/) 可读，其 updated 指地图渲染更新，不能认证旧 native Map 销毁；本机4.2.1声明/现有接口亦无可直接用于本批的销毁回执。未为此新增包、引擎、私有 WeChat API 或平台清理脚本。

本批测试及 countercheck 进程均结束，无所建服务、设备 session 或远端写入。root 独占的 API/PG、手机、旧候选、N05、gen26 UNKNOWN、R6、gen34 和私有原件保持原 owner。本报告只记录本批源码路径和真实限制，不改唯一 PLAN/HANDOFF/INDEX，不宣布该完整模块或 Goal 通过。

## Root 整合与普通手机反馈

### Candidate identity

独审[终态](R20-MAP-FAULT-SESSION-REVIEW-20261024.md)无限定源码P1/P2后，root核11份冻结hash再完整编译当前正常WEAPP。输出 **339件／5,028,121B／`367a703aca2691d4cb97bb38ac17d33084ab1d977f62facc74cca29b7dadac0a`**，完整当前API origin已编入；fixture/acceptance/request diagnostics为0，无operator token/release id。webpack10项既有warning，exit0。相比E9总计增加2,421B，不作包体优化或正式2MiB准入声明。构建日志 `tmp/r20-map-session-normal-build-20261024.log`。

### Invocation result

同一feedback **EfkxhB generation2**，prepared project `generation-000002-97Hiyw/project`。沿既有真实owner refresh/auto_preview；仅新副本的private大包flag，正式预算仍未修。官方原结果success、进程exit0，诊断 `.official-process-3a1e83de-c42a-4367-911e-befc845ffd33.json`，无重复调用。root用原已授权USB身份hash校验后取得新鲜prebind画面并实看，再bind。当前session **`%TEMP%/starward-device-feedback-EfkxhB/starward-device-test-gEFXaw`**，旧zVWpAs输入资格已失效。

### Observed product behavior

root实际查看本次四份原始图：private prebind `map-session-prebind-20261024T070007916Z.png`（原USB一致）；当前session的 `screen-78f7bc2e-964c-4ffd-962d-58e50336b9f6.png`（Map）、`screen-aea9060d-70fb-4e4c-bd5a-c5730d2c2a3f.png`（My）、`screen-90b42f76-0bce-4fbe-b74a-e7a511764315.png`（返回Map）。每次输入前均capture/实看、单次使用：My tap0.1/0.127，地图返回tap0.15/0.07。Map底图/工具可见，无应用底栏；My仍“账户资料暂未取得”；返回后原底图浏览位置可见，同时有Context、年度夜光、地形数据不可用通知。没有点失败重试、账号/草稿/编辑器或构造fault。

### Verified

独审实际never-add/never-remove补充2/2与旧handler相关0/1失败保留；root完整workflow **177/177**，额外Map生命周期/native事件/viewport **3文件15/15**。最初root cwd的6通过+1个文件加载失败为`@/services`缺WEAPP tsconfig，原日志独立保留，workspace cwd修正后通过，未修改生产/断言。Context结构校验通过。上述不相加冒全仓或目标native路径验收。

### Unverified

phone bundle bytes/runtimeAppId仍未独立验证，普通反馈不是settled-candidate。手机这次未触发never-callback/fault，不能从普通底图和往返确认旧native节点销毁、pin退休、实际资源回落或完整反复故障。网络拓扑仍阻正常My/Picker/H4/三层与Sky。一次只读RunAs最终Windows取消，helper未启动，无管理员/ICS新回执、无网络变化；等待实际UAC可用条件，详见[网络准备](R20-NETWORK-TOPOLOGY-RECOVERY-20261024.md)。整个模块、正式预算、UI及完整Goal未完成。

### Invalidated

gen1/zVWpAs及更早截图不能给gen2输入授权。最后图07:01:46.125Z、SHA `e1a7b23be5f02a5dc530a06981494f63cc0b868e7d6f6420f157dc13fc5eaffe`，1080×2376；手机留在Map，下一输入必须再capture/实看。gen34及全部冻结代身份/停止边界不变。

### Cleanup

构建/官方进程均结束。gen1完整feedback先保全 **351件/8,316,201B** 且源/副本逐件hash一致，归private `root-usb-20261024/before-map-session-EfkxhB`及manifest；新gen2、官方诊断与截图保留。必要API8806/PG55441沿现有stop owner继续运行，未停止无关服务、移除未知IDE入口、改VPN/TUN、上传原件或重发R6。
