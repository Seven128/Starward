# SDSS9区域原成品退出；独立恢复链继续

当前8°区域原样配置退出，未出版、改产品、构建或运行新page/Scene。八张order3 JPEG共923,498B，全HTTP200、完整RGB 512×512解码且全图目视；科学支持和实际8°光栅仍UNKNOWN/UNVERIFIED。不是否决全部SDSS原数据、配色、区域或更细层阶。

复用前轮已封存实际公共M51相机/现选择器，格[166,167,169,171,172,173,174,178]，无新方向/盲目扩阶。前轮order1九图、空间MOC及其语义/视口覆盖结果保持原字节，没有重取。8°名义MOC全部329,160像素中心在内，不代替真实像素/科学mask。此轮格167/171/173明显重复蓝紫及多色条带，174有窄红拖迹；其余格有较完整暗场，未见前轮大片黑缺口。没有缺口不消除图质反例。编码黑/白只记编码，无alpha、抠黑、PSF、补洞或生成。output/sdss9-region-source-1006-q1-r1保存原图/headers/请求/SHA，output/sdss9-region-inspection-1006-q1-r1保存解码/逐图观察和决定。

## 有依据的另一成品对照仍未取得

CDS具体properties明确其g/r/i对数显示和cuts不同于原SLOAN成品；[SDSS官方JPEG流程](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/)说明SkyServer先生成i-r-g三色JPEG和多级图再拼接。此次[官方API页](https://skyserver.sdss.org/dr18/en/help/docs/api.aspx)可读，确认中心ra/dec、arcsec/pixel、尺寸和可选overlay接口。沿已保留DR17普通M51清单的同中心/端点，只提出一张1024×1024、28.125arcsec/pixel、无overlay、名义线性8°对照；这不宣称精确TAN/完整footprint或复用CDS MOC为其科学mask。旧三档M51及六目标原JPEG不重取、不改普通发布。SDSS内容政策和CDS ODbL数据库权仍分开。

本机curl/Schannel在第一份官方说明页读取时握手失败（35），因此r1没有图像请求；失败request/log/output保留。网页工具成功读取的说明不冒本机HTTP成功。仅换TLS实现：Python标准验证上下文保完整证书/hostname验证，一次实际图像请求返回HTTP503，图像0，未得到质量结论。output/sdss-skyserver-region-comparator-1006-q1-r1/r2及对应日志保失败原文；不拿503当图质否决、不禁用TLS、不循环重试、不发起外联。候选和服务状态留未验；当前没有以这份未得像素的图建立合同或新消费者。

## 可独立推进的未闭合机制

下一唯一依赖：R1现有HiPS Source Back恢复缺口：SDSS9原样order3八图923,498B仍有彩条，8°配置已在原图阶段退出；官方SkyServer不同配色8°对照单次图像请求503、像素0，候选保未验且不盲重试。下一先复用output/playwright/ps1-wide-region-native-page-1006-q1-r2既有实际page/Scene的Source Back三null/八partial/1149.4ms、12原本地图像body及同相机终态差0证据，沿现Hook/native-image/公共文件缓存/Canvas与来源route hide/show查生命周期和有效缓存为何重取；区分解码退休、encoded命中/淘汰、请求及已绘资格，不先扩20MiB或加框架。证实原因才用最简单有界原owner修复，并以未闭合的实际消费者/整场驻留-临时峰-最终退休比较；普通registry空/HiPS关，TRIAL图质失败不影响运行机制取证，也不冒生产采用。Q1对照及P1独立保留，无新服务/控制面原因不循环请求/SDK；广角与区域合格供给、科学UNKNOWN、完整图质/Android-iOS/月面/容量/公开合规/独审和33项不缩减。Mellinger只守银河DISPLAY、旧粗Legacy/ESO直接UV/受保护Risinger及排除源不重开。Goal active无预算，不提交推送采购部署外联。

已有实际PS1 Source Back完成帧的三null/八partial、至完整名义供给1149.4ms与12原本地图像body仍是未闭合证据；回到同相机终态差0和最终退休通过不证明中途连续。保源原样，不因图质失败丢掉有效机制取证，也不将该TRIAL输入普通采用。先读实际Hook/文件cache/Canvas/来源route生命周期和既有时间线，再按证据选原owner修复；沿现有20MiB压力比较同时驻留/临时峰与退休，不盲目扩大。Q1官方不同配色对照与P1不是被所有优化串行锁住，但本次已确证对照HTTP503，无新状态不再重复请求；DevTools无新控制面根因也不循环SDK。

初次任务检查将保护清单的缺省bytes与实长比较，导致任务检查器失败，随后fetch脚本尚不存在而未发请求；修正optional bytes检查后全部52源码/300 WEAPP/10文档/6保护项SHA匹配。失败日志和说明在tmp/sdss9-region-download-2026-10-06.log与sdss9-region-current-inputs-2026-10-06.json，不冒业务文件改变。

完整广角/区域供给、33项验收、真实WEAPP/Android-iOS/新版月面、科学支持/绝对配准、公开合规、全应用物理资源及200DAU容量、独审均未完成。普通Prepared空/HiPS关闭；原watch/BFF/IDE及原成果保留，无提交推送采购部署外联。Goal active无预算。
