# B3：正常全景发布、同帧遮挡与原生恢复

本轮沿唯一 PLAN 的输入→版本化发布→正常页面小路径继续。既有 1K/2K PNG、无损 alpha 和原包全部复用，没有再次下载或转换。**原生 DevTools 已取得正常请求、解码、实际全景、真实恒星遮挡、来源、HTTP 500 回退与重试及模式返回证据；完整环境质量、目标性能与手机仍未通过。**

## 责任及输入

- `packages/miniapp-contracts/src/sky-landscape-publication.ts`持有固定来源、双许可声明、两档精确资源身份、虚拟 ENU 映射和有界完整 alpha 解码；缺行、错 PNG 身份和伪造透空拒绝，不能代替未知现场遮挡。operations/SDK沿现有生成器增加两个资源操作。
- `SkyLandscapePublicationService`及既有 BFF controller持有清单和受限文件发布。每次送出验证长度/SHA，alpha还验证解码身份；未知版本/文件拒绝。原包保留，图片加工与代码的许可边界分开。本地清单 SHA 为 `e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5`，精确资源值见合同常量和 `workers/miniapp-api/assets/landscape/manifest.json`。
- `use-sky-landscape.ts`沿正常 Taro bare-resource和共享`useSkyNativeImages`，依当前 Canvas/代次/发布身份取得 alpha→自有文件→Canvas 图片。当前只取1024×512：GPU RGBA估算2MiB，decoded alpha524,288B、保守列边界2,048B；这些不是整页峰值内存。2048×1024已发布，尚未选择，需先测实际共同驻留与收益。
- 既有 `sky-landscape.ts`/`sky-gpu-renderer.ts`复用逆球面射线、TWGL、纹理缓存及释放owner；横向接缝按两端真实texel混合，未另建加载器或GPU缓存。亮度来自同刻太阳的显示曝光，红光只输出红通道；历史照片固定照明不能冒充当地天气或物理重建。
- `sky-landscape-mask.ts`持有实际图片的 LINEAR alpha和保守整图覆盖；场景只提交成功绘制的panorama、procedural或null。点选、标签、定位、影像来源共用已绘相机/mask，不继承旧树木遮挡；部分透空不被角点采样填实。失败时旧程序模型仍由原几何owner提供。

Stara Lesna Meadows / Lubomir Hambalek原包标注CC BY4.0，来源目录标注CC BY-SA4.0。原声明均保留，图片派生物按后者提供，归因、处理、条款、当前图和原包均可见；这是有限模拟场景输入，未认证正式最终视觉质量。原包的斯洛伐克observer/旋转不导入本产品，图像接缝只是虚拟方位，不宣称测得真北或当前地点地形。来源与此前拒绝理由见[输入探路](experience-landscape-input-feasibility-2026-09-28.md)，不重开方案选型或恢复商业排除项。

## 固定候选和实际旅程

唯一活动项目是`weapp-check-sky-combined-clean-v6-0928` / SDK9439、独立API8789，SHA `6a24860eb13bb7a878e9fe1c17b8790a764fa552fd18625ae2d60bfe5321b900`。257文件/4,463,009B，main原字节2,078,174B；没有诊断、mock、标记、vConsole或sourcemap。三类既有构建warning保留；字节不是微信官方打包计量。旧v5窗口已关闭，历史构建/证据保留。见[候选](experience-combined-clean-v6-candidate-2026-09-28.json)、构建log和[最终文件/服务回读](experience-landscape-native-v6-readback-2026-09-28.json)。

公开地图示例点→云观星→手动→00:00（2026-09-28T16:00Z）已加载真实图片。CSS Canvas390.4×844，工具截图479×1035。已实际查看Rastaban的85°昼/暮/夜、全天、关/开和来源返回；红光经公开设置选中后返回同一视角/时刻/定位，最后恢复DAY/85°。工具的Canvas盖普通WXML差异仍不能裁定手机合成。[观察、来源、资源和全部捕获入口](experience-landscape-normal-native-observations-2026-09-28.json)与[带图片SHA的回读](experience-landscape-native-v6-readback-2026-09-28.json)保留实际条件。

真实当前报告选择Nüchuang / HR6418：16Z、高度约3.58°，该PNG alpha为255。公开定位5°后，官方SDK对同Canvas中心触控，开启照片无资料或重叠选择；关闭后实际打开HR6418资料，关资料并恢复照片后重新提示模拟遮挡。[原生遮挡记录](experience-landscape-clean-v6-occlusion-2026-09-28.json)前后核了原257文件。早先MCP坐标事件未取得正向选择、类名正则也曾误判，不作为产品失败；成功路径用已验证官方SDK事件。不是物理触摸或手机证据。

## 真实失败、缓存反例和恢复

首次将owned本地PNG临时翻转一字节，直接HTTP确实500，但小程序仍收到07:57:14的有效immutable缓存并继续显示照片。`cleanWebViewCache`和`cleanFileCache`没有使该路径读取新字节；三个等待模型回退的尝试都失败，最后一次[失败观察](experience-landscape-native-recovery-r3-2026-09-28.json)保留。它们没有测试到坏图，不能记通过或误修产品；均已恢复PNG。

随后只给本地清单追加空白，生成新的真实发布hash `c664515523e2713fb0e98abc4599e25d7ab85594251fc3d0d7496232b6bf694e`，沿正常服务和公开Map入口首次加载；没有伪造API、mock或改私有React状态。原生network记录同版本alpha200、PNG500；页面显示自有模型、没有照片归因、提供“重试模拟地景图片”。恢复精确PNG后，点公开重试得到PNG200、照片归因恢复且重试消失，实际拥有854,784B/1024×512文件。前后截图以及500→200记录均在观察JSON中。MCP缓存日志刷新有延迟，首次窄查询未即时列出请求；后续完整记录确认了原生请求，不能据当时空过滤结果称未发请求。

清单和PNG均恢复原SHA并重启owned8789；通过公开Map入口重建内存Context，实际GET与当前Canvas仍同16Z。本轮不保留重启前内存Context，旧exec65937及临时74828已退；当前exec66654、PID30780、log`experience-combined-clean-v6-restored-service-2026-09-28.log`。共享8787/8788未重启。临时新hash仅故障fixture，不部署或作为当前正式版本。

正常版本的设置往返另外读到owned panorama文件**1→0→1**，红光/普通返回均有实际照片；只证明该文件生命周期与重新解码，不能证明GC、GPU/native峰值或OS后台回收。

同一16Z/85°手动Rastaban在公开红光设置再返回DAY之后，与往返前的实际PNG比较：去掉系统栏/菜单的固定区域内，上方224,160px与下方172,790px均0变化，分区只是静态近似。详[真实返回像素](experience-landscape-v6-return-pixels-2026-09-28.json)；只认证这个候选/操作/区域，不代替其它视角、物理设备或完整质量。

## 检查和质量余额

两项实际HTTP/输入合同、26项受影响mask/标签/点选、15项既有图片/HiPS/SDSS链、合同/API/Mini类型及普通WEAPP构建均通过。实际生产renderer/TWGL/cache的10个软件WebGL条件共131,820样点，实/透空内部无差异，GL0、纹理创建/释放1/1；[生产GPU记录](../../../../output/playwright/cloud-sky-landscape-production-0928/result.json)只认证这些条件，最大边缘差异仍按记录保留，不外推手机或整页预算。

[有界变异](experience-landscape-mask-mutation-2026-09-28.json)把真实共享图片点mask暂改为不遮挡，实际标签/点选消费者回归失败；finally逐字节恢复后相关检查通过。初次观察器误以默认Node reporter为TAP，捕获到了正确失败但识别正则失败；改显式TAP后完整记录成立，未放宽产品期望。原始运行命令/输出及其他探路失败属于开发证据，不按总数衡量完成。

已看整页昼/暮/夜/红光图片。1K的近景和远山有明显放大模糊，晴天山脊/树缘残余亮晕、照片固定照明与图表化暗色天空尚需对照；当前构成比原简单模型丰富，但不宣布B3完成。下一步有界评估既有2K在实际图层共同驻留时的质量/资源表现，选择适用LOD并核同帧mask；按可比视场评价地平附近浏览与辨认，而非继续无限细修树叶或重做下载研究。C的源条纹/复杂遮挡/其他配准、完整稳定候选旅程、目标手机首屏/帧时/峰值/流量/官方包体、真实姿态/校准/OS后台、iOS、独立审查与实际新增费用仍开放。未知费用不记0，软件耗时不记有效付费工时。

Goal保持active、无预算；没有手机操作、部署、采购、提交或推送。新月面和本轮改动尚未推手机，旧D不升级。

唯一PLAN/STATE/INDEX/PROGRESS和对应产品、运行、来源Context已更新；`ty-context validate-context`退出0，只检查manifest及显式控制源声明，不认证普通Markdown链接、需求或产品。受影响tracked文件`git diff --check`退出0，既有行尾规范提示不作为产品通过；源mask有界变异已恢复。SDK9439/PID28404、API8789/PID30780仍活动，旧9438无监听。必要独立审查仍未发生，不把本人检查称独立审查。
