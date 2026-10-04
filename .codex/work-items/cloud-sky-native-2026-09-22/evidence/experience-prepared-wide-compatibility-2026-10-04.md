# 真实对应点与单源线性光合成：不采用候选

2026-10-04，按唯一PLAN的B推进。保持工作区 `E:/dev/worktrees/Starward/remote-main-20260908`、分支 `codex/remote-main-20260908`、HEAD `72e65cf309d700cb7d40c5b7afd53660fd39fa35`；Goal active、无预算。只新增云观星任务脚本/证据并更新归属文档，生产源码、普通registry和其它业务逻辑没有本代变化，不核对旧设计稿。

结论：缓存宽图可以继续研究，但真实对应点不支持通用全图配准/校色。两NOIRLab有明确sRGB ICC，单源线性光合成降低白天接缝却保有夜间矩形，不能解决共享融合，不采用。原照片、坐标、母图/三级、几何alpha及科学UNKNOWN保持。

## 真实对应点与被拒绝的修正

M51直接复用旧Hubble前景星原生坐标和实际RGB证据，只在缓存的Hubble/NOIRLab母图提取原样对应窗。四个点均实际查看，两边同一前景星及周围结构可辨，但PSF、配色、亮核截断和年代差异保持。旧SDSS/historical fit不冒新绝对配准证据。

M82先复用20个既有资格点，完整取样窗筛选未取得点对；这不证明没有星或重叠。后续实际母图提出四点，只两点有完整几何窗且是可辨孤立对应星；北点Hubble分解为近邻双源、NOIRLab混合，排除；东点在Hubble几何支持外，不能把RGB零当有效黑/空白作星测量。完整7组原样接触图（M51四、M82三）已看，自动局部峰只提出候选，不替代身份判定。

使用既有encoded-aperture estimator与similarity helper，固定4/8/12母图像素孔径，保存平移/旋转缩放训练值与逐点留出。没有施加任何源坐标变换。

|对象|8px孔径原名义偏差，近似角秒|平移留出偏差，近似角秒|旋转/缩放留出|
|---|---|---|---|
|M51四点|0.886 / 0.286 / 0.176 / 0.630|1.144 / 0.253 / 0.080 / 0.819|1.178 / 0.508 / 0.860 / 1.029，四点均差于原坐标|
|M82两点|2.973 / 1.196|2.792 / 2.792|两点不足验证旋转/缩放，未作此拟合|

其他两个孔径也未给出统一改善；M51旋转/缩放三种孔径的留出都较差，平移仅部分改善。M51点凸包约96k母图平方像素，仅约占完整2048²场的2.3%，M82只有两点；这些不是全图或绝对天球精度认证。角秒换算用当前母图约0.4″/px的近似尺度，源名义精度/恒星运动仍未知。

[保存测量](../../../../output/prepared-wide-compatibility-1004-r1/result.json)另保真实encoded核/翼/环统计：M51 NOIRLab/Hubble翼RGB比约1.05–1.30、M82约1.54–2.55，且随点/通道变化。核值255仅为编码截断迹象，不冒物理饱和。环内有真实周围图案，不能当blank sky；这些比例不供全局颜色转换或测光校准。不同滤镜的实际颜色含义保留。

## 编码色域与实际边缘

[缓存ICC/边缘事实](../../../../output/prepared-wide-display-inputs-1004-r1/result.json)仅读原JPEG容器/ICC，不解码原JPEG RGB、不下载或重投影：两NOIRLab与M51 Hubble均嵌入3,144B的sRGB IEC61966-2.1 ICC；M82 Hubble没有ICC，保UNKNOWN，不推断其编码。M51 ICC在旧曝光证据已确认，本代复用这一结论；没有重跑旧曝光/feather矩阵。

本代为两新宽图核具体ICC，并读缓存Hubble容器作有无编码声明的对照。相同ICC代表显示编码兼容，不代表不同滤镜/PSF/年代具有相同星系颜色。已有母图/三级在encoded RGB中插值、箱式采样，合成试验不冒称修复了这部分采样。

实际查看原样四个结构窗和完整512²总览：M51北侧伴星系的晕/外围、南侧臂状弱图案和M82两侧可辨喷流/晕状图案均与照片背景共存。结构窗只是可辨显示模式的诊断锚，不是自动科学结构mask、流量或“背景可扣”证明。现裁片边缘的星点和可能弱结构不能自动归为blank sky；现13.653′裁片不作需求上限。

## 当前完整Scene的线性光小样

公式依据已复用的[W3C sRGB转移函数参考](https://www.w3.org/TR/2026/CRD-css-color-4-20260930/#color-conversion-code)。只做单源照片与本帧真实背景的颜色空间合成：源编码RGB解码成线性值，沿现maxRGB显示贡献的数学责任，在线性值合成后再编码。没有曝光、黑点、背景扣除、羽化、换配准/alpha、生成细节或Hubble+NOIRLab混合母图；不是把科研通量等同显示RGB。

两源在当前完整Scene沿原固定辅助策略各做夜/暮光/白天三个新帧。旧encoded参考与baseline全部复用、不重绘；本帧照片提交前GL读回逐字节等于旧baseline。任务esbuild内仅变体化 `sky-artwork-level-composition.ts` 与 `sky-gpu-renderer.ts`，原文件逐字节不动，变体和实际解析缓冲独立封存。2张原总览PNG真实解码，原JPEG RGB解码/天文源请求/重投影均0。

[实际运行](../../../../output/playwright/cloud-sky-prepared-linear-composition-1004-r2/result.json)保存6帧；完整6幅PNG均已查看：

|条件|旧边缘RGB绝对差中位|线性光边缘RGB绝对差中位|实际结论|
|---|---|---|---|
|M82夜|4 / 8 / 10|4 / 6 / 5|方形照片底仍明显|
|M82暮光|4 / 8 / 10|4 / 5 / 4|方形仍可辨|
|M82白天|2 / 1 / 2|0 / 0 / 0|接缝减小，但不代替全条件质量|
|M51夜|2 / 2 / 0|2 / 2 / 0|局部绿雾/照片底仍可辨|
|M51暮光|2 / 2 / 0|2 / 1 / 0|仍不足以闭合背景接续|
|M51白天|1 / 0 / 2|0 / 0 / 0|接缝减小，整体展示仍需正常昼夜政策|

边缘量是旧实际320²照片范围的四像素边条，相对真实baseline，非质量阈值。夜间四个可辨原样模式窗仍有可量化背景差，但显示差中位降低；数值阳性、源字节不变或零背景下256值回程精确，都不能证明全部真实弱结构已经保真。

示例完整帧：[M82夜](../../../../output/playwright/cloud-sky-prepared-linear-composition-1004-r2/m82-noirlab-night.png)、[M51夜](../../../../output/playwright/cloud-sky-prepared-linear-composition-1004-r2/m51-noirlab-night.png)。**图质仍FAILED，不接入普通renderer/registry。** 旧来源辅助仍以encoded贡献计算，已有Prepared机械参与回执不认证此新变体的最终颜色参与或完整可见Sources/Back，后续采用必须覆盖这项真实消费者责任。

## 保存输出读回、资源与失败

[根agent保存输出读回](../../../../output/prepared-wide-compatibility-readback-1004-r2/result.json)核原输入/当前解析源码、ICC事实、对应点平移/null标量、6组GL→PNG全值一致、本帧preblend→旧baseline精确、照片外全帧保持。独立中心相机解析模型与实际软件GPU的p99字节误差为0或1、最大1或2，保GPU highp/插值精度边界；M82白天错Y背景反例提高误差，M51均匀背景不能提供同一反例证明，不混称全帧通过。自审不是独审。

每帧额外一个临时RGB背景copy，按 `390×844×4 = 1,316,640B` RGBA等效模型分层，不推实际driver内存；其创建/删除各1，每帧8个texture objects创建/退休相等、最终0。调试preblend/最终readback CPU数组与默认绘制缓冲另属于诊断，不放入生产缓存预算，也不把逻辑对象数量/分层MAX相加成物理峰。原辅助策略未扩大。WEAPP支持、物理GPU/RSS、最终参与和端云容量没有本代结论。

失败全部保留：

- 初始点对脚本在保存M51原ROI后因NumPy int JSON序列化退出；恢复保存窗，没有重跑旧提取/原加工。M82初恢复尝试的东点缺几何且零正权，拒绝后从已保存窗恢复，不补造星。
- 合成R1从 `alpha:false` 默认RGB帧缓冲尝试RGBA copy失败、0完整帧。[R2格式诊断](../../../../output/playwright/cloud-sky-prepared-linear-composition-1004-r2/copy-capability.json)实际ALPHA_BITS=0，RGBA返回1282、RGB返回0；窄修任务使用RGB copy，未改生产Canvas。
- reader R1错误要求所有白天背景均能区分Y反射；M51照片范围内背景与反射相同，此断言不成立。R1原脚本/输入/失败保留，R2只修reader预期并保此证据缺口，未重跑Scene。

本代九组输出保留逻辑 **22,800,621B**，含失败、原样ROI、ICC、变体/软件GL/PNG与读回，不含任务源码/文档archive；不是全机物理SSD、生产影像库存或公网流量。沿用旧NOIRLab具体权益和完整credit，不新增收费来源/设施或生产资产；无新源请求不等于零工程成本，未记录的Agent工时/端云成本不填零。

[最终范围核验](prepared-wide-compatibility-scope-verification-2026-10-04-r2.json)对照既有491绑定源码、另两实际Prepared owner、六保护文件、原BFF/watch开始时刻、分支/HEAD/暂存，五归属文档修改前原字节封存。R1是本段ICC读取范围文字澄清前的文档snapshot，保留，不替换原检查。该绑定清单不是所有未跟踪路径的完整盘点。只本代task/归属文档；无提交、推送、采购、部署、对外发布或默认采用。

当前唯一下一依赖已写PLAN顶部；本文不另立下一步。旧page组合与本地标准出版证据保持，普通Prepared registry仍空；WXML FAILED_DEVTOOLS、已知图质/旧像素失败、独立审查、Android/iOS/新版月面手机、完整发布/端云混合容量及33项义务继续原状态。Goal未完成。
