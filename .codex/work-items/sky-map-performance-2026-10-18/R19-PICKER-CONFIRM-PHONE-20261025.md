# 微信系统选点确认：本轮手机开发反馈

2026-10-25。模式为 **development_feedback**，复用HGyEOG/gen1 AKYc0l与G2HMxB设备session，339件/5,037,760B，WEAPP SHA `ef6eeee2bb44ef2af5c3ddde69961faa2650a7ce9c27ff6392a6ff39fd9c3cd1`。本轮只增加诊断工具入口，未修改产品/WEAPP或冻结候选。

## Invocation result

从普通Map的真实搜索按钮进入Search，再点“在微信地图选地点”打开真实SoSoProxyUI。最初工具只准Back，因此沿既有设备owner增加[窄确认入口](R19-PICKER-CONFIRM-TOOL-20261025.md)，经[独审](R19-PICKER-CONFIRM-TOOL-REVIEW-20261025.md)后再执行。

Root于01:50:38Z重新capture并实际查看1080×2376画面：有已选地点，右上绿色“完成”包含支持区域。只派发一次`confirm-location-picker`，紧接着取得01:50:50Z的普通AppBrand Search截图；没有重放、浏览其他原生地点或操作聊天。随后取得请求结束后的失败态，最后通过Search的正常Back返回Map。

## Observed product behavior

- 系统选点器的“完成”能关闭原生界面并返回小程序Search，键盘已收起。
- 返回初期仍显示原查询和搜索加载态；后续显示“网络连接失败”、本页重试，原查询仍在。没有取得新的地点/Context成功读回，不能把确认派发写成成功切换地点。
- Search正常Back能回到原有Map，原可见区域仍在；精确相机/Context身份没有独立读回，不据静图宣布完整恢复通过。
- 已知当前手机到主机8806 TCP超时；源码的`moveMapReference`必须先完成`resolveObservationContext`才提交Context、清选择/查询和离开Search。这是源码与目标故障现象的对应关系，不是服务器收件或零写证明。

## Verified

新增工具的真实设备确认派发、精确原生窗口退出与返回小程序成立；同设备/owner/显示/新鲜度/单次输入守卫在本次调用中生效。已有Back取消证据继续复用。工具检查92/92、独审92/92均为注入检查，不与手机证据相加冒产品验收。

## Unverified

成功解析地点后的Context提交、WGS84/GCJ-02/时区及约4km/面板居中、实际API零写/持久读回、GPS/精度与权限恢复、手机运行AppID和源字节的独立证明仍欠。首个阻塞为手机API通路；真实供给/身份与全部P1/H5不因这次反馈关闭。

## Invalidated

每个输入前使用新的capture并实际查看，未复用过期授权。旧App画面或定位数据没有用作微信结果。失败请求未重试，未把局部加载态当成功。

## Cleanup

手机已回普通Map。原图/私有meta由既有private device-resume本轮目录保存，未上传；原候选/session保留。未改N05、账号、R6、PG/Redis/API进程、VPN/TUN或防火墙，也未删除旧原件。
