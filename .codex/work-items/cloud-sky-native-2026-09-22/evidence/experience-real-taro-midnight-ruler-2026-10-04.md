# 原页面跨午夜与公共时间尺开发证据

本增量没有修改产品源码或云观星以外业务逻辑。工作区/分支/HEAD保持，六项设置/outbox保护保持；Goal active、无预算、未完成。没有提交推送、原BFF/watch重启、下载加工、手机预览或部署发布。

沿当前PLAN的跨午夜依赖使用完整原SpotSkyPage、实际installed Taro/React/Query Provider、原时间意图/同帧投影/公共ScrollView事件和隔离当前API。401前端输入、162服务project源码图及r61的303源/六保护严格绑定；r2前后保持，39个实际公共read文件保持。r1只有执行前绑定、失败时快照，没有结束绑定/完整read输出或最终退休，不补造。

原测试正式点时区Asia/Shanghai，实际resolve输入2026-10-04T15:59:58.700Z，即10月4日23:59:58.700。测试时间是普通输入，不加速时钟或注入页面时间状态。此地点的整夜范围是当地中午到次日中午；`localDate`表示整夜归属，跨民用午夜后保留10月4日，当前显示日期应为10月5日。原公共时间尺从报告的真实hourly构建49行，实际触控偏移使用原34rpx和受控390px几何；不认证原生ScrollView惯性/布局。

## 保存结果及执行边界

- **r1早段：** 公开点选实际已绘HR:168/Schedar并跟踪，原1×播放跨午夜。保存移动Scene输入16:00:00.441Z、已绘16:00:00.372Z，相差69ms；两个实际时刻均已跨午夜，不要求运行中异步采样完全同时。暂停已绘16:00:00.561Z，原显示10月05日00:00/UTC+8。公开取消恢复23:59:58.700、原相机和原context。公共touchstart/scroll预览00:30，touchcancel后迟到scroll/scrollend忽略，恢复原相机/时刻/context。
- **r1提交取图失败仍FAILED：** 原松手与后续惯性scroll已取得次日01:00、context revision2回执，但GL→PNG→GL期间Scene序号92→98、来源图像集合改变，raw前`971914b1399c315feb45be5205263551a2fd0e932ad7e1afbf22044bc37201dc`、后`1dba1e08164f37fc1d97b76ec7551d458286097881a2ec9db07cc47a9be28555`不相等。只有保存集合变化证据，不断言单个draw原因或产品缺陷。脚本自然exit1，后续退休未执行。
- **r2未闭合段：** 复用完全相同bundle，只有任务等待改为全部加载/查询结束且相同已绘输入连续三次稳定；`commit-only`不重跑r1播放和第一段取消。它是另一个新contextId，不能拼成同一实例全旅程。公开预览00:30、touchend后真实scroll至01:00、scrollend后settlement采用最新scroll。实际PUT只一次；selectedAtUtc17:00Z、revision1→2、整夜localDate10月4日。原报告与Scene对应revision2、正确context身份和17:00Z。提交后程序scroll0/迟到touchend/scrollend无二次提交。
- **r2后台中断：** 再公开预览前一民用日期23:30，原onHide取消未提交预览，活动native登记、GL模型及encoded lease归零；原onShow恢复已提交01:00、revision2与同跟踪相机。再迟到scrollend不改变。提交及返回单次GL前→PNG→GL后严格一致；本视场两次图也完全相等，不升级旧整周9通道delta1精确相等FAILED。
- **实际跟踪消费者：** 原共享`useSkyPresentationPosition`用同publication/observer/已绘时间的本地位置，remote anchor Query是disabled/pending-idle且没有position HTTP，不当远程位置响应。保存相机basis随午夜及00:30/01:00改变；原已绘snapshot中的HR:168和实际选中label始终在195/422中心（浮点打印误差小于1e-9），取消恢复原basis，返回恢复提交basis。未保存独立位置callback输出，不把Query空数据冒充此回执。

根保存读回r1首次错误地要求播放中Scene输入与异步已绘采样完全同时，失败保留；归档旧reader后，仅改为读取二者实际时刻及跨午夜事实，暂停/预览/提交等稳定阶段仍严格同时，没有放宽PNG同帧检查或像素容差。未重跑HTTP。新reader通过属于自审，不是独立审查。

实际查看保存的午夜暂停和01:00返回PNG，星空/原插画随时刻连贯改变；原显示/日期/选中标记通过原逻辑树另核。SCSS虽绑定但未合成，PNG不含native UI/WXML，不能认证手机完整视觉、惯性或操控可用性。

## 资源和出口

r2共51请求，实际收到正文4,967,735B；无注入失败。1181模型观察，history未截断。不同时间独立MAX：文件含staging1,328,458B；GL texture上传模型9,437,184B、buffer22,476B；活动登记最多9、源RGBA等价15,728,640B；encoded35项/1,301,338B，reserved703,555B、同时running2、pending8。不相加成物理总峰，模型不供native GC/200MB binary/服务容量。最终所有登记retired，活动GL/lease/encoded/Query/pending为0，文件仅空inventory26B。

## 直接入口与剩余义务

- [r1失败和原脚本](../../../../output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r1/failed.json)、[r1提交取图边界](../../../../output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r1/software-ruler-committed-capture-boundaries.json)
- [r2原页面结果](../../../../output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r2/result.json)、[完整phase](../../../../output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r2/phases.json)、[公共时间尺动作](../../../../output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r2/public-ruler-actions.json)、[层级模型观察](../../../../output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r2/resource-summary.json)
- [根r1错误同时采样断言](../../../../output/sky-real-taro-midnight-ruler-readback-1004-r1/failed.json)、[旧reader归档](../../../../output/sky-real-taro-midnight-ruler-readback-1004-r1/executed-reader-before-playing-phase-correction.py)、[根r2保存读回](../../../../output/sky-real-taro-midnight-ruler-readback-1004-r2/result.json)、[当前reader](../scripts/readback-real-taro-midnight-ruler-2026-10-04.py)
- [下一责任](../PLAN.md)：原跟随完整旋转冻结/校准确认取消/断流拒绝及导航恢复，再补日月七行星/全部实际影像家族与资源。此处两epoch开发结果不代完整冷暖组合或最终验收。

WEAPP/WXML FAILED、Android/iOS新版Moon、物理资源/全部家族/完整旋转校准、Prepared普通registry空及完整图质/rights/批量出版、完整静态保留引用、全小程序200DAU端云成本/12Mbps10-20混合容量/180GB余量、独立审查均仍开放。原整周像素相等FAILED和纹理窗口任务对照未采用保持。没有调整预算、其他业务或素材采用。
