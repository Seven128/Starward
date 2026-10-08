# Q2：NGC6752 实际 Scene 合成边界与决定

**仅改颜色单位不足以交付连续背景，线性光变体不采用。** 同一个实际页面概览的完整原 Scene、数据、相机、时刻、原 JPEG 和 native/TAN 注册保持；线性光组合稍减照片底色，但斜置矩形和骤停的密星仍明显。普通 Prepared registry 仍空，产品源码没有变化。这次明确退出颜色公式小修路径，后续先验证具有更广实际覆盖及可交付权益的区域成品；执行顺序只见 [PLAN](../PLAN.md)。

## 纠正归因与实际责任

此前 [Q1 决定](q1-ngc6752-prepared-decision-2026-10-06.md)用“不透明全幅”描述失败配置，归因不准确。原 JPEG 的几何范围有完整可用 alpha；这不等于最终显示完全不透明。现 [Prepared shader](../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts)先按原 alpha/四邻判可用、选择细档，随后按编码 RGB 的最大通道求显示贡献。配合原 [GPU blend](../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts)，opacity=1 时最终 RGB 为 `sourceRGB + backdropRGB × (1 − max(sourceRGB))`。有效黑选择细档、显示贡献为零，不回退粗档；科学有效性仍 UNKNOWN。

这个最大通道责任不等于 W3C 逐通道 screen 算子，也不提供天文表面亮度、曝光或跨波段校准。不能把 geometric alpha、显示贡献和科学有效性混为一项。旧 Q1 封存收据中的 `OPAQUE` 标签保原历史字节，本代文字更正不改变其实际图质 FAILED。

实际 [Scene owner](../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts)先画背景/可用广角银河，再画目标照片，之后独立画目录恒星和其它天体。当前 [银河视场责任](../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts)低于12°时 strength 为0；新概览视场1.3428225612934812°、实际 Scene 没有提交 galacticBand，也没有持有银河图片。旧宽角 `u_galactic*` 缓存值不是本帧参与证据。本帧照片前全部 RGB 为 `[14,19,32]`，属于当前显示背景，不能冒称 Mellinger 实测天空亮度或线性辐射单位。固定光学 Mellinger 的普通低分辨率显示决定保留；它没有自动补齐此局部照片外围。

## 最小实际对照

复用已关闭 Q1 的完整页面 bundle、515 frontend 原文件及当前173 backend。没有重新构建、取源 JPEG、分档、回放七暖帧/来源 Back/hide 矩阵。仅经原 Map→Sky、HR7127 搜索定位、公开 Canvas pan 和缩放取得原概览，然后保留该次真实 `drawSkyScene` 参数、renderer、报告/SAO 数据和图片身份，同步画三个完整帧：

1. 原 Scene 去掉照片的明确反事实。
2. 当前编码 RGB 合成。
3. 源/背景经标准 sRGB 转移函数转线性值，沿原最大通道显示责任组合，再编码的未采用候选。

复用 [10月4日既有线性小样](experience-prepared-wide-compatibility-2026-10-04.md)的实际函数；[W3C Color 4 参考](https://www.w3.org/TR/2026/CRD-css-color-4-20260930/#color-conversion-code)只支持转移函数，没有授权扣背景、改曝光、裁框、羽化、删星或科学亮度解释。本次使用实际密星区域/真实 page Scene，旧六幅夜暮昼对照不重跑。所有原像素/几何和当前2MiB缓存压力保持，没有生成内容或 PSF 工程。

结果封存在 [实际运行](../../../../output/playwright/prepared-ngc6752-composition-1006-q2-r2/composition-result.json)及 [独立计算读回](../../../../output/prepared-ngc6752-composition-readback-1006-q2-r1/result.json)：

| 核实项 | 实际结果与范围 |
| --- | --- |
| 当前编码完整帧 | 与本次实际完成页面、前次 Q1 概览逐像素相同，0差异 |
| 照片前背景 | 两合成版本逐字节相同；实际报告/SAO/视角/时刻未变 |
| JPEG body | 单 OVERVIEW 137,181B，同原 SHA；MEDIUM/DETAIL 不请求 |
| 本次软件页面 | 97次实际 loopback 请求、50次原 page Scene；三次同步对照不计成另一次用户旅程 |
| PNG读回 | 三完整PNG均与各自实际GL RGBA全值相同 |
| 原名义照片范围 | 屏幕内110,478像素；离外沿安全余量外均与去照片反事实精确相同 |
| 四源像素宽内边条 | 3,006像素，仅描述统计；相对同帧背景的RGB绝对差中位由13/10/11变为9/6/5，仍全部有贡献 |
| 原目录点 | 四个SAO对象原身份/位置保持；一个位于名义照片内、三个在外，不据此宣称全图重复星 census或删星依据 |
| 临时背景复制 | 候选一个RGB copy、创建/删除各1；逻辑组件987,480B、RGBA等效1,316,640B，非driver物理峰 |
| 退出 | 活动decode/纹理/buffer模型0；原正式地图Context/选择返回 |

已查看完整 [当前编码](../../../../output/playwright/prepared-ngc6752-composition-1006-q2-r2/encoded-current.png)、[线性候选](../../../../output/playwright/prepared-ngc6752-composition-1006-q2-r2/linear-candidate.png)和 [去照片反事实](../../../../output/playwright/prepared-ngc6752-composition-1006-q2-r2/without-photo.png)。两照片帧的完整矩形/密星断边都 FAILED；去照片后是稀疏目录星场。边条数值下降不是质量通过，有限原观测覆盖仍是实际缺口，不用 viewport 藏边缘或补造外面的恒星。仍不能据此判断所有照片边缘都相同、自动扣除原背景，或保证一般弱结构保真。

线性候选的来源辅助仍沿编码贡献；其机械 Prepared 参与回执不认证新最终颜色参与。此变体退出，不为一个未采用候选扩建来源框架。任何将来采用须让真正最终算子、已绘来源、caption/Back/发布消费者一起通过。

## 失败、来源候选与保留

R1 实际走到概览，但任务侧旧 copy 观察器只核 RGBA，拒绝 RGB，`task_copy_allocation_format_unmeasured`；[R1日志](../tmp/ngc6752-composition-2026-10-06-r1.log)/原脚本/输出保留。R2只另建任务 RGB 逻辑计量观察器，原 observer/product保持。原 alpha:false 的 RGB copy 支持已有实证，本次再次完整采样/删除通过，没有改变生产 Canvas 或重试 SDK。R2没有覆盖失败代次。

作为退出后的输入导航，当前 [CDS SkyMapper DR4 color记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)仍区分 CDS ODbL 数据库及 ANU 原内容权益；本轮元数据读回没有提供新的具体加工内容/商业分发授予。原 [源资格调查](../OPTICAL-DATA-RESEARCH.md)已存的 DataCite CC BY 4.0、SIAP限额/禁止系统抓取、原样本和CDS权益缺口继续保留，不能把新公开记录或科研保护取消当新许可。没有重取 SkyMapper 影像或扩大 SIAP。PS1 官方原始/stack/cutout 与第三方 CDS 成品权益分别核；具体下一由 PLAN 约束，不重新研究旧 exclusions、全库镜像或建通用巡天框架。

仅任务开发对照；styles未合成、受控WEAPP端口/软件GL不证明WXML/真实DevTools/Android/iOS、新版月面、整场交互、绝对配准、物理峰/200DAU容量或修后独审。原112检查/source pins、300文件当前WEAPP构建、既有watch/BFF/IDE未改/未重跑；全部33项整体未验，普通Prepared空。Goal active无预算，无提交推送、迁分支、部署、采购、发布或外联。
