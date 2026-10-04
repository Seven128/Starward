# M82实际条带、SKY端点与RGB动态范围因果（2026-10-04）

本轮仅新增云观星任务诊断、一次有依据的显示试验和对应文档；没有改生产代码、其他业务、原候选/registry或服务watch。r90的409源码/6603证据及六保护基线在文档修改前逐项相同。源获取0；读取缓存原帧不代表重新获取。全域科学coadd/filter、variance、检测、原native fit、146响应/profile、孔径选择均未重跑。图质未验收，普通Prepared仍空，独审MISSING。

## 实际定位

先查看原科学/当前完整三级，再用已存全域q/protected/radius/affected及六field权重的真实OV面积分数地图定位，不用阈值掩盖细线，不将诊断归约作为新科学母图。随后四128²同域局部消费新条带责任：

| 区域（x/y exclusive） | 当前无资格 | 原native reject仍未供 | 无reject噪声未知 | 保强 |
|---|---:|---:|---:|---:|
| outer [384,128,512,256] |1430|821|609|303|
| upper [1152,640,1280,768] |1430|872|558|12086|
| lower galaxy [1152,1152,1280,1280] |1053|1053|0|15331|
| warm core [960,960,1088,1088] |444|444|0|15940|

原12个active field-band缓存帧在本次r2消费者内读取，21个field-band-region窗口逐点native映射与保存field science精确。另序scalar读回实际245564 stencil位置的四原native值/原native flags联合精确。被拒线有INTERP，lower galaxy还包括原SATUR和CR；warm core仅g INTERP，native列1638/1639、1660/1661，并非笼统宣称整个中央饱和。地图中细线不是统一field外轮廓。原finite science不被flags改为缺测；显示原回退保留，所有当前无资格三通道=current原SCI。

两个无reject缺口（609/558目标）均是4264/5/262-i与261-i原CCD列2043–2047：已保留SKY网格shape192×256，对应x254.9375..255.4375，四邻要求x<255。只为这个新消费者评价4668个实际native noise样本（各字段unique787/735）；其科学值全部有限，4094 native SKY stencil无完整邻点，每个目标至少一邻点缺。gain4.64/darkVariance7.84按原相机读取。显式原网格边界与noise owner的sky_geometry逐点相同。不能把这解释为科学零、零噪声或允许clamp/extrapolation/第二次扣sky，也不把unknown转为known坏供样去替换SCI。其他RUN的已知坏flag恢复资格和无供样保原继续有效。

## 暖色与弱层次

两个中央窗口全部三带SCI/current相同，逐级真实OV/MED/DETAIL也相同；所有样本正值，既有保护规则没有改变它们。warm core均值g/r/i为2.235623/6.902690/11.025944 nMgy，lower galaxy .252662/.569659/.927925，本来i>r>g映射为暖色；没有证据将这些galaxy信号认作背景扣掉。

原冻结Astropy8.0.1 Lupton stretch .2358548697680099/Q8/min0仍保留。原mean-before-display消费共9个有效局部LOD，所有science/current RGB逐点等于原PNG裁片，无重新统计拟合。查看实际库实现：maxRGB>1时三通道共同除maxRGB，此分支同色共同强度变化被归一化抹平。warm core OV/MED/DETAIL分别998/3995/15992像素处于该分支（各1024/4096/16384），原maxRGB范围约.934..1.870/.925..1.936/.895..1.979，归一化子集最大8bit通道仅一个值255。外围没有这种大范围饱和，不能把中央原因推广到全部外围缺陷。

## 一次有依据的局部显示试验

复用保存的冻结Astropy非负pre-normalization RGB，只试一次全局一致`C/(1+max(C))`，没有局部调参/扫参数/sky减法/滤波/新mask/生成式数据。借鉴[Reinhard等原论文式3](https://www-old.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf)的全局`L/(1+L)`压缩概念；这里以max channel替代luminance以保持共同RGB比例，并非完整原论文曝光/局部算法，没有复制其文章、代码或图。实际显示候选权利/质量采用仍未声明。

回归以两组同色亮度证明原硬归一化失败而新试验保亮度顺序，并核正域范围/色比/zero和invalid输入。实际同warm core饱和子集最大通道恢复40/42/43个8bit值、没有255；lower galaxy同子集5/9/15。四个实际三级试验页全部查看：中央层次保留更多、整体明显变暗，暖色、粒状背景和处理斜线仍存在。局部层级数、变暗或无255不是图质验收、noise置信度、科学有效性或出版准入，下一须完整三级/弱外围/星体/跨级实际消费者，决定是否加入明确版本化共享显示变体。

## 失败、资源和范围

r1新诊断在原帧循环后误断言protected=current最初SCI，在有other-scan供样处失败；原执行脚本和failed状态保留。r2只修task口径：protected=current恢复raw cohort，无供样protected=current原SCI。因为r1未保存内存局部值，修新诊断所需缓存native读取重执行；不是旧native fit/variance/科学coadd矩阵重做。r2生成15.067508s/CPU15.015625s，reader2.262530s、trial .190553s；进程峰未测。地图8.237223s。r1没有成功耗时/峰记录，不倒填。

新五目录53个文件（含执行close、含原失败，measurement/docs/cp不在本次测量）逻辑25945816B，Windows reported allocation26059072B，53不同ID/maxlink1，两次稳定。这不是Linux真实retention、整个链磁盘/内存、client/server峰或200DAU混合容量。未删除任何资源。

原33C/I/D/K/V义务和C08商业排除、M51矩形/W3暗区/strict SourcesBack失败25个RGB channel delta1、DevTools WXML失败、Android/iOS与新版Moon手机证据、实际静态保留与全小程序200DAU容量/成本/独审均保持。

直接输出：`output/sdss-m82-visible-structure-1004-r1/result.json`、`output/sdss-m82-visible-native-display-1004-r1/failed.json`、`output/sdss-m82-visible-native-display-1004-r2/result.json`、`output/sdss-m82-visible-causes-readback-1004-r1/result.json`与`allocation-and-observation.json`、`output/sdss-m82-smooth-range-trial-1004-r1/result.json`。源码与实际各页均在同目录的executed副本/PNG；原科学/候选字节保持。
