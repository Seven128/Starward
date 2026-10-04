# B1/B3/D：实际图层共存与地景分辨率切换

本轮按唯一 PLAN 的共同驻留依赖继续，复用已发布的图片和 alpha，没有下载、重做加工或重新选型。**修复了局部浏览时视场外星座图片挤满缓存、导致整组图片反复上传的问题；地景现按剩余共享纹理预算选择 1K/2K，细图失败保留粗图。** 原生正常来源、分辨率切换、真实失败/公开重试和设置返回成立。完整场景质量、手机性能与 Goal 仍未完成。本记录保留v7原条件；当前候选及新增GPU恢复见[后续v8证据](experience-landscape-gpu-retry-2026-09-28.md)，不提升此处旧代验证。

## 用户结果及责任

`sky-artwork-visibility.ts`仍负责注册星座和巡天图的共享请求/绘制资格。在已有球面帽快速排除后，复用前向切平面 ray hull 和注册图片凸射线锥的边半空间作保守分离。长条图片的松散圆形边界相交，不再足以把整张图片送入缓存。视口曲边已包含在 hull 内；交叉边、部分图片、旋转/偏移保留。大视场或不可认证的宽图片继续保守，不由中心、标签或几个角点判定不可见。

`sky-gpu-textures.ts`仍是唯一 GPU 图片缓存，既有 16 MiB RGBA 预算没有扩大。`skyImageRgbaBytes`让实际上传 owner 和地景档位选择使用同一尺寸成本，按解码对象去重；未知尺寸不计零。`sky-landscape-resources.ts`从已发布档位中选择能与其他当前图片共存的最高档，其他图层尚在加载时先用概览，不能牺牲恒星、星座或其它影像换取近景清晰度。

`use-sky-landscape.ts`复用原 `useSkyNativeImages`队列、文件、Canvas/发布代次及释放 owner。独立 alpha owner最多保留两张声明网格，取消迟到请求、失败锁存和重试；成功粗 mask 不随细档请求销毁。当前档的图片只能配自己的 alpha；细图加载/失败沿用有效粗图，预算要求粗图时立即提交粗图。成功已绘结果仍由 scene snapshot供点选、标签、定位及来源使用。没有新图片队列、GPU缓存或逐天体渲染器。

## 实际共同绘制

[生产整页测量脚本](../scripts/experience-landscape-coexistence-2026-09-28.mts)通过官方 SDK 读当前公开示例点/16Z的真实观察上下文，只在内存使用 route IDs，沿实际接口核完整 BSC、星座、银河、地景和 W3 字节 SHA。所有图片按原尺寸真实解码，执行生产 `drawSkyScene`/TWGL/共享缓存，不用假的图片对象或空层通过。逻辑视口390.4×844，软件 WebGL绘图缓冲390×844；测的是逻辑 RGBA纹理分配与实际上传，**不是 native bitmap/GPU总峰值、目标帧耗时或手机证据**。

| 条件 | 实际结果 | 证据 |
| --- | --- | --- |
| 原规则，62个视角×两档，各连续3帧 | 1K有9个视角反复上传整组图；2K有36个。单个2K只有8MiB，不能推出整页预算 | [原测量](../../../../output/playwright/cloud-sky-landscape-coexistence-0928/result.json) |
| 收紧共享可见性，原/新实际整页同条件比较 | 124组输出0像素改变；1K全部连续帧不再上传，最大纹理工作集15,990,784B。盲用2K仍有36个视角重复上传 | [修后及像素对照](../../../../output/playwright/cloud-sky-landscape-coexistence-0928-tight-visibility/result.json) |
| 按实际剩余预算选择档位 | 65个整页条件含正常银河、W3局部/全天/返回保留图；第二/第三帧均0次图片上传，所有纹理实际释放，GL0；最大逻辑纹理16MiB | [适用档位](../../../../output/playwright/cloud-sky-landscape-coexistence-0928-adaptive/result.json) |
| 2K本体遮挡/接缝 | 生产shader与CPU alpha在10条件、131,820样点中实/透空内部无错，最大边缘差约0.504灰阶；1个纹理创建/释放1/1 | [2K alpha](../../../../output/playwright/cloud-sky-landscape-production-0928-detail/result.json) |

当前85°同刻Rastaban的[1K](../../../../output/playwright/cloud-sky-landscape-coexistence-0928/overview-rastaban-85.png)和[2K](../../../../output/playwright/cloud-sky-landscape-coexistence-0928/detail-rastaban-85.png)实际生产整页已看，2K山脊和近景更清楚；这是软件组件输出，不是手机或整页最终视觉采用。固定照片照明、亮晕、昼暮夜整体构成和辨认仍要按完整参考体验评价，不以2K代替这些要求。

## 正常 DevTools 路径、真实失败及还原

本轮结束时唯一活动项目为 clean-v7/SDK9440（之后已由v8替代、v7关闭），SHA `08c48578dc0cd383de500963752df1b3db95982921860ff7d8b4bc53a68f302f`，257文件/4,466,319B（raw main2,078,174B）；无诊断、mock、代次标记、vConsole或sourcemap。官方 CLI绑定后实际公开Map进入，再关闭v6/9439；所有更早窗口已退，历史构建保留。三类既有编译warning未扩大，字节不是官方包体。见[候选](experience-combined-clean-v7-candidate-2026-09-28.json)、构建log和[最终逐文件/服务回读](experience-landscape-lod-readback-2026-09-28.json)。

公开进入、00:00/16Z、手动Rastaban：85°的**已绘来源**指向原出版2K图片，25°指向1K；图片与真实星空同页。通过公开设置返回，当前 owner两份PNG **2→0→2**，旧5份匹配文件没有改动；它们是历史文件，不记为本代活动内存。当时为普通DAY/85°、地景星座开、W3关、无跟踪/面板。[原生观察、来源、文件与捕获](experience-landscape-lod-native-2026-09-28.json)保留全部条件。

细图失败机制本轮新增，不能用上一轮粗图失败替代。只给 owned 本地清单追加空白产生新 hash `d0183cd3a9a0c1bf324ba019f8bca89401aa37a34a35fca4868240e03d3ede38`，临时翻转2K PNG一字节；真实新版本普通发布/请求中，两档alpha200、1K图片200、2K图片500，500没有immutable缓存头。相同85°/16Z页面保留实际1K图片来源，显示公开重试，不退空场或误披露模型；恢复原PNG后公开重试使已绘来源变为同版本2K、重试消失，有前后实际捕获。

故障版本的重试200网络行尚未及时收集，就已编译还原出版页面；不虚构该行或把本机直接请求当原生请求。成功恢复依据同页成功已绘的2K来源和实际捕获。已收故障版原生500以及还原原版两PNG原生200；网络缓冲的条件/缺行留在JSON。故障输入脚本及精确备份见[局部fixture](../scripts/experience-landscape-lod-fixture-2026-09-28.mjs)。最初安全核PID未通过，未杀任何进程；从错误cwd启动API也未成功，日志保留，均不算产品故障或通过。之后核已知owned PID/8789及启动参数，正确在API目录重启。

原清单与两档PNG均已恢复原SHA，owned8789恢复原发布、公开入口重建Context，最终实际GET与Canvas同16Z；当前PID14388/exec22711、log`experience-combined-clean-v7-restored-service-2026-09-28.log`。fault服务5516/exec87151和原30780/exec66654已退；8787/8788未动，不继承旧内存恢复。没有部署、采购、提交、推送或手机操作。

当前截图工具原始PNG只有192×413，而逻辑Canvas仍390.4×844；这一批缩放截图用于运行/恢复观察，不能与旧479×1035作逐像素清晰度对照。上述390×844生产WebGL图也不能反过来冒充原生合成。手机Canvas/WXML、姿态/校准/后台、Android/iOS、峰值/帧时/流量/官方包体/实际费用和独立审查仍未验证。

## 复核及下一依赖

新回归先在原共享可见性实现实际失败（长条离屏图片返回true，应false），修后通过；共享几何、交叉/滚动/偏移及新LOD/alpha失败取消消费者合并23项通过。Mini类型和普通WEAPP构建通过。实际GPU同条件像素对照不允许隐藏有效内容换取资源数减少。检查数量不代表整体验收，自审不作独立审查。

**下一依赖回到B3整页昼暮夜、局部/全天、普通/红光场景构成和浏览辨认，以及C影像组合实差距、D未覆盖的稳定性。** LOD/共同驻留小路径不再是待接入，已验证组合不重复；照片固定照明、源条纹/复杂遮挡/其它配准及目标质量余额保留。预算只限当前逻辑缓存，未知费用不记0，软件耗时不记Agent付费工时。全部商业范围、排除理由、自主代码和交付义务不变，新月面/修复仍未推手机，旧D不能验收新版。Goal保持active、无预算。
