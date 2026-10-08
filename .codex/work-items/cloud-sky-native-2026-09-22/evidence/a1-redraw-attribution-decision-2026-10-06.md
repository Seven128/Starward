# A1 整场重复重绘归因

沿当前唯一PLAN读取calib-mode r3、calib-layer r2、calib-source r5既有frame轨迹与原owner，没有新runtime/构建/图像加工。详见[逐phase实证](redraw-attribution-readback-2026-10-06.json)。当前模式r3的calib-mode-editing共1018次Scene，视角与记录到的Context/时刻/图层/真实源图身份/资源资格/几何/贡献调用参数签名仅1个，相邻1017次相同。这是实际重复工作证据：银河1018、星座图7126、点绘制322706次；不是仅同截图推断。

观察器包围wall累计27174.3ms，中位23.4ms，p95 46.8ms。这包含源身份扫描、proxy每次调用记录、实际Scene和包裹GL，不等于原生绘制/GPU耗时；观察器自身开销未分离。phase跨度43872.7ms包含RGBA完整传输、截图和等待，不是用户校准时长。旧native-source-back限定GL recorder在本校准phase为空，不能借其为空说GL成本为0。完整记录签名相同也不证明每一帧RGBA相同，原首末像素0差证据仅保原范围。

原controller motion接受每个有效raw、alignment.update、armDeadline、emit，必须维持；snapshot即使frozen basis相同，仍复制raw为新pose。原useSkyOrientation继续发布React状态，原page draw依赖整个devicePose，useEffect按draw变化提交。paint从latestPresentation读取当前相机，presentationRevision/null/liveness约束仍有独立语义。因此whole pose身份是有依据的无效提交候选，不应为省绘制停止raw或遥测；其它draw依赖引用是否也每次新建尚未测，不能宣称改一个依赖就足够。

下一只用一个当前完整page有界样例读原依赖的identity变化，冻结静止与三轴变化都保持raw/controller最新确认，若可决定则原page分离render view依赖与raw时刻/遥测，保其它绘制输入失效/恢复及公开退出退休。无需新通用签名/缓存框架、盲目时间预算或复播闭合矩阵。未实施性能优化，不冒设备获益/物理资源通过；本次无产品及WEAPP变化，30检查/类型是上一当前epoch证据而未重跑。失败照片、普通Prepared空/HiPS关、10像素UNKNOWN、P1设备入口停放/独审MISSING与全部33项保留。

唯一下一依赖：A1 整场重复重绘的原page依赖小样与最小修复：已只读三既有完整page轨迹，当前editing 1018次完整Scene且记录的视角/Context/图层/来源/贡献参数签名只有1个，7126 artwork与322706 disc调用；同步软件wall包含诊断代理、不可当原生帧时，逐帧像素/诊断自身成本UNKNOWN。原snapshot每次复制raw成新devicePose，draw useCallback依赖whole devicePose，effect按draw身份提交；raw采样/期限/React遥测仍必须继续，其它绘制依赖引用尚未逐项实测。下一一个当前完整page有界静止冻结及三轴变化小样，只读原draw依赖引用变化，定位devicePose与其他引用触发；证实后优先在原page把绘制依赖与raw sampledAt/telemetry分离，保null、presentationRevision、FOV/视角、图层/数据/资源失效/恢复及最新确认/失联。沿原camera/controller/Canvas与已有live paint读取，不停raw、不改状态事件缓存框架、不按计时设盲目预算；只核本机制与公开退出退休，不重播来源/五图层/时间旧矩阵，不冒软件成功为native/物理/完整体验。校准编辑互斥组开发收口保持。新Context提交10像素单通道1差仍UNKNOWN留A1不设容差。Q1仅新具体合格覆盖/几何/权益再开，ESO6k/失败照片退出保持，Mellinger仅低分辨率DISPLAY、普通Prepared空/HiPS关。P1仅新具体动态callback/window/rehydration证据再开，不重发initialize/SDK/日志扫描或重启服务。全部33项、Android/iOS/新版月面、全旅程、物理200DAU/完整发布开放；Goal active无预算，无提交推送采购部署发布外联。
