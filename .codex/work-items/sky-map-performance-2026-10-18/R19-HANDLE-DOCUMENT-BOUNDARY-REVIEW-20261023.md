# R19 手柄与正文原生移动边界独立审查

结论：本次两个 `catchMove` 属性没有发现新增 P1/P2。源码和实际 prepared 编译消费一致；同一正式点、DAY、medium→large 手柄路径的旧图库/标题裁剪，在普通 gen16 的已观察样本中不再出现，普通正文滚动及逐级 Back 仍工作。此结论只关闭该已复现症状的限定对照，不认证全部原生因果、完整拖动动效、当前整页视觉或 R19/Goal 完成。

## Candidate identity

这是 `development_feedback`，普通 gen16：`generation-000016-uA7Kzy/project`，真实 `miniprogramRoot` 为 `dist/weapp`。本代理独立重新计算全部 prepared 文件并与 `normal-manifest.private.json` 深比较，结果相同：bundle `51c72f197afab132827019bc07ae36ddb556466b0a7c4c888d3581115899dae3`，345 件、5,023,816 B。session 为 `starward-device-test-B6W0lu`。runtime AppID、手机完整包字节未认证。

当前分支 `codex/remote-main-20260908`，HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`。本代理重新读回 PLAN SHA `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`、冻结 gen32 manifest SHA `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`，未修改二者。旧 gen15 bundle `63893429…` 是改前对照，不能倒绑新修复。

## Invocation result

本代理没有操作手机、IDE、服务、构建、feedback 或 session。Root 独占完成原 Stable 普通自动推送、实看后绑定及公共 USB 输入；自动推送成功不单独建立手机效果。本审查读取其实际原图、私有元数据和解码帧，未重放动作。输入时长 700ms/650ms 是调用请求值，不能换算实际用户响应时间。

已读 Root 保存的 `gen16-phone/completed-inputs.private.json`，本代理重新计算 SHA `1e34afd6d20a8e41fd3b6950829f314ae59c37d74fe6c7ac0cb290fa6f9e6b00`。它明确是已有 5 次 Root 公共调用的转录，不是新设备回执或原生遥测；第一项记录从 fresh `493c6847` 单次 record-swipe 到 `280d86f2`、中间无其它输入，随后才是正文滚动和三次 Back。该转录与实际前后图及视频相符，不把转录升级为瞬态触摸归属证明。

已读[修复记录](R19-HANDLE-DOCUMENT-BOUNDARY-REPAIR-20261023.md)、[改前归因审阅](R19-GEN15-LARGE-HEADER-BOUNDARY-AUDIT-20261023.md)、PLAN R19、当前 UI/设备 Skill、global、DESIGN §5A.3、Map/共享 Screen Context，以及当前采用增量的 ADOPTION 与相关手势源。参考仍为同一个已采用增量 `3995519477980461148`，未改区域依赖完整源 `5205988829884632961`，没有重新选稿或生成页面。

Root 随后从当前官方完整源只读恢复必要参考。本代理重新计算 54,468,849 B 的 `full-source.zip` SHA `0189d1ab761078178f079fb0f5909dcc896be40dc145758b228cd22ed844c3e6`，与已核采用原包一致；读取 `map/ADOPTED.md` 的当前范围、舒适尺度 README 及 real-scenarios README，实际查看 `shared/comfortable-scale-2026-09-22/review/large.png`（SHA `26a845196f6258e231a6f544330ba1d7c13249678e05f040b0f1d163c17ea4a2`）与 `stitch-input/candidate-large.png`。准确临时根为 `starward-r19-header-full-reference-20261023-1140/docs/design-resources/wechat-miniapp`。

这两张是包内保留的尺度/静态参考，名称在顶栏下正常可读；仍含旧底栏，原始 candidate 还含已退役道路时间，**不能当当前完整页面基准**。当前入口明确指向 real-scenarios 和完整 preview，10-22 增量另覆盖去底栏、导航/来源与紧凑信息。本次只复用未改的标题/手柄可读和单文档几何责任，以实际 gen15 可恢复顶部及 gen16 结果核症状；没有因旧静态图恢复废弃内容或声称全页像素相符。不需要为两个原生属性重新渲染全部场景。

## Observed product behavior

已实际查看以下 1080×2376 原图；改前取自 `header-handle-boundary-repair-20261023/gen15-before/starward-device-test-IrTg0l`，改后取当前 B6W0lu session：

| 帧/阶段 | 实际观察 |
| --- | --- |
| gen15 `f8f062bd`，medium | 名称、地址、真实手柄完整，地图/固定三动作可见。 |
| gen15 `cdc93d4b`，相同手柄上拖后 | 已为 large；图库、手柄和名称离开上端，地址/正文及固定三动作仍可见。 |
| gen15 `d8ce47d6`，普通正文下滑后 | 图库首图与相邻图、`1/3`、手柄和完整名称恢复到原生顶栏下；证明此前为可恢复正文裁剪，不是没有可用顶部。 |
| gen16 `493c6847`（UTC03:32:00.126），medium | 同一地点/周围地标，名称与真实手柄完整。 |
| gen16 `280d86f2`（03:32:23.193），手柄展开后 | 完整图库上端、`1/3`、真实手柄、名称和地址位于原生顶栏下；large/三动作保持，没有改前的裁剪终态。 |
| gen16 `791a089d`→`10420e43`，普通正文上滑 | 从完整图库/身份区滚到开放时间、设施、资料/攻略及近期天气；large 和三动作保持，说明本次没有把整个正文锁死。 |
| gen16 `b993c90c`→`1a641950`→`5b103cb0`，逐级 Back | 依次 medium、small、hidden；前两档保留开放时间一带的阅读位置，最后完整 Map 与同一地标/地形和年度夜光恢复。 |

本代理实看了 `gen16-phone/expand-frame-contact.png` 的全部 12 个按序采样，并单独查看实际解码 `2.5s/3.0s/5.0s` 原帧。2.5s 仍在较小视口，3.0s 已出现图库且名称/手柄完整，5.0s 终态与 `280d86f2` 一致。`frames.json` 的实际视频元数据为 **5.9529 秒、1080×2376**，不能称“实录恰好6秒”，稀疏采样也不能排除采样间的短暂异常或认证 FPS/≤280ms 释放轨迹。

原图身份独立读回：`cdc93d4b` SHA `aa527a50c75d060bd7ce1647846683e663fcc9fa6299ab7c5ae3b0bc4db0a4ee`；`d8ce47d6` SHA `b02589db093b63206118b0d26c94adff18ab982e868e122897dd506564d07f95`；`280d86f2` SHA `0b31625455e36fae94a10e2e16ca556446eb086ad0f4855332325c11314b0f72`。截图里的 vConsole 仍会遮住局部正文，不据这些遮挡区域认证完整可读性。

## Verified

- 对 `spot-panel.tsx:444`、`pending-proposal-panel.tsx:56` 分别只移除新增 `catchMove`，结果与私有 `source-before` 原件完整文本逐字一致，每份源恰有一个新增属性。当前 SHA 分别为 `67ab85d2be66561ee7f9d0804cd2e51a92f2a29705f6786eda1fcb8909dbe254` / `74c6a8f64a2232ad91d16ed5c3d6face664d318a9ff7887fe3896b1816dc34ee`。既有样式、业务回调、scrollY、正文位置恢复、媒体/弹簧时序均没有被本次补丁改写；没有新包装节点或状态 owner。
- 两个 handle band 仍在各自唯一正文 ScrollView 中、合法图库之后、地点 identity 之前；新增属性只作用该既有区域。既有 Button 的 start/move/end/cancel 仍向 Map owner 传递，Map 的 `panelDocumentScrollEnabled = panelExtent !== "small" && !panelDragging` 保持。原 Context 关于 **catchMove 不能单独证明手柄与 ScrollView 竞争已解决** 的限制继续成立；本修复没有用它替代现有占有/释放规则。
- 已直接读取本次 prepared 的 `pages/map/index.js`：两个真实消费者均有 `catchMove:!0`，原回调仍在；`base.wxml` 有原生 `catchtouchmove`，`taro.js` 保留对应属性/事件分支。这确认实际编译消费，不能替代本机原生触摸归属读数。选择该能力有 [Taro 官方 React 说明](https://docs.taro.zone/docs/react-overall)支持：逻辑层阻止冒泡不足以阻止原生滚动穿透，View 的该属性提供原生移动事件边界。官方能力说明不是本设备根因结论。
- 本代理只读核对已有 `related-tests-workspace.log` 的 **26/26**、typecheck 日志及普通 build 日志（28.867 秒、10 warnings），没有另跑测试/构建。首轮仓库 cwd 的 alias 解析失败保留为 Harness 启动失败；正确 workspace cwd 后通过，没有据此伪造先前成功。
- DESIGN 的真实可见 header band、正文可滚动、Back 保留 meaningful scroll 与固定三动作责任仍适用。当前 web 手势样例在切档时清 `doc.scrollTop`，不覆盖 DESIGN/Map Context 明确保留阅读位的产品要求；不应据样例把正文强制清零。Back 后处于用户主动阅读段，与 fresh 展开本身把正文推走是不同条件。

## Unverified

尚未独立区分原生触摸竞争、媒体展开布局保持或其它 native offset 因果，也没有数值 scrollTop、瞬态精确位置、实际触摸单一消费或全连续时序证据。只能说补上该原生边界后，已可靠复现的正式点展开症状在本样本中消失，不能说已证明所有 crop 都由同一根因产生。

提案/草稿的当前 native 手势、自然 touchcancel、多指、途中重抓/反向、无图/其它主题设备等没有由这组样本验证；本轮未为覆盖它们触发 N05、账户或私有提案。原检查和源码一致不能冒充这些真机结果。当前样本也不证明所有来源返回、章节定位、生命周期、性能与内存义务，整体 UI/Goal 仍未完成。不需要为这两个属性继续派生清 offset、改变 settling 或媒体时序等相邻候选。

## Invalidated

旧 gen15 截图、session 输入资格及旧包不能支持 gen16 效果；保存的改前原件继续有效地承担症状对照。旧 `starward-design-20261022/implementation-input-20261022` 临时设计路径已经退役，不用失效路径或历史静态图认证当前整页设计；现已恢复并核对的是同一采用原包的必要参考，未重新选择资源。新旧原件均由 Root 保全；本代理未清理源包或封存数据。

## Cleanup

本代理唯一写入本报告；未改源码、设计资源、PLAN/HANDOFF/INDEX、Context、冻结构建、feedback 或任何私有原件，没有启动需清理的进程。只读发现曾猜错组件目录/日志名、访问退役临时路径、使用不适用的 Windows 路径 glob，以及较长输出截断；随后按实际枚举和小范围读取处理。官方文档首次直读超时，之后沿官方站点索引取得相关说明，没有修改网络/VPN。这些均不计产品失败或通过。手机控制及后续所有动作仍归 Root。
