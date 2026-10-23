# R19 gen16 持续按下态与释放

## Candidate identity

`development_feedback`，沿当前普通gen16、session `starward-device-test-B6W0lu`，bundle `51c72f197afab132827019bc07ae36ddb556466b0a7c4c888d3581115899dae3` /345件/5,023,816 B。本批没有改源码或再次构建/推送；runtime AppID、手机完整包字节仍未认证。

## Invocation result

原gen15拖出取消只留下未误开LayerSheet的终态，未解析出按下态。本批只改变一个条件：同一Layer工具上以公共 `record-swipe` 发送起终点相同 `(0.901,0.469)`、请求1500ms的持续触摸，便于在录像中观察稳定按下态；不把它冒充普通短tap或补完整曲线。

Root在公共USB fresh capture `78fe47a8-02c7-4591-9093-829340bd24f9`（UTC03:56:18.145）实看完整Map后，立即发送该一次显式USB输入，请求录制6秒。公共工具exit0，`actionSent:swipe`，返回 `recording-1792727800997.mp4` 和 `19a631e7-bafa-4844-8277-f121e8cd9de2`（03:56:40.997）。没有额外tap、Back、手势或媒体操作。期间前台守卫由原工具负责，未调用私有ADB输入。

## Observed product behavior

实际解码为 **5.260078秒、1080×2376**。Root实看终态原图、0/0.4/0.8/1/1.2/1.4/1.6/1.8/2/2.2/2.4/2.6/3/4/5秒的完整接触表，以及同一15帧Layer工具区域的无修饰放大：中后段圆面呈现变暗的按下态、图标变小，末帧恢复；圆按钮位置和周围Map保持。末张原图与fresh before SHA同为 `61e907ffe7d7fa7aefd223a566c464eb1fb19cd9ee5530ce52d671c23a2d0da5`，LayerSheet未开、terrain/LIGHT及地标未变。

采用基准是原增量 `3995519477980461148` 的 `press.png` 及其editable `review.mjs` 公共press规则。Root本批实际重看该图并读源；它要求轻凹、亮度变化、仅图标轻缩，命中面/版式保持，释放恢复。源码仍为同一共享native hover owner，不新增计时器/父级状态或全局样式变体。

## Verified

本批补到真实手机可辨的圆形图标按钮稳定按下态与恢复；原普通点击、拖出取消的有效证据继续分别复用。它支持现有公共反馈路径实际消费样式，不能单凭源码/hover属性通过就称手机出现按下态。

25件原图/元数据/原视频/实际解码帧/两份审阅接触表/已完成调用转录共 **53,883,532 B**，已独立复制并逐件hash读回。私有owner `device-resume/r19-ui-20261022/gen16-press-hold-20261023-1156`，manifest SHA `028058098d5d3ed87e6ccdced6e9280d43b2bee3e6d5a8d026174aaed67d430f`。接触表只是同原片的离线审阅派生，没有修饰画面；`completed-input.private.json` 明确是已完成Root调用转录，不伪造新设备回执。

## Unverified

没有由15个离散帧测定80/140ms准确截止、连续FPS或原生触摸时间；请求1500ms也不是实测反馈起止。不能从静止长触摸推断普通短tap的点击时机或认定未弹层是普通点击失败。原生Picker的View触发面、禁用/loading、其它业务输入/生命周期仍依各自既有条件；本批不建按钮/主题矩阵、不触发账户或N05，不关闭整体UI/Goal。

## Invalidated

旧gen15取消录像没有明确按下帧的限制仍保留；新样本仅补稳定按下态，不覆盖旧取消机制。实际5.260078秒不能写成恰好6秒，也不能用静态放大图认证精确变形比例、曲线或无障碍对比度。

## Cleanup

手机仍为完整Map，Root独占；无录制、输入、Play、watcher、官方操作或服务reload在途。离线解码原owner在finally关闭其Edge/私有HTTP，设备录制原工具清理自有临时媒体；上述必要私有原件保留。没有改VPN、账号、N05、R6、冻结gen32、PLAN，未部署、提交、推送或上传数据。原生双指配合时机仍pending，未发开始或执行。
