# Physical development feedback candidate preparation

Scope: production-optimized current-source WEAPP bytes for this task's `development_feedback` session. No device interaction, official upload, live `dist/weapp` replacement, source edit or Git operation belongs to this preparation.

The 36 files recorded in `SOURCE-SNAPSHOT.json` matched their recorded SHA-256 values before preparation. Prior type/affected behavior results remain applicable; this is not a new source revision or settled-candidate acceptance.

## Build conditions

- Use the existing plain isolated-check lane with slot `sky-map-phone-1018`. The requested initial combination of an isolated-check slot and frontend fixture mode is rejected by `config/index.ts`; no bypass is permitted or used. Root selected the existing plain lane instead.
- Frontend fixture mode is false. It does not block the ordinary public Map/Sky navigation, stars, targets or published deep-sky resources. It excludes `SAMPLE_DATA` photos and the optional trial optical HiPS path, so this candidate cannot establish fixture-photo or trial-HiPS performance equivalence with a fixture build.
- The task-owned backend is the existing `MEMORY_TEST` development service. This is public sample-data feedback, not login/private-data or production-provider acceptance.
- API and Sky resources must share the observed current physical WLAN HTTP origin. Never record the actual address in this report.

## Preparation boundary

Initial readback found the known API worker listening only on loopback. Root explicitly retained that service and authorized a separate isolated `MEMORY_TEST` instance on port 8791. The new worker binds only the observed physical WLAN address; host `/v2/capabilities` returned HTTP 200. Its runtime owner is exec session `63092`, listener PID `18780` at preparation; root must confirm identity again before cleanup. Logs are private in ignored `tmp/phone-api-private.log`. The original port 8787 service was not changed.

Taro generates `project.config.json` in its output with `miniprogramRoot: "./"`. The device-feedback snapshot owner instead requires a source project whose bundle is a separate child directory. Root authorized a fresh task-local wrapper: its top-level config is a byte-exact copy of the canonical config, and its `dist/weapp` is a byte-exact complete copy of this one isolated output. The existing `sourceBinding` owner validated this structure. Both canonical and generated configurations remain untouched; there was no mixing with another generation.

## Prepared result

- Source wrapper for the existing feedback owner: `.codex/work-items/sky-map-performance-2026-10-18/tmp/phone-source-project`.
- Original coherent output: `apps/wechat-miniapp/dist/weapp-check-sky-map-phone-1018`.
- Bundle SHA-256 (both output and wrapper copy): `09ef4708fe64ac7a408c9ac967498816d1ea4924350140158c9d5185325f2353`.
- 338 files; 4,940,212 bytes total. Main: 2,003,732 bytes, 93,420 bytes headroom. Content: 1,041,257; spot: 598,333; Sky: 1,296,890. No source maps.
- All 11 existing static package checks passed. The physical-bundle safety check passed, and the compiled pure Sky address owner verified API/resource roles and absence of preview credentials.
- All 36 `SOURCE-SNAPSHOT.json` source files still matched before and after copying. Existing type/behavior evidence is reused; no product source changed and no additional type run was claimed.
- The build is optimized with frontend fixture mode false, and both API and Sky resource origins are the same observed physical WLAN HTTP service. No endpoint is retained in this report.

The root agent can pass the absolute wrapper path to the existing feedback owner, then open only that owner's prepared private generation. Phone Wi-Fi/firewall connectivity, actual runtime binding, loading duration and visual behavior remain unverified. This build preparation cannot establish physical acceptance. Root owns the eventual feedback stop and the task-created API process cleanup; the original live watch output and existing API remain intact.


## 2026-10-28 当前接续：仅离线封口，网络与手机未验

本节记录首次plain候选edc731的历史准备；当前plain已由本文末节6bacbb53候选接替。旧候选原位保留，不重放本节build/feedback步骤；D2 f40范围和原网络/UAC事实继续复用。

以上36-source/MEMORY_TEST/旧端口与09ef候选仅保原历史范围；本节是Root在当前main dirty源码上的新准备，不复用旧运行资格。仍沿同一PLAN和原feedback owner，不产生第二计划、正式发布或新采集平台。

- 当前普通包 `2872967413fb69509888475d10dbe114a1abba18cde79c56e3b7dd97e5ce6a2e` 已完成事件阅读返回实际窄回归，源码与337文件/5,121,623B产物匹配；新隔离编译前后指纹完全相同，未覆盖当前ordinary、19或gen34。
- 新plain isolated slot为 `phone-current-20261028`，fixture、acceptance/device-request diagnostics、release ID、operator token和feedback ID均关闭；API与Sky资源设同一个经本机实际物理接口/唯一已授权TLS peer确认的LAN origin。当前尚无该origin的API/手机HTTP资格，地址只在受限task-private文件与所需编译产物中，不写本报告。
- 完整编译67.660s/exit0/10既有warning。新bundle SHA `edc731d6314f7bd03a4011d1cee40568f7849cdeae3243608fdfbdd284296d86`，337文件/5,121,667B；main2,068,354/content1,068,591/spot613,133/sky1,371,589，原预算通过。完整physical-bundle safety与编译后的纯Sky地址owner五项角色均通过，preview credential缺席。这些只建立编译/绑定证据。
- `E:/Dev/Starward-data/development/phone-current-20261028/source-project` 是原已采用wrapper模式：顶层canonical public config原字节复制，本次isolated output完整原字节复制到dist/weapp，无仓库源码/Storage/秘密复制。原 `createFeedbackRun/withFeedbackRun/createStableGeneration/saveFeedbackRun/assertGenerationCurrent` 纯准备新run，未调用start/preview/remote/上传。该新run的generation1与受保护的旧run/gen34不同。
- 实际run为 `E:/Dev/Starward-data/development/phone-current-20261028/starward-device-feedback-puvjLE`；唯一预备项目为其中 `generation-000001-251Fev/project`。feedback official仍为not_invoked、deviceSession为空；没有二维码、手机推送/绑定、已接收声明或正式分发。其私有配置仅bigPackageSizeSupport=true、compileHotReLoad=false、urlCheck=false（canonical public已urlCheck=false）；原canonical私有配置未改。
- 新候选三份（isolated/wrapper/prepared generation）逐文件指纹一致、ordinary字节保留、canonical config原字节一致及原绑定/budget/physical safety/compiled角色，均经fresh只读独审。私有parent ACL只保当前用户、SYSTEM与Administrators，不泄露实际地址或凭据。

当前本机API仍为原published入口、恢复任务库、只listen loopback，未恢复数据库/启worker。USB doctor仍offline；同一次显式wireless doctor为transportReady=true，不能据此冒shell、当前手机画面或API可达。独立主机FW核查包含TCP/Any协议、端口区间和相同Node二进制别名，发现12条潜在已有Allow；未修改它们。

为后续仅给这次手机提供API，Root已准备同一原runtime私有副本，仅MINIAPP_API_HOST改为当前物理WLAN IPv4，不绑定0.0.0.0、不增第二业务API、不用adb reverse。配套私有`enable-phone-api.ps1`默认只准备8787两规则；可选`-IncludeDiagnostics`才扩至8798原collector薄adapter，共四条，顺序Block8787→Block8798→Allow8787→Allow8798。仅本次WLAN/本机IPv4，Block其它IPv4（排除本机、手机及loopback），Allow确切Node/手机。当前同名规则一概拒绝自动采用，包括失败残留；先核原receipt和实际owner再处理。所有规则ActiveStore、Profile Any、接口/EdgeTraversal Block/地址/单端口/程序以及RemotePort Any/Service Any/InterfaceType Any必须回读；New前记录attempted，UNKNOWN/既存/部分失败保守记录mayHave。原规则、默认策略、VPN/TUN及其它接口不改。当前SHA `f212cfe2da4a7dc2301bcb3cd6ebe348fcd280222a0adb0931a762a5bdcf9086`，旧8787脚本原字节备份保留。fresh独审8项实际AST/offline mock通过（含较窄RemotePort/Service/InterfaceType及未知/既存反例）；Parser0，未执行FW脚本/UAC或真实规则。实际网络效果仍未验。

Root已实际发起gsudo执行上述脚本，owned terminal为74867；原句柄随后返回 `The operation was canceled by the user` 并回到普通PowerShell提示符。实际只读核验：无firewall-receipt、ActiveStore本任务规则0条、8787唯一listener仍7092/127。没有执行脚本、改FW或切换API。该owned空闲终端已正常exit0关闭，没有在途提权。当前不重复弹UAC，用户方便后才重新核当前接口/peer和系统授权；原loopback config保留恢复。新尝试若发生，仍须先收原句柄/回执并读实际规则，再沿同一published owner切换监听/检查主机及手机HTTP，不能凭Chat答复冒效果。

随后沿原AdbDevice唯一TLS目标与每命令身份重核，只读shell实际完成，详`SKY-D2-CAUSAL`末节；因此现在不再只有doctor的transport资格。没有手机输入/截图、预览、候选绑定、录制或LAN HTTP，当前shell可用也不能冒这些资格。原已知崩溃时间的精确历史查找匹配0，未补到原trace，不重复制造崩溃。

这份plain候选优先解决当前Map焦点/范围与图层原生返回、Sky截图/控件合成及普通返回这些已存在的目标边界；它不能取得被编译开关关闭的R17/r25/r26/acceptance计数。D2同最终目标历史对照、稳定工作集normal Play→Pause排空→普通退出的必要数据，仍沿原owner精确准备，仅补能改变决定的缺口，不重录四份Performance/三Heap或重建gen34/R27。完整P1–P6、全国/正式分发、内存/OOM与Goal均未完成。

### 当前D2解码观察副本与最小设备顺序

另有已完成完整编译/责任层独审的decode-only副本，细节归[D2-DECODE-PREPARATION](D2-DECODE-PREPARATION-20261028.md)。SHA f40d83754046f518e500cab505da7280432c7ca15ba168bed90a2ad9c5297e4a、337文件/5,145,062B、source maps在包外；原bundle、project副本及新feedback run字节一致。`phone-current-20261028/d2-feedback-run.json`指向`starward-device-feedback-JdLUnf/generation-000001-Kr3pqd/project`；这是新run的generation1，task buildGeneration35仅为诊断绑定，不是旧gen34。official未调用，私有设置和安全边界同上，无预览/QR/设备绑定。API/Sky/指标使用未来8798 origin；原collector薄HTTP adapter已完成fresh独审8/8及原8787的实际只读loopback转发。临时入口已关闭、没有真实指标写入；LAN8798及手机尚未建立资格，不能沿plain的8787准备直接启用。后续只能在实际网络准入后明确绑定物理IPv4，沿同一个已核API转发，不用默认通配监听或重启数据库。

后置设备阶段只按以下不同机制串联，先完成实际通路再交给用户最少动作，不立即要求操作：

1. **plain当前包**先解决Map选点中档/剩余地图居中与范围、原生图层/返回，以及Sky控件真实合成。当前截图/SDK不一致和投影无回读仍是未决，不重试同一桌面渠道冒手机证据。
2. **decode-only包**在实际非空夜空、必要图片/目录已加载且视野/模式/native尺寸稳定后，菜单“准备观察”，再由正常产品Play进入；实际Pause后沿原drain，再普通退出。诊断不自动启动/暂停产品，90秒只封采集，手动“结束观察/重试保存”也只操作诊断。核baseline、active、Pause/drain/retired/end各已确认包及源绑定；缺点保MISSING，不重放工作负载求回执。
3. **其余必需结果保留**：该账不含完整R17响应/Scene/stellar-upload/GPU人口，不能拿0 calls当星体/图片为空或物理回落。两个同目标历史响应窗口、主用Profiler、正常完整持续Play/内存/OOM、Sources独立语义及原P1–P6后续验收继续沿原PLAN；不整批重录已收到资料。未ready的云量/光害正式产品与真实微信业务仍不能由普通包或该诊断副本替代。

## 2026-10-28 最新普通候选：源码同步，网络与手机未验

Root在普通aed9c23f之后，把同一批云量第三Map消费者、EOG最终HTTPS地址及地址图标窄修收束为新的plain开发反馈候选。旧edc731早于该批源码，不能冒当前目标；本次是必要源码同步，没有重建gen34、D2 f40或已完成的诊断。非正式发布/settled acceptance，没有改产品源码、PLAN、AppID、API/DB、worker、FW/VPN或手机。

- 新私有owner：`E:/Dev/Starward-data/development/phone-map-current-20261028`，沿原受限父owner ACL，实际读回protected且权限相同。物理WLAN接口/IPv4仍与原配置匹配，实际地址只在该私有`build-input.private.json`及必要编译字节中；接口存在不代表手机或API可达。
- 原plain isolated slot `phone-map-current-20261028`，API/Sky共用本次已核本机LAN origin；fixture、acceptance/request diagnostics、feedback ID、operator token和release均关闭。新输出`apps/wechat-miniapp/dist/weapp-check-phone-map-current-20261028`从不存在的目录完整构建，没有改canonical普通dist。webpack47.710s、wrapper54.149s、exit0/10既有warning。
- 新包SHA **6bacbb5380eb62037ee1d7833032b6fe6e7cb524a649804980d28eb1f52f9bf1**，337文件/5,133,539B；main2,080,209/content1,068,591/spot613,150/sky1,371,589。原包体/21路由、physical bundle safety、compiled Sky地址与preview credential缺席均通过。
- 构建前后核miniapp的src/config/runtime-assets及三个实际共享源码目录、根/应用package、lock、tsconfig、public config和run-node入口指纹完全相同。`source-before.json`/`source-after.json`绑定这些输入；不是干净Git提交或远端CI证据。实际HEAD仍1fd25800，全部dirty保留。
- 原`sourceBinding/createFeedbackRun/withFeedbackRun/createStableGeneration/saveFeedbackRun/assertGenerationCurrent`完成wrapper与新generation1。run=`starward-device-feedback-F0RQ5W`，prepared project=`generation-000001-wMV5gp/project`；完整绝对入口由`candidate.json`及`feedback-run.json`持有。输出/wrapper/generation逐文件指纹一致，public config沿canonical原字节复制；private设置仍仅bigPackageSizeSupport、关闭热重载及urlCheck=false。
- `official.disposition=not_invoked`、deviceSession=null，没有QR、预览、上传、手机绑定或新IDE窗口。canonical仍运行普通aed9c23f；prepared项目尚未验证启动，不能以封口或安全检查冒页面成功。
- 构建前后普通aed9c23f、旧plain edc731、D2 f40三份完整包均逐文件保持；旧候选、r6/原件、gen34/N05/R6未动。原D2包继续用于其已准备的Sky解码/生命周期窄范围，未因不相关Map变化重建。

封口后一次只读wireless doctor于2026-10-28T11:01Z返回detected0/states空/transportReady=false；11:07Z沿同一官方ADB做一次TLS mDNS发现，连接和配对广播均0，没有可核的当前连接端点，未发connect、重配或重置daemon，原始发现/设备标识不保存。没有输入、截图、录制或提权。8787实际仍唯一PID17496/loopback，8798无监听。新候选`status=PREPARED_NETWORK_AND_STARTUP_UNVERIFIED`，网络、手机与首次启动均未验；沿原后置UAC/通路步骤恢复，先确认实际接口/唯一peer和规则后才能使用，不能凭本次准备或聊天回复跳过。

本轮operation、build.log、fingerprint、source/protected前后读回、candidate和transport-readiness均在新私有owner；实际build已终态成功、封口完成，不按PREPARED或BUILD_RUNNING历史意图重放。下一设备阶段沿上方同一最小顺序，以本节plain替代旧edc731，D2 f40不变；完整P1–P6/D0–D2、云量/光害正式资格/分发和OOM继续未完。

## 2026-10-28 手机恢复与直接推送

用户明确手机就绪并要求直接推送后，Root沿已保存候选恢复开发反馈，未重建源码或重放已完成数据准备。

- **Candidate identity**：development_feedback，HEAD1fd25800+保留dirty，plain SHA `6bacbb5380eb62037ee1d7833032b6fe6e7cb524a649804980d28eb1f52f9bf1`，337文件/5,133,539B。私有owner `E:/Dev/Starward-data/development/phone-map-current-20261028`；run `starward-device-feedback-F0RQ5W`，generation `generation-000001-wMV5gp/project`，device session `starward-device-test-RvYsRP`。原candidate.json的PREPARED是历史准备阶段，不冒当前投递状态；当前沿run/feedback.json与下述回执。
- **Invocation result**：官方状态已核Skill0.3.14/current、登录有效、CLI无需token。原canonical s1字节同步核验后关闭；只打开当前generation窗口s2。普通QR一次success后，用户明确改为直接推送；官方auto_preview一次返回success。目标手机实际Map画面确认后才沿原bind命令记录official_update_completed。私有 `official-auto-preview-result-20261028.json` 保存调用结果；`plain-auto-prebind-phone-20261028.png/json`和绑定session实际帧证明手机已运行。普通QR结果保历史，不再要求用户扫码。
- **Verified**：现有唯一授权TLS wireless ADB已实际截图/输入；未重复USB、重配或改变VPN/TUN。既有FW脚本SHA f212cfe2…f9086经gsudo exit0，含8787/8798的四条窄规则实际读回；旧loopback API精确退出，LAN launcher12536/listener18536及祖先链成立。runtime-lan.private.json只改HOST；主机ready200/true，手机curl同样200/true。权威私有网络证据归原phone-current owner的firewall-receipt、api-lan-resume-readback、phone-api-ready。数据库/有限606record根/媒体LOCAL_TEST边界不变，无迁移或提醒worker。
- **Observed product behavior**：目标Map、My入口和返回、选点中档、非空Sky与展开菜单已实看；时间减小时与显式取消已有目标反馈，具体观察归WEAPP-UI同日手机节。不能用本地缺天气提示或当前空计划列表判正式数据/N05丢失。
- **Invalidated**：12:12:55Z预览副本新增仅注释的25B `pages/my/index.wxss`，12:14后的首次capture被bundle守卫拒绝，未发设备动作。逐文件对照原337文件均未变；新增字节来源未知，保存到owner内`retained-extra-my-wxss-20261028.txt`后移出bundle，12:16:28Z恢复原hash并assertFresh通过。`bundle-extra-file-retained-20261028.json`持有全过程，不放宽守卫、不覆盖源代码、不重放预览。此前原绑定下的实际帧保留各自时刻范围。
- **Unverified**：true-debug/AppID远端确认、settled acceptance、精确Map投影/4km、D1持续拖动和三层像素、Sky完整Play/帧身份/内存/OOM与其余P1–P6均仍开放。D2 f40未投递，8798只有窄FW资格、尚无listener或collector数据。
- **Cleanup**：当前有用的generation/手机session/API/FW保留继续工作。旧普通、D2、gen34、N05、r6/R6和所有原件保留；未清手机数据。新只读Sky资源代理完成即停止。最终收尾须沿网络精确回执恢复、先归档必要证据再用原feedback owner清理，不能把本节当完整Goal完成。


## 2026-10-28 D0修复新包已直推并连通真机调试

当前候选/会话以HANDOFF为准；新包81bfb972…沿原完整编译→wrapper→feedback owner，全部旧包保持。auto_preview首次编译失败经唯一编译缓存修复后success；remote(auto)原超时未重复，后续实际Android页面/数据收发/正确AppID和页面已核，已绑定Cldr5o/ki5Lti。这里只是development_feedback，非正式分发或完整验收。

当前手机绑定：新普通包81bfb972已在唯一目标手机实际连接当前真机调试，session=`notice-reentry/starward-device-feedback-Cldr5o/starward-device-test-ki5Lti`。官方remote(auto)只调用一次；最初automator timeout后保原会话，随后手机Map实际显示、已连接/服务器正常、received97→199且待发0，官方currentPage=pages/map/index，systemInfo=Android14/N2401/SDK3.17.5；getAccountInfoSync窄比对AppID与prepared一致、develop，不输出ID。最初错误LAN尝试已由工具回退广域网，VPN/TUN未动；两个连接timeout只保原诊断。新包实际两条返回路径未重复报同故障，14.97s/14.96s录像均解码抽帧核对，点/面板/两层仍保；正常真实天气错误及重试控件仍见当前phone WXML。My入场另一个录像仅5.22s且未含完整转场，不拿其通过动画。6s录制在输入前结束、一次旧capture超时均拒绝发送，属于采集边界。主用Performance/Memory尚未新录制；不要将工具可用或短回归当完整性能/产品完成。权威receipt为该private root的readback.json，任务证据见WEAPP-UI末节。
