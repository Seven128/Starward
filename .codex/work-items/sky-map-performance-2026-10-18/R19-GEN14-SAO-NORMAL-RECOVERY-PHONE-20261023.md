# R19 gen14 普通 Sky 数据恢复观察

## Candidate identity

- 2026-10-23，`development_feedback`，普通官方预览 gen14；复用 Root 已核推送和绑定，没有新预览、构建或 R27 诊断覆盖。
- 本地 prepared 为 `generation-000014-hKkGNE/project`，bundle `0f76b93f5b8164baab27e34e2e34d61a0c390849601adfb586a2e2ad570cc1ee`，345 件、5,021,505 B。复用当前 USB session `starward-device-test-3agABg`，手机完整字节与 runtime AppID 仍未读回。
- 本轮复用当前任务 API 和已核 SAO 供给。此前 API/index/唯一瓦片通过只证明供给，不能回填历史手机失败或本次客户端加载量。

## Invocation result

- Root 将手机 capture/input 独占权交给本代理；执行前读当前工程规则、开发/性能方法、设备与官方 automator Skill、当前 SAO 供给报告及 Map→Sky 清理/保存、正常返回、暗星失败/重试的现生产 owner。
- 全部通过既有公共 `device-test.mjs` 和 `capture-owned-review-frame.mjs`，每次实际查看独立 1080×2376 原图的 450px 等比 review 后，在 60 秒内单次消费输入资格。没有原始 ADB 输入、守卫修改或私有调试接口。
- 共 4 次正常 tap，均 exit0：原可见 TEST 正式点 marker → 中档面板“云观星” → Sky 菜单 → 菜单“返回”。没有系统 Back、文字、swipe 或 recording。
- 共 8 次 capture。私有 phase anchors 保留各输入前后 host wall-clock 毫秒界限；观察图覆盖 UTC `00:21:26.509Z` 至 `00:23:24.652Z`。这些是命令/采样时段，不是实际点击至呈现耗时。
- 暗星重试次数为 0：本次正常稳定状态没有出现需要执行该恢复的可见失败，未为复现而改变条件。

## Observed product behavior

- 首帧是地点面板关闭、LayerSheet 关闭的 Map，原 TEST 星形 marker 仍在。点击后中档面板先出现真实读取状态；其后一次必要稳定 capture 已显示原 TEST 名称、海拔 40m、距离正文与可用“云观星”动作。首个读取帧的空气质量/近期天气资料异常通知保留为本轮真实可见降级，未点击重试或由此改变观测条件。
- 点击“云观星”后 `091737cf-ba2d-4d14-bc7c-fbce799fa8c6` 为“正在加载此地的星空…”状态。唯一必要稳定帧 `7d7b96a9-96b4-48d1-bb33-12a262d0eada`（UTC `00:22:27.847Z`）已有非空星图、仙王座插画/连线与 Alderamin 标签，没有可见“暗星未加载”提示。
- 随后为正常返回打开菜单；`37215efc-ea72-40db-90af-657d6fa6f476` 中星图和正常菜单均可见，仍未见该失败提示。未打开叠加面板寻找失败、未点击暗星重试，也未改变日期、六字段、Play、FOV、方向或其它绘制设置。
- 点击现菜单 door/“返回”后，`8269e534-fcc5-46cf-b855-e18f1675e569` 为黑场过渡。没有追加输入；一次必要稳定 capture `3230eb34-e965-472d-bce8-ddb71033e891`（UTC `00:23:24.652Z`）已回原正式点中档面板，原身份/40m/距离正文及底部动作可见，Map 地标、相机和暖色栅格外观与进入前稳定图一致。

## Verified

- 同一普通 gen14 的原正式点正常进入 Sky，经历可见加载后获得非空原星图；本轮两个已查看 Sky 稳定/菜单样本没有可见暗星失败提示。
- 正常菜单返回真正回到原 TEST Map medium 和可见地图/栅格画面；没有把黑场过渡采样判成最终失败，没有为其再次点击返回。
- 没有搜索别点、改日期/FOV/方向、打开六字段/Play/Picker/My/Source/vConsole，也没有操作账号、草稿 N05、已发送 R6、服务、构建、缓存或存储。
- Root随后实际查看`7d7b96a9`星图和`3230eb34`最终Map：非空仙王座图与无失败提示、原TEST medium及栅格均符合上述有限观察。Root仅对原bridge health做本轮前后两次只读快照，实际窗口保留SAO index一次200/18ms及5个asset 200/4–22ms；这是前台正常取源的HTTP边界，未输出私有目标或用HTTP计数冒accepted/loaded数。该32行ring有界，未被保存的更早请求保持未知；HTTP耗时不当点击至像素时长。原件归私有`gen14-overlay-http-20261023`的具名前后快照/差分，没有重复请求这些index/tiles。

## Unverified

- **未认证 SAO 已加载或完整负载。** 肉眼星点数量、非空 BSC/星座图和无可见警告均不提供 wanted IDs/字节、实际 accepted SAO 数、客户端文件读取或最后绘制的证据。由 Root 将本轮 host bracket 关联既有桥接 ring；没有请求关联以前不编造 HTTP/loaded 数。
- 历史 gen13“暗星未加载”的原因仍未定位；本次没有该失败，因此没有测试其正常“重试暗星”恢复效果，也没有通过清缓存/改条件复现。
- 本次静态样本不认证连续转场耗时、物理帧率、六字段流畅度、内存、长时稳定、全部图层原生安装/退休或最终 UI/产品验收。Map 可见栅格恢复不等于分别读取了原生安装状态或全部覆盖。

## Invalidated

- 先前代理/历史截图均不授权本次输入；本次每次资格已由公共 owner 单次消费。没有候选、session、前台或尺寸漂移与输入拒绝。
- 初次地点/Sky 读取态及返回黑场均只是各自时刻的实际样本，不可升级为稳定终态；后续具名稳定图只支持上述有限结果。

## Cleanup

- 8 组必要原始截图、公共 receipt、等比 review 及派生 receipt 共 32 件、11,870,442 B，逐件复制并核对大小/SHA 后保存在私有 `r19-ui-20261022/gen14-sao-normal-recovery-20261023`；manifest SHA-256 为 `d4b76d484459419d6d34f038a9047a2201b0cef06a8bb0d23334349a675ba78d`。另保留 8 个调用结果和 phase anchors。原 session/原件未删除。
- 未启动浏览器、录制、SDK、IDE 或服务资源，未提交/上传。UTC `00:23:24.652Z` 最终帧实际查看后已 `INPUT_ENDED`，停止全部手机 capture/input，归还 Root；当前手机为上述 Map medium。反馈运行和 generation 由 Root 继续复用，不在子任务内 stop。
