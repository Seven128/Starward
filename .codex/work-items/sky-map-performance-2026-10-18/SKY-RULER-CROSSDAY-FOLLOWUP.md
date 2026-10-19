# Sky 跨日刻度与原生安装边界

本轮仍沿 PLAN 与既有时间事务/原生布局 owner。A1 r3（a2839caa...）已通过本次明确授权的一次独立官方预览，实际手机独有标签核对后绑定 Ol0LKl 自身generation1；候选buildGeneration27不是该反馈run的序号。gen26原结果仍UNKNOWN且状态文件逐字未变。r3保持不可变，不把本次源码修复反认成其运行结果。

## 实际失败

原1080×2376手机图独立量测：初始19日04:30 axis中心x540，所选tick中心539.5；18日04:30的两张稳态图axis仍540、tick约503，左偏约37px。两张后态尺区逐像素相同，02:00/08:00标签与30分钟刻度关系排除了文字左对齐错觉。随后18→17，再显式取消：日期/字段/天空回19日04:30，时间尺仍错误显示12–16点。

四段原始录像另有独立静态审阅：首次入场先出现08/10错误窗口，随后才恢复；18→17过程中尺区出现空白与多个跳动窗口；取消录像最后实际编码帧已恢复日期、移除预览提示，但尺区仍16–22，事后截图再停12–16。故r3判FAILED_RULER_COHERENCE，不能用首张对齐图覆盖异步失败。采样图不证明物理FPS、精确180ms或真实transition事件。

归档由现有外部验证owner下`normal-existing-resume-20261019/a1-r3-initial-ruler-motion-archive-20261019`保存：26文件/8,881,884B，原件和copy最终SHA读回26/26。manifest SHA87728c8685083b89de848f8d39ce9dfe72ee7ad1ac32d8cbc8098fda2ab4c4f4；校正采样manifest 4ae8546e0aa3694c05622ce0e7cf7325636f33bc86c416be12f82c6ea7b8115b；review JSON00749698e94bf8571ae96be114c9a16d3b402f6e169db2baf9ac34b3fb546dbb。初版tail重置PTS的四张派生图明确作废，原录像未改；校正样本保原PTS。

## 已修责任与解释范围

真实页面在geometry尚未覆盖新时刻时仍持旧rows，activeIndex可为-1或末行。尺原先clamp后先定位旧窗口首末；取消缺committed tick也先发零位置，新rows到达又发送新目标，解释了竞争定位的一条可证明输入链。React passive effect与Taro pendingUpdate/native行安装并非同步；离线同步native.move不能替代这个实际边界。

当前修复让selectionReady由页面既有timeGeometryReady供应；未覆盖意图时不向旧rows派发首末定位，缺committed tick的取消只交原页面恢复。窗口替换保留上次有效实测projection；仅新row keys尚未安装时等待原Taro.nextTick再发当前代最后目标，同一已安装窗口的短拖/步进和完成布局读取后的定位保持直接。手势接管、closing/layout gate、resize、隐藏及卸载退休迟到命令，不增加猜测timer、逐帧查询或第二时间writer。原Taro.nextTick可能有100ms轮询策略，不把其elapsed当native耗时。

桌面公开SDK只读范围：现有r3的currentPage/text可用；一次异步selector query未返回geometry，分离同步启动/读回也未发布结果，最后已删除任务暂存key。未读到native node/scrollOffset不是node不存在，桌面结果不外推手机。修复的原生效果仍须新完整候选实测。

## 软件检查与独审

实现方运行相关44/44；强化“已安装rows短拖零新增nextTick”后定向11/11，strict noEmit与diff检查通过。三项新增回归对修前组件均失败。独立审查核对真实页面consumer和native owner，没有未修P1/P2；另外只在内存将三个新增回归的同步move替身换成真实createRulerScrollPosition，并延迟node回调到行安装后，3/3通过。独审未修改源码、重建、提交或操作现场。

独审绑定normalized-LF SHA256：spot-sky-page.tsx为ae363c7f3dfbf9cb12018fbf6b4f4fee2358a9cfbdc05b901be8ecc6a6573117；orientation-ruler-layout.ts为1c33a912417547e6851b4046ec72418ce66d0b5dd09689bed567d83ad6b7fce0。这些是离线调度与源码证据，未认证Taro实际setData/ScrollView合成、修后入场、跨日、取消、A/B或完整Goal。

由同一normal builder准备并交付review-r4，不重建r3。用户随后统一授权完整Goal内候选预览和必要调试，不再逐次确认；gen26原UNKNOWN保留，同一在途操作不重发。r4实际普通预览成功，独审见[R17-A1-R4-RULER-RESULT](R17-A1-R4-RULER-RESULT.md)：两次跨日和取消在已采样范围改善，首次入场仍有下午错窗与多次刻线往返，判FAILED_NATIVE_ENTRY_COHERENCE。

后续仓库局部修复将首次layoutReady=false时的声明式ScrollView定位动画关闭，完成真实入场后保留采用动效。相关42/42、window12/12和workspace TypeScript5.9.3 strict通过；新回归恢复旧prop后失败。该修复只移除一条明确竞争路径，尚未构建或证明手机效果。晚到声明式目标、测量rect/offset组合与旧代native命令仍需一次有界关联观察，不把nextTick或scrollTo返回当实际呈现。

## 一次入场关联观察的软件边界

同一normal builder有限r5在wide-time开始后立即记录最多128条标量事件，沿原15秒/32KiB导出，不在Play/B启用；旧v3/A1模板与r4冻结包不变。它记录props、row/surface代次、真实finish、原同批rect/offset、position/native命令及guard前scroll，另一次公开offset查询仅为“此时已观察到”的值。同批query不等于同物理帧，nextTick/scrollTo同步返回不等于native安装或可见完成。无新产品writer、轮询或逐帧payload。

独审发现P2：旧测量/native callback可能被错盖新采集window。已将原window沿测量、projection、position与native链传递；仅拒收过期诊断，原产品callback/scrollTo继续执行。12项诊断检查、11项旧v3/collector兼容及4个独立跨窗反例通过，独审未留P1/P2；root重算8份原始文件hash与独审一致。当前生产全量2653 pass/1环境skip、strict0见CURRENT-DELIVERY-VERIFICATION。真实手机录像与非空ring仍须同候选观察，不凭软件证明已判明漂移原因。

旧r4 builder按本轮明确patch逆向恢复并以原SHA a9acfb1a...严格认证；与r4准备MD/JSON、manifest/maps binding共5文件/552905B逐字归档，archive-bindings SHA ffee80c8f65dc69326739b9841d8c62d9fb5ca7711d295e9b41a067377f1f390。r4实际source/bundle/maps未改。当前builder/trace确切hash由新完整候选的manifest与template bindings拥有。

## r5 后的定位 owner 修复（仅源码与软件证据）

r5 的实际结果归 [R17-A1-R5-ENTRY-RESULT](R17-A1-R5-ENTRY-RESULT.md)。同次 42 个事件始终只有一组 rows、active/committed=33；名义初值 574.464，实际读得 step=17、zero≈0.5，随后同一目标 561.49997 同时经过 animated declarative prop 和非动画 native scrollTo。旧下午错窗未再出现，但真实 04:30 长刻线仍从轴左侧到右侧，编码末帧 x577、最终 PNG 才 x540。录像 PTS 与 ring Date.now 没有校准锚点，不能将某帧排列到 ring 的 813ms 读回前后，也不能声称 native 返回后仍漂移。该范围足以修复竞争写入与首次可见的名义投影，不重采相同 trace。

已核本机 Taro 4.2.1 和腾讯 miniprogram-api-typings：`NodesRef.node()` 的 enhanced ScrollViewContext 支持 `scrollTo({left, animated})`。腾讯当前[官方类型](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.api.d.ts)同样保留 animated；duration/velocity 的 WebView 支持仅限 iOS（新 Skyline 的扩展不适用于本目标）。因此没有用 duration 替换一个实际受支持的 animated:false，也不从自定义 TS interface 证明平台能力。官方文档站本轮读取失败，官方类型与本机精确依赖为这项有限 API 结论的来源；不从类型推定实际合成时序。

当前源码移除 Sky 的 `scrollLeft`/`scrollWithAnimation` 定位 props，程序定位统一归原 `createRulerScrollPosition`。同一已安装窗口仍即时发送原生命令，保留原生滚动、惯性、手势/取消事务和普通 native animation；新窗口/入口在隐藏刻度时非动画定位。native owner 只创建一次。它以真实 `scrollOffset` 读回确认入口，原生方法返回与 nextTick 均不是完成凭据；首个有效但未达目标的 offset 保持 pending。排队 scroll 事件只触发当前代 readback，不直接认证新窗口。缺 node/offset 有一次 next-layout 有界重试，无轮询；失败/尚未匹配时显示可重试尺状态，保留六字段。pending geometry 或空 rows 也不把六字段藏在准备阶段。

时间披露复用 `useSkyOverlayMotion` 的可选 prepared 准入：先透明且 unscaled 读取当前 native 几何，之后仍按采用稿的 `.76 → 1`、中心 scale 与 fade 揭示。opening 隐藏起姿不做额外过渡，避免先从 scale1 偷偷收缩再反向。其它披露默认 prepared=true；正在关闭的保留节点重开仍走原 live reversal，不重建或重新排队入场。页面隐藏/卸载退休入场回执；后续 resize、供给窗口、目标变化及关闭沿原 owner 失效。已测投影在纯 CSS scale 期间保留，测量本身仍只在透明 unscaled 准备或实际 surface endpoint 准入。只有当前实际 offset 使所选刻线中心落在实测 axis 宽度内才显示刻度；这个判据来自指示器几何，不是猜测的偏移补偿。入场中改变选择也不能短暂重用旧 tick。

已复读采用 HTML `5385664345158066168` 的受影响时间字段、取消/应用和最终 motion 覆盖，SHA256 仍为 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`；未修改采用资源、几何或时间权威。相关 49/49 检查包含真实 native-position owner 的延迟 node/offset 回调、旧 offset、缺值重试、目标/手势/closing/hide/unmount 退休、原窗直接 snap、reduced motion、原六字段与取消事务。两个入口回归换用 r5 冻结 component/native/layout/motion 后均按行为断言失败；诊断 runtime 同样来自冻结副本，未以缺符号的 harness 失败充当回归。最终检查日志及精确 source/hash 在 `tmp/r5-before-countercheck/`。独审、完整候选与真实隐藏节点/原生入场、跨日、取消及动态手感尚未由这些软件检查完成；不触碰 r5 原始 bundle/maps/手机会话，也不关闭 A/B 或完整 Goal。
