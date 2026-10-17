# 本机原生合成边界

原生菜单不可见仍为 FAILED。本轮仅复制已有最小控制页到 `output/cloud-sky-native-composition-repair-2026-10-11-r1/control`，没有改产品源码或重建原生候选。实际 SDK3.17.4／webview／DPR3，owned s4、官方 automation9431／HTTP23977；官方 auto 后显式 compile 沿已证明的启动恢复方法。

Canvas 改为 y220px／高240px 的有界区域后，普通文字、CoverView、底部按钮与实际离屏 WebGL→2D 呈现桥可同时显示；变色 sample `[127,20,20,255]`、glError0，node1099×720、逻辑366.4×240，ANGLE/NVIDIA 实际运行。现有 [JPEG 画面](../../../../output/cloud-sky-native-composition-repair-2026-10-11-r1/colored-composition-optimized.jpg)及同批 raw PNG 均显示完整控件；先前捕获差异不能证明编码优化是原因。

恢复全幅1171×2532／逻辑390.4×844后仍只有 Canvas 内容。复用既有 PageContainer 前景机制（center、z1200、overlayfalse、父 pointer-eventsnone／控件 auto）的 [实际红色全幅画面](../../../../output/cloud-sky-native-composition-repair-2026-10-11-r1/foreground-colored-canvas.png)仍无普通控件；Canvas 子 CoverView 对照也未解决。完整数据归 [readback-summary](../../../../output/cloud-sky-native-composition-repair-2026-10-11-r1/readback-summary.json)。没有采用缩小星空视口、重写 Canvas 菜单、迁移全部 CoverView 或替换 renderer；这些对照不认证产品菜单、校准、点选、Back、设备或性能。

诊断 query 的克隆错误、即刻 postcompile tap timeout／失效 ObjectId，以及第一版 PowerShell intent false/null 均留原回执，只算诊断失败，不冒产品结论。实际变色由当前页同步调用完成。官方安装器只读版本解析仍 exit1／官方配置获取或解析失败，没有安装或升级，也没有绕过此前组件页站点安全拒绝。未知窗口与全局 IDE 保留。

owned s4 已官方关闭，随后 [cleanup-settled](../../../../output/cloud-sky-native-composition-repair-2026-10-11-r1/cleanup-settled.json)读回9431无监听，自有相关进程自行退出；未 kill 未知进程或全局 quit。电脑本轮必要机制对照已结束。继续需要适用工具／SDK 合成修复的决定性输入或可用目标运行环境；现失败及用户实见不因诊断页部分成功而关闭。图像获取、像素加工、旧测试和产品构建均未重跑。

后续检查了失败的官方版本resolver源码：其将所有配置获取/解析异常合并成通用错误，原exit1不能证明没有合格更新。沿项目规定的browser-client runtime选定iab，通过已记录的官方下载URL作一次只读导航，实际被Browser site-safety策略阻断，没有取得页面/版本/链接，未触发Auto-review或人工批准。见[该回执](../../../../output/cloud-sky-native-composition-repair-2026-10-11-r1/official-download-browser-2026-10-12.json)。自有标签随即关闭；没有换browser、shell、raw协议或替代端点绕过被拒内容。安装、IDE及产品源码未改，本轮未再运行Canvas试验。这是版本核查的外部访问边界，不冒菜单修复，也不把旧机制观察改为通过。
