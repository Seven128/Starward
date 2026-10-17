# 跟随显示的当前有界观察

## 接线与验证缺口

当前`use-sky-orientation`确实在Android控制器输出后调用唯一`createSkyPresentationFilter`，再写latestPresentation/单writer；raw姿态仍给alignment。控制器presentationRevision只在启动/失流/控制/参照转换时重置，不是每个运动样本递增。现Quaternion One Euro速度自适应与既有模拟转向/北缝/参照恢复证据复用，未因本次核读重复整套测试，也未盲调参数或叠第二滤波。用户的手持微抖/主动转向响应仍需实际相应输入；放置状态不是完整UX06验收。

## r93：同守卫的无触控录屏

现有record-tap/record-swipe必带一个输入，不适合被动跟随观察。`device-record.mjs`现在共用同一6秒recorder，暴露recordDeviceScreen的无输入入口；`device-test.mjs record --session ... --transport wireless`保同bundle/session锁、设备绑定、fresh单次capture、Mini Program前台/显示/permissionScope约束、250ms前台监视、唯一私有设备路径与owned-recorder清理。没有dummy tap、额外采集服务或更宽系统页面授权。输出明确inputSent:false；scope/错误时仍丢弃媒体并消费旧capture。

8项recorder检查actual0，含无输入成功、权限scope/前台/显示漂移与旧gesture/晚发/owned PID守卫；4项相关CLI行为（含成功写私有媒体、失败/permission消耗capture及参数白名单）actual0，pattern顺带命中1个既有QR检查通过。日志r93-record-tests.log/r93-record-cli-tests.log；原工具前像r93-record-before-*保原。Context命令说明已在原settled-candidate owner更新。没有改WEAPP产品/传感器滤波代码或重建r92。

## 普通r92的实际观察

普通r92已实看/绑定后，通过当前“跟随手机”按钮实际进入跟随，按钮变为“手动浏览”，星空转至唧筒座方向；没有权限错误或人为校准参照。随后guarded record实际返回6秒MP4与matching Mini Program截图、inputSent:false。原私有媒体r93-follow-still.mp4/r93-follow-still-end.png及12原抽帧保private runtime；已根读0/2.504344/5.500589s三个原帧。编码269帧/743,203B、PTS0–5.9678s，最大编码间隔68.455ms，不当物理FPS。

`measure-follow-motion.py`从同原视频逐帧在五个已实见亮星附近取加权亮核质心，只保存聚合数值，不保存逐帧位置或连续姿态轨迹。原1080×2376物理截图像素中，五点RMS半径0.441–0.460px、最大偏离0.85–0.99px，单轴全幅约1.19–1.52px，step p95约0.20–0.26px；包括编码/栅格测量噪声，不假设CSS DPR或转换成角度。完整视频hash/方法/限制在r93-follow-still-video.json与r93-follow-still-pixel-motion.json。

这次未发送触控，画面变化小；没有独立证明手机物理完全静止，也没有raw传感器对照。它不支持声称手持微抖、窄FOV跟随、主动转动延迟或绝对校准已完成，更不否定用户原问题。当前不凭该样本改参数；继续独立的连续环境/原生缺口。原33、实际FAILED及设备/独审未验保持。
