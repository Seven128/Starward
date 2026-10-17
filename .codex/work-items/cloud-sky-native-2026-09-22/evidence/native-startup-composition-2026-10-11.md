# 当前原生启动恢复与 Canvas 合成边界

沿唯一 PLAN 的 E/F 继续，使用现候选与公共官方 CLI、SDK、微信工具；没有产品源码修改、WEAPP 重建、旧测试重跑、Stitch 或影像获取／加工。操作、原生输出及范围见 [observation.json](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/observation.json)。这是有范围的开发诊断与自审，不是独审、手机或完整原生验收。

## 已恢复的启动路径

当前安装的官方 CLI 经现 `device-feedback-official.mjs` resolver，在实际 HTTP23977 开启目标工程的独立 automation 端口，再显式编译。最小无 Taro／Canvas 控制页已实际显示且 onLoad 执行；当前完整候选的普通 Settings 随后也取得完整原生画面。初次空白截取不再作为持续启动失败。CLI/open/compile 回执本身仍不证明应用运行，必须读回实际 Page 与输出。

完整候选复用 `apps/wechat-miniapp/dist/weapp-check-local-completion-1011-r1`，实际页面读回 `SKY1011LOCAL1`。SDK3.17.4、webview、DPR3；官方输出为479×1035，运行时视口约390×844。本机实际 Nest AppModule API 使用 LOCAL／MEMORY_TEST／显式开发天气夹具／禁用 media，经真实 HTTP resolve 201 得到新 Context。API 首次从根目录直跑的装饰器配置失败保留，改用现 workspace 启动脚本后运行；不是生产服务、真实天气或持久化容量证明。

从 Settings 通过运行中页面导航进入 Sky，首次方向披露时新版顶部／底部菜单可见；真实“手动查看”动作后，星点与星座线已绘，菜单在官方输出中消失。[当前手动场景](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/candidate-sky-manual.jpg)与[控件布局](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/candidate-sky-composition-boundary.json)保留。当前 Canvas 原生 type 读回2d；底部 dock 仍为约366×68、opacity1、z-index12，非零尺寸并未证明可见。aria-label 中8404是目录身份数，不能称所有对象都已绘；Settings→Sky也不能冒正常 Map 入口或完整姿态／Back旅程。

## 决定下一步的最小对照

现生产 owner 已是原生2D display＋离屏WebGL，并非待新建的一条桥。本次在同一 AppID／SDK／DPR 的原生诊断页复用该 owner 的编译副本，但只运行普通2D填色，不创建WebGL、Taro、Scene、图像或网络。首版 Page 未注册的失败及空服务数据保留；补齐与已成功控制工程一致的页面JSON并重编译后进入自有 Page。该恢复时序不推广为所有启动问题的唯一根因。

2D显示1171×2532，中心像素实际读回 `[15,30,60,255]`。普通View与CoverView都具有正常非零布局、opacity1及高于Canvas的层级，但官方截图均不可见。随后用官方元素动作在**同一页**退休／收起Canvas，数据读回NO_CANVAS、count1，普通控件与CoverView同时出现在实际输出中。两张图均479×1035；[有Canvas](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/control-retirement-before.jpg)、[同页收起后](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/control-retirement-after.jpg)、[2D及布局读回](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/control-2d-boundary.json)保存。程序化点击只用于这个机制对照，不证明用户能够看见并触达隐藏控件。

由此可确定：**所观察的失败不依赖Taro、天空数据或WebGL**。当前环境的Canvas合成／官方截图路径仍有缺陷；精确归因及真机表现未定。先前用户对实际Sky“只有星空”的确认仍成立，不能用这次对照把旧失败降为纯截图猜测。直接从automator evaluate读取当前Sky的Canvas node超时并出现对象克隆错误，只算诊断通道失败，不算空像素；原结果保存在observation中。没有必要继续执行已准备的WebGL对照，或重复旧SDK、z-index和禁用GPU标志组合；没有采用软件renderer、另建桥或Canvas UI引擎。

## 当前状态与收尾

启动已取得当前输入下的有效结果，Canvas后的菜单可见／可操作性仍FAILED；完整原生用户旅程、Android/iOS、物理资源、真实云端／目标容量及独审仍未闭。这个新定位不关闭33项账中的任何整条义务，也不重开冻结影像或239实体队列。

公共SDK连接均disconnect；只关闭自有诊断s3及候选s1，核验命令与8796监听属自有API PID3596后停止。稍后8796／9420／9421均无监听；API exec退出1是这次主动停止，不新增产品失败。全局IDE及未知窗口未退出，见[收尾读回](../../../../output/cloud-sky-native-startup-cli-2026-10-11-r1/cleanup.json)。后续只在具体适用合成修复、新决定性输入或可用目标环境下继续该边界，复用本次结果，不重复已结束对照。
