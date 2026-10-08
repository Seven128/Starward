# A1 冻结重复重绘最小修复

原完整page依赖观察证实sensorBasis/devicePose及hipsTiles/readHipsTiles换引用；两个约1.2秒窗口原32/34次Scene。alignment.snapshot保护性复制视角，controller原每样本和遥测emit，page以whole devicePose作为draw依赖；已绘相机又按basis引用更新，使空光学图层也换引用。此前只删devicePose不能解决全部触发。[完整读回](redraw-dependencies-readback-2026-10-06.json)保原窗口/修后/实际源码绑定。

仅在原page把sensorBasis按九个精确数值memo；draw不因raw sampledAt换身份，提交读取最新presentation pose含权威null；已绘camera按同FOV/center及精确basis复用。Sky几何owner补sameSkyViewBasis比较，零舍入/容差/缓存。原raw acquisition、deadline、filter/controller、Canvas请求队列、resource/版本失效/首恢复及正常真实旋转均不改变。

新增实际AST draw两回归先fail2，修后与exact camera/memo所有分量/null/时间/资源/代次、Canvas视角、控制器完整姿态/失联及原滤波共34通过，WEAPP类型通过。第三memo回归首版在原地修改cached测试对象导致假失败已改用真实新快照；readonly tuple错误及原日志保留。扩入原不在115限定currentSource列表的两个必要几何文件，projection原字节由baseline build hash与HEAD blob共同证实，原测试HEAD+仅新增15行证实旧范围；旧成果未重写，原件进入任务快照。

当前实际166Scene/91请求、523完整build source；静止/三轴窗口Scene各0、raw仍15/16，实际sensor/controller继续。冻结前/三轴后RGBA及确定前后均严格差0，最新raw65/-55/30进入确认。确认actual basis最大分量差4.440892098500626e-16，原r1深度对象相等断言因此FAILED，不能称精确向量相等；当前实际光栅0差而未引容差。旧10像素UNKNOWN不借此关闭。

确定后30度alpha真实callback转向（beta/gamma也改变），沿原aligned跟随有25.1279度已绘方向位移，证明未把正常跟随一起停掉；最后公开返回Map同Context，decode/source等效/GPU纹理buffer/encoded租约队列/pending模型0。先修后r2冻结/确认/退休已通过，补一个当前完整bundle复用r3的正向运动消费者以核本机制的新风险，非重跑旧矩阵；总两次构建（修前诊断/修后），三次运行含原r1错误期望失败，无新图像/加工/DevTools请求/服务重启。

本轮两产品page/geometry、一个既有几何测试/一个新AST测试；watch仅detail JS/map，两产品原文在当前source map匹配。软件端口不是native，非物理帧时/内存/200DAU通过；普通Prepared空/HiPS关、质量FAILED/独审MISSING、33义务全留。下一整段动态相机旅程推进原I02/V02消费者组合，不继续无限枚举小按钮。

唯一下一依赖：A1/V02 当前动态姿态的整段公开相机旅程：重复重绘已按原page最小修复，静止/三轴editing窗口32/34→0/0 Scene且raw15/16继续，冻结/确认RGBA严格差0，确定后真实30度alpha输入已绘方向移25.13度，Map同Context与最终模型0；34影响检查/类型，原watch仅detail JS/map，校准组开发收口。下一用当前完整page同一动态姿态样例串公开局部→总览→局部：核总览固定进入朝向、期间传感器继续而返回局部取最新完整姿态，再公开手动意图及点选/资料/跟踪到原入口。沿原camera/orientation/picking/Context/资源owner，不重播已闭来源/五图层/旧时间/固定Back/拒绝矩阵，不为小样造状态/缓存框架；实际组合只关闭开发义务，P1/Android/iOS/新版月面/完整触摸与独审保留。新Context提交10像素单通道1仍UNKNOWN，不用本轮4.44e-16向量差和严格像素0给它代因。Q1仅新具体合格覆盖/几何/权益再开，ESO6k/失败照片退出保持，Mellinger仅低分辨率DISPLAY、普通Prepared空/HiPS关。P1仅新具体动态callback/window/rehydration证据再开，不重发initialize/SDK/日志扫描或重启服务。全部33项、全旅程、物理200DAU/完整发布开放；Goal active无预算，无提交推送采购部署发布外联。
