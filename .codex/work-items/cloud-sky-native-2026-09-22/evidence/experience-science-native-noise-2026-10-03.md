# 原生校准帧噪声与重采样相关性

沿唯一PLAN复用真实六字段候选、已独立核对的三带flag-clean小区域与CAS响应，新增原生噪声owner和一条实际小路径。没有新科学源请求、全幅重投影/母图重建、科学值/权重/显示recipe/出版/普通registry修改。增量为源码与有界开发验证；独审MISSING，图质/native/普通采用未通过。

## 依据和职责

[官方模型](https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html)说明：主图已校准且扣sky；HDU1逐列CALIB为已应用的nMgy/count，HDU2的ALLSKY为counts，XINTERP/YINTERP为低分辨率sky插值位置。仅为噪声反算 `DN = science / CALIB + SKY`，随后 `variance = (DN / gain + darkVariance) × CALIB²`，不重新写science/扣sky。gain/darkVariance来自实际字段的相机列号和波段。另见[官方图像说明](https://www.sdss4.org/dr17/imaging/images/)。

本轮只获取17,231B官方HTML/SHA `8e147c6af185a749908fd827a692d868de51df92b7e09c97d678e72dcc884555`，curl HTTPS exit0；科学源请求0。复用已有Astropy8.0.1/NumPy2.5.3，自行实现公式，无新增依赖/复制IDL程序。原CAS响应30,015B/SHA `9b0511b5f9e4f10600a8cb3bb867c866aee90d379eb2bf3406a1555f57f86987`与其RESPONSE_UNVERIFIED receipt保持；新owner只核缓存字节、URL与字段匹配，不冒称独立网络来源认证。

[frame owner](../../../../data-pipelines/deep-sky/sdss_corrected_frame.py)在已准入4-HDU路径保留只读CALIB/ALLSKY/XINTERP/YINTERP，每份实际帧218,948B，不生成全帧noise图，旧receipt-v1保持。[noise owner](../../../../data-pipelines/deep-sky/sdss_frame_noise.py)核CAS CSV绑定、精确字段/band和唯一行、大fieldID字符串、正gain/非负darkVariance。按请求整数native像素取方差；错误field/band拒绝。native或SKY stencil越界、非finite、无效CALIB、负/溢出方差保不可用/NaN，不记零噪声；finite黑/负science本身保持。实际XINTERP低端−.4375，未经核实的边缘外插不猜clamp。坏像素flags、science availability、noise与display alpha仍独立；当前投影/coadd/v3未消费新noise。

## 实际数据结果

[脚本](../scripts/experience-science-native-noise-2026-10-03.py)只查询原 `[1968,2000]` 的33×33patch，两个同run字段各三带。原资格为共同finite、全部10类flag为0、扩展目录椭圆外，仍非完整空天/全场资格。pin原candidate SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`与旧诊断；每份仅1,189–1,191个native像素。六份reader完整receipt与原candidate逐对象相等；按原target factory重新采样的这块数据与原patch逐字节相同。输入/六保护文件before-after SHA不变。

| field/band | native模型σ中位数 | 单帧重采样模型σ中位数 | 原patch实测MAD |
| --- | --- | --- | --- |
| 99/g | .014616 | .009450 | .009175 |
| 99/r | .024047 | .015483 | .014956 |
| 99/i | .043363 | .028241 | .028627 |
| 100/g | .014615 | .009455 | .009338 |
| 100/r | .024139 | .015524 | .015117 |
| 100/i | .043362 | .028194 | .028789 |

单位是nMgy/native-pixel测量量，非统一表面亮度/粗像素总通量。实际gain g/r/i为4.035/4.895/4.76 electrons/count，darkVariance为1.8225/.9025/5.0625 counts²。i带模型噪声明显大于g/r，支持此前局部色底诊断，不证明整幅棕色是假信号。native g带实测MAD约.01096；不把有限样本scatter和公式估计宣称统计一致/全场校准通过。

## 方差与相关性边界

单个插值像素的条件方差要用四个系数的平方加权。若线性插值variance，该patch中位数高估约2.37–2.42倍。但相邻target像素复用native位置，亦不能独立相加。本轮4×4均值显式合并同native位置的系数后平方，相比“单像素方差相加/16²”，条件variance中位数为1.847–1.864倍；两种错误方法mutation均被实际系数/模型检出。

这是native对角噪声模型下的重采样相关性代数，不含sky拟合误差、native额外协方差/系统误差或完整coadd协方差。不能拿它写inverse-variance拼图权重或给弱结构打最终SNR标签。两同run重叠patch的g/r/i Pearson相关.9753/.9904/.9718，不能当两次独立曝光计√2收益。

## 检查与缺口

[回归](../../../../data-pipelines/deep-sky/test_sdss_frame_noise.py)用真实FITS直接HDU/独立双线性计算核公式，覆盖三带真实参数、CALIB0/负/NaN、黑/负science保留、负方差、native/SKY越界、错field/band、非整数位置、缺metadata、坏CSV绑定/重复字段。noise+frame+stencil+gri的38项相关开发检查通过，旧默认显示/单帧与mosaic兼容。首次task HTML guard用了错误的空格/变量拼写，尚未进入科学计算exit1；改为原HTML精确文本后完成，未改生产公式/覆盖旧科学输出。

[result.json](../../../../output/science-native-noise-1003-r1/result.json)136,614B/SHA `eb834a043ca59154a36037816358f8423e0385014f3d5174d1e5751cacfd93e5`保native位置/方差、单帧target方差、块系数计算与输入pin。此自审不替代独审。没有新图像候选/版号；普通Prepared/science仍空，照片矩形FAILED、部分覆盖边界与棕色弱结构未通过。下一项沿实际三带资格/噪声边界选择有依据的共同显示小路径，再核真实弱结构/颜色和失败恢复；不直接把本模型当全幅置信图。实际page来源Back/公共时间/native与必要独审仍保留；唯一顺序由PLAN顶部维护。
