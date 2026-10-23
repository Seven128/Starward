## Candidate identity

本次仅为 `development_feedback`，沿用普通官方预览 gen14（generation-000014-hKkGNE），未重建、预览、刷新、重绑或修改源码。完整本机包指纹为 `0f76b93f5b8164baab27e34e2e34d61a0c390849601adfb586a2e2ad570cc1ee`，345 件 / 5,021,505 B；同一已绑定 USB session。运行时 AppID、手机完整包字节仍未验证。本机新 17 项 terrain publication/API 条件归当前 HANDOFF，不据此宣称手机端资源身份或延迟收益。

## Invocation result

从新鲜实看 Map 起，依次通过公共 `device-test.mjs` 打开层叠、开启地形、选择光污染、系统 Back 关闭 LayerSheet；每步都用现有 `capture-owned-review-frame.mjs` 采集并实际查看，才执行下一步。没有误点补偿、fallback 或重复手势。地形开启后界面显示当前视窗有效地形 100%，选择 LIGHT 后显示其选中态和年度估算说明。

随后仅一次 `record-swipe`：归一化 `(0.75, 0.355) → (0.08, 0.355)`，`ms=1800`，`seconds=6`。源图 1080×2376，公共 owner 的 `round(normalized × (dimension − 1))` 换算实际输入为 `(809, 843) → (86, 843)`；450×990 等比查看图的取点为 `(337.5, 351.45) → (36, 351.45)`，不是使用缩小图像素直接输入。前图实际查看后选择的起点位于工具列左边空白原生地图区域，避开右侧彗星按钮、其他工具、底部 credit 与 vConsole。公共 60 秒、单次消费、USB 身份、前台与尺寸守卫均保留，未发生守卫拒绝。

## Observed product behavior

末图已实际查看：相对手势前，地图地标发生明显向左位移，原本位于中上部的地图内容移向左边，新的东侧地标进入画面；固定工具列和底部 credit 保持其界面位置。说明本次改变起点后，真实地图位移确实发生。没有把单独的 `actionSent` 当作位移证据。

最后实际状态为 Map 前台、LayerSheet 关闭、地点面板关闭；地形与光污染栅格保持开启，CLOUD 未选中。没有进入 Sky/My/Source/Picker、操作日期/Context/定位/账号/N05/R6 或触碰 vConsole。

## Verified

本轮唯一问题已取得可判别的终点结果：从明确空白地图起点发送的一次左移能够产生真实地图位移。恢复地形与光污染组合的正常 UI 路径以及关闭 LayerSheet 后无地点面板状态，也由本次实际帧建立。

必要 23 件截图、元数据、等比查看图与视频原件已逐件复制到既有私有证据体系的 `gen14-clear-map-pan-20261023` owner，合计 13,536,526 B，逐件 SHA-256 读回一致；原件保留。私有清单 SHA-256 为 `f9df5dce7face1dcbc4bfd9a20814bf94f44229094e09795291376f5fbb217df`。唯一 MP4 为 1,999,870 B，SHA-256 `858083b10c784795d217a37482b7387bf244101a86f6e755acfef371c0e8460f`；具体请求参数与公共换算结果另有同 owner 小回执。

## Unverified

Root随后用现有本地helper实际解码并查看0、3.0、3.6、5.5秒及私有末图原件：实际片长7.183989秒/1080×2376，地标逐帧向左移动、已观察帧仍有地形/夜光覆盖，末图Map无地点面板且两栅格仍开。派生归私有`gen14-clear-map-pan-video-review`，helper浏览器/server均已关闭；第一次误读不存在的末图450派生只在磁盘读图阶段失败，后按实际文件清单查看原图，没有追加手机采集。请求6秒不代替实际覆盖，稀疏seek帧不建立物理输入时间、每帧无留白、精确回访身份、同条件延迟收益、FPS、持续拖动性能、内存/GPU回收、全层完整性或最终设备验收。本轮没有watcher、额外压力或第二次pan。

Root对已有bridge的两次只读health快照作有界差分，新增10条公开产品边界（含正常Context解析、Scene与夜光metadata），均成功；没有新增terrain metadata/asset或夜光asset请求。原件归私有`gen14-overlay-http-20261023`。这与已覆盖/缓存路径相容，不能证明本次下载新17项publication或新的跨覆盖细图，也不能拿这些HTTP耗时当手机可见等待；没有为遥测重启服务或改缓存。

旧第二次反向 pan 的近工具起点不能依本次结果直接确定根因；其具体边界结论继续归独立的 `OVERLAY-GEN14-REVERSE-PAN-BOUNDARY-REVIEW-20261023.md`。本次结论只补足改变起点后的有效实际输入。

## Invalidated

每次公共输入均消费当时新鲜实看截图的输入授权。旧批截图不曾用于本轮输入，前后图不冒充连续帧时序。没有失效候选、场景切换或意外前台变化；仍保持 `development_feedback`，不升级为 settled-candidate acceptance。

## Cleanup

单次录屏公共命令已终止并返回原片，公共 owner 处理其私有设备临时录制资源。未删除 session、项目、冻结构建、私有原件或用户手机数据，未打开任何浏览器/IDE 窗口或启动服务。末图实看后已向 Root 发出 `INPUT_ENDED`，归还全部手机 capture/input 所有权；本代理不再采集或输入，完成后供立即关闭。
