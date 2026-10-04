# 共享有限区间高亮肩部与M82实际候选（2026-10-04，r103）

本代新增Sky共享离线显示owner/test、源许可/修改notice及三个task脚本，更新对应四任务/Context文档；未改其他业务逻辑、未改原科学/当前noise-v2估计、旧recipe/publications或默认调用。普通registry仍空，新候选未被标准publisher/API/page采用。保持原branch/HEAD/原BFF-watch、六保护；未提交、推送、部署、发布、工具重启、手机操作、数据下载或旧科学加工。

## 实现责任与复用

`data-pipelines/deep-sky/optical_display_highlights.py`只负责**已有display pre-RGB的共同高亮范围**，输入finite nonnegative float32/64 channel-first数组，输出float64，科学signed/coverage-alpha/WCS由原owner负责。不是新的噪声恢复、gamma/天文色彩校准、投影或资源框架；其他运行时消费者未接通。

复用前代已固定[Khronos原样例](https://github.com/KhronosGroup/ToneMapping/blob/b5a2eed5ddf6c2227090449399de9c7affb9e4c9/PBR_Neutral/pbrNeutral.glsl)中rational高亮肩部，保原knee=.8-.04=.76，无参数fit/sweep或局部mask。max(pre-RGB)<=knee全域精确保持；以上仅以同一因子缩放三个正通道，最大值连续、同色高亮严格次序、范围<=1。原material/Fresnel偏移和desaturation没有移植，不把Lupton数值假定为物理线性Rec709/sRGB或叫完整官方PBR Neutral。有限区间原值比“零附近导数一样”更直接保护实际弱信号。

源Apache-2.0文本从已保存官方文件逐字节复制，owner有Copyright2024 The Khronos Group、SPDX、修改日期/内容，旁边NOTICE含原commit/源URL/许可声明及适配范围。没有新的外部请求/下载或依赖安装。源说明CC-BY-4.0不作为项目自有说明全文复制；原来源和修改归因保留。

五项owner检查覆盖实际有限弱RGB/原黑色/输入不变、旧归一化同色强度反例、新高亮次序及比值、官方数值/接点连续单位导数、invalid科学shape/dtype/nonfinite、finite大值及不减偏移/混白。全部通过，未因此运行无变化的整个noise/variance/PSF/场景矩阵。新owner只有本代明确candidate消费者，不影响原默认出版。

## 三档完整实际消费

直接使用r102已保存并公式读回的**原冻结**pre-hard-normalization RGB/mean/counts，绝不把被否决的r102 asinh variant当输入。完整源candidate、原consumer、根reader、共享源码与版权许可前后byte绑定。没有重算mean、源noise/variance/coadd/恢复/检测/146剖面或旧窗口fit。源M82科学、noise-v2、原SCI/alpha/WCS/recipe/publication均保持。

OV/MED/DETAIL各512²，有限低亮域250476/217163/129893像素、合计597532个实际RGB完全不变。原max<=.1诊断弱域OV153198/MED12172像素全部不变，DETAIL无此低值域；该诊断值不是质量阈值。原>1归一5080/19783/73804像素的最大通道从单255恢复23/24/24个8bit等级。全部RGB实际改变11012/42440/127082像素、合计180534，通道最大差31，改变仅在高亮压缩域；旧算法保持不变会被真实输出读回检出。

meanRGB原41.8841/30.5972/15.6593、108.0609/77.9205/39.0010、189.3806/130.9011/59.6109，新41.1866/30.1402/15.4457、105.3543/76.1482/38.1769、180.5287/125.1959/57.0764。高亮适当收缩，未出现前代asinh全图下降近一半的现象；不声称整图数值或所有星体亮度都不变。

三完整比较图与全部原20目录星点分四页实际查看。未饱和的139/142/148/177等峰保持；原255星峰变228–240、238变219、247变222、224变214，形态/原坐标保持，此有限consumer不验所有星体、DETAIL中央恒星/PSF或绝对配准。完整M82核心有层次、弱外围/原颜色保，但**绿色条带/颗粒与完整来源保真品质仍未过**；不因范围机制改进而采用或发布。

根saved reader没有导入production owner，不请求HTTP/加工或运行producer：从原已存pre-RGB直接计算公开肩部，验证全部新浮点数量在float64算术界、实际全部RGBA/PNG、低域精确、正通道比例、高亮反函数、最大真实pixel标量；source mean/alpha/crop/WCS及目录坐标逐项保持。因peak+d-k与peak+1-2k重排允许float64算术舍入界，不增加PNG、alpha或低域容差。新三档同固定recipe；不是“不同crop各自fit”。这是自审开发边界，不是独立审查、绝对astrometry/photometry、native/WXML或最终图质。

## 有界资源、保护与后续

实际任务12.014822秒、CPU11.921875秒、offline peak working set107606016B/peak pagefile462798848B；含本机Python导入和旧byte核验，不是手机/native/GPU/端云峰或200DAU。reader .628132秒，峰未测。三新Windows输出目录25文件26587680逻辑B/26636288reported allocationB、25身份/maxlink1、前后稳定；排除后续allocation/doc/log/checkpoint/continuity、旧输出/依赖、FS内部、源码目录中的license副本、Linux真实保留与混合容量。没有无依据填零费用。

486原源码除四授权owner文档之外、9312旧证据/六保护精确。旧r102暗变体仍明确拒绝，旧更早C/(1+maxC)拒绝/实际失败保持，不重跑或倒改。新共享owner无默认消费者，candidate/published/display估计不同事实分别保持。

下一回B剩余绿色条带/颗粒的真实源/恢复关系，优先读现有同坐标native-stage、原SCI/signed display和当前noise-v2的qualified/protected/radius/reached及2RUN/field供给；旧原SCI/native坐标收据可复用，**旧noise资格不得冒当前v2**。不再调亮度曲线企图改变已保比例的颜色，不重复146响应/variance/PSF/源coaddfit或矩阵闭合。区分真实暖色/结构、源背景/跨field差和估计误差，有新机制证据才修改对应共享来源/恢复owner；不得将真实i>r>g星系当背景、局部抠色/alpha藏缺测/生成细节。

完整源、弱结构/背景接缝/覆盖/配准、batch publication与端云成本通过才采用。M51矩形FAILED、W3覆盖、旧strictBack/WXMLFAILED/手机newMoon/真实retention与混合容量、独审MISSING及原33义务仍开，Goal active无预算。

直接输出：`output/sdss-m82-highlight-shoulder-1004-r1/result.json`、`recipe.json`、`candidate.json`、三完整comparison/四目录consumer页；`output/sdss-m82-highlight-readback-1004-r1/result.json`与`allocation-and-observation.json`。仅本代明确离线candidate的新range版本；普通发布与运行时不是这个新图。
