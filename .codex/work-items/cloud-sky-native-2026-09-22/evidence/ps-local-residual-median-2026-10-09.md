# PS局部残环Median试验：像素隔离通过，画质仍待修

复用NGC5128已做原图局部恢复的完整RGB/ICC，不重跑SXT、取图、缩放或出版。输入`output/ps-original-restoration-2026-10-09-r1/ngc5128-restored.png`为1024×1001、1,260,439B，SHA256 `0aed187a214c942fff05f7b77e8d72ed682367fb1a2262f21314e7db6cfe2343`。原2x SXT已有缓存残环更明显，未作为替换层。当前共享PS host/batch新增有限`local-residual-median`操作；这是显示估计，不能沿原图恢复producer或观测数据合同出版。

实际Photoshop 27.10.0的COM/JSX `applyMedianNoise(18)`只执行一次。修复圆心840/650、半径26、feather5，最终应用范围由冻结逆向保护蒙版限定；滤波层全图仅作诊断，不作最终素材。执行前保留三个共享源码同字节快照，原图、保护层、滤波层、候选与可编辑PSD全部保留在`output/ps-residual-filter-pilot-2026-10-09/`。PSD实际重新打开，3层/1alpha/真实user mask及几何读回，文档数前后均0。PS蒙版外1,020,117像素通道差0，521核心像素与实际滤波层差0，2,460像素确有变化，编码混合最大码差0，ICC逐字节一致。Python只冻结蒙版、检查输出和生成只读诊断；实际照片滤波在PS执行。

root已查看完整候选及80×80 ROI的4倍nearest对照。黄色弧减弱，但仍可辨，局部纹理趋平；结论 **NEEDS_REPAIR**，不文件通过、不生产采用，不再按参数循环重试。`result.json`保留执行时的VISUAL_REVIEW_PENDING历史，后续`visual-review.json`单独记录当前看审。该ROI不是全图质量或独审。原SXT和原PS异常结论不改。

新操作配方在COM之前拒绝缺少蒙版/半径、非整数或1..100范围外半径。该范围是此有界入口的支持范围，不能将现代UXP文档的更大范围外推为旧JSX全部通过。8项当前共享边界检查通过：5项既有恢复/部分失败/像素篡改/执行迁址回归，以及真实PS1 preflight的无效配方、有效配方到禁止COM桩、去掉守卫后无效0半径到COM的有界反例。测试不实际打开PS或推理，原日志保留；这不是新Median画质通过。

本次实际处理0.212s、保护2.978s、保存1.654s，native wall8.872s、host报告9.235s、wrapper11.824s；PS进程100ms采样RSS下界3,502,096,384B含应用基线，GPU物理峰UNKNOWN。候选PNG1,172,236B、诊断滤波PNG213,549B、PSD10,097,152B，另有mask/config/report及快照；不是Linux容量或可归属净内存。模型0、PS1、publication0，Scene MISSING、science UNKNOWN、ordinaryAdoption=false、independent MISSING，33项原行不提高。

下一按独立责任推进。若无明确新输入/机制，不重做本图或工具选型；粒度异常可沿已选NXT按需候选先解决颜色合同，再决定一次有/无降噪的有界批次，不能期待降噪恢复误删结构或残环。
