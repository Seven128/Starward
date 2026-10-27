# 微信定位候选与未应用时离开

## Candidate identity

沿当前main `56ba8f62e06297bedb6c34eee4ce2c4208b503aa`、普通`development_feedback` `szzwZq/gen3 NUlAjG`，完整包`1576576c36c7628332f9c9b03e62cbbc840d3cbe78b1a7efde5d5c2ebce9390d`、339件，嵌套设备session`tEShJz`。未改源码/构建/API配置，未生成新候选或QR。运行AppID与独立手机字节仍未验，不能升级为settled-candidate或完整P1。

## Invocation result

Root复用现有设备owner，每次实际输入前fresh capture并查看。当前普通Map可见后，点击竖排定位按钮；随后进入Search，再点击Search可见返回箭头。没有点击新出现的“移动到本次位置”，没有进入账户/编辑器/草稿或设置全局权限。

初次从定位候选转Search时，截图单次许可已超时，guard返回`device_test_recent_capture_required`，未发送输入。重新捕获并实看同一候选后，仅发送原本的一次Search动作；该准备失败不计产品失败或额外导航。

## Observed product behavior

- 14:30:31Z原Map没有“移动到本次位置”。
- 14:32:08Z实际显示该动作，地图仍为原可见区域；14:34:21Z重新捕获时候选仍在。该生产分支由`requestOneShotLocation(Taro)`返回GRANTED且有限/合法坐标后产生，显示此候选不依赖业务API响应。
- 14:35:38Z进入Search，原有公开查询保留，业务数据仍为内联网络失败。
- 14:37:08Z返回Map，该候选动作消失，原地图地标/视野保持；没有执行位置移动确认。

本次没有出现新的授权弹窗。未读取、打印或保存本次定位数值，也不把截图间隔当定位耗时或精度测量。

## Verified

当前普通微信入口的一次真实getLocation调用能够生成待明确应用的有效候选，地图不会因取得候选而自动移动；Search离开/返回后未应用候选失效。它补足定位成功返回与候选退休的目标证据，不是重复chooseLocation系统选点器取消。

已有`one-shot-location`及Map location-intent的源码/CI证据复用，未修改实现或新增镜像测试。Map的`locateMap`只取得并存候选；`moveToLocation`才承担明确移动与Context解析。Map隐藏沿现有取消owner退休候选；此次实际结果与该边界一致。

## Unverified

新授权弹窗的允许/拒绝/恢复、系统关闭定位后的恢复、物理定位精度、尚在进行的请求取消/迟到结果，以及明确移动后的Context/真实天气天文联动仍未验。普通8808业务HTTP仍受Windows权限边界阻塞，没有声称服务端零写独立读回。未将定位返回成功扩成完整定位旅程或P1通过。

本次新增定位证据的独立审阅在用户中断并改性能优先时尚未完成，保留此缺口；Root观察和原件不升级为独审通过。

## Invalidated

旧截图及本次已消费/超时输入许可均不能再用；继续操作仍需新捕获。完整包和当前session保持，不重启、刷新或把其它generation结果混入。本轮归档脚本曾误用CLI输出字段而非原始meta字段、以及假设失败stderr有stdout文件，均为归档准备问题；按实际`sha256`字段及独立guard失败记录修正后才写最终manifest，原图和原meta未覆盖。

## Cleanup

五份PNG、原meta、输入结果及当前feedback逐件字节核对归档。私有入口仍由`phone-current-api-selection.private.json`的root定位，子目录`location-candidate-evidence-20261025/manifest.private.json`保角色/时间/SHA；不把图像、坐标、设备身份或凭据放进仓库。当前`tEShJz`与普通Map留用，未新增采集进程、上传原件或清除手机数据。N05和R6均未操作。
