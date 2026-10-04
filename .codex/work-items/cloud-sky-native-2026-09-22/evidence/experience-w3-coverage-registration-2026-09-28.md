# C：W3覆盖声明纠正、既有WCS实际绘制及代表目标链

本轮保留原生WEAPP/TWGL/Astronomy Engine、自有BFF与全部已批准商业边界。没有取新月面、改原图、扩大巡天权利、扩目标或重新选型。51个W3目标不是深空需求上限；当前成果也不关闭完整C、地景观感、手机组合/性能或独立审查。

## 结果与证据边界

| 用户结果/责任 | 本轮结果 | 仍未证明 |
| --- | --- | --- |
| 来源如实表达测量覆盖 | 发现出版脚本只做JPEG尺寸/极值检查，却对153张图硬写`validFraction=1`。当前v2改为`null`/`NOT_MEASURED`，资料来源明确不由黑色像素推定缺测或全覆盖 | 没有源有效性mask，不能量科学有效比例、修复缺测或保证图内所有内容有效 |
| 既有来源链接保持可用 | 保存原始v1元数据；同一出版owner只接受当前版或其声明的前版。新旧清单、真实JPEG、错hash拒绝已核；JPEG原像素不变 | 8787当前进程仍在缓存旧v1；本轮未将新源码/隔离HTTP称作该共享进程已更新或云部署 |
| 影像与相机/源几何一致 | 复用既有真实M31 FITS WCS，用独立ICRS轴、实际生产注册/GPU及原始JPEG核5°/2°/1°、相机平面旋转和偏置中心。101个取样点最大每色差<0.5个8bit级，错误原点控制产生明显差异 | 只核该WCS到实际GPU取样的开发机制；不是源天文绝对精度、手机星点重合、其它源/时刻或SDSS亚像素原点认证 |
| 搜索定位后连续观察/返回 | IMGSEP28/9433实际M31午夜、M42次日06:30，各10°→3°→1°可见W3图；M42资料→独立来源→Back保持时间/身份/视场/来源，PNG逐字节相同 | SDK控件读回、native Canvas和模拟器截图；来源叠层的手机可见合成、物理双指和精确配准未验。未从隐藏loader状态宣称三个请求层分别已READY |
| 真实质量/覆盖核查 | 查看全部51×3张原始出版JPEG，所有哈希匹配；M42细图条纹在实际原生Canvas上也明显，M31广角切图有边界 | 原图条纹/拼接差异仍在，来源声明可能保留饱和和探测器伪影；不做猜测性补洞、背景编辑或精度升级，文案不能自动关闭质量义务 |

## 来源覆盖与版本责任

`data-pipelines/deep-sky/publish_allwise_w3.py`的`checked_image`仅验证可解码、尺寸及非恒定显示极值，未取得有效性mask。修前[真实M42 JPEG回归](experience-w3-publisher-before-2026-09-28.log)得到`1 is not None`。新版脚本保留原字节，覆盖为未知；已有同名出版JPEG若变化，拒绝原地覆盖。原v1输入必须完成明确的元数据归档迁移后再生成，当前v2再生成沿用声明的前版，不丢旧offer。

当前原始清单v2为`allwise-w3-deep-sky-publication-v2`，hash `46c520ab6160784c766b057cae5aed4bec1bfd0d7c4f65fc136a30716e7a1462`。前版`2076958a52af3eca6d194b0bd79686ec34c67c6829469d0b26b26b2bc0db3bce`原字节保存到`assets/deep-sky/publications/`。前版的数字1是被纠正的历史声明，保留仅为不可变链接兼容，不能再用来证明源覆盖。当前`DeepSkyImageryService`验证v2未知语义，拒绝在该版本冒填数值；前版读回也检验其清单hash，图片仍按对应清单哈希/字节验证。没有新下载/缓存owner。

修前[服务边界回归](experience-w3-coverage-before-2026-09-28.log)拒绝新未知语义；修后[出版/真实HTTP检查](experience-w3-coverage-checks-2026-09-28.log)覆盖153张新清单图片及前版代表图、未知状态、篡改前版/错误hash与目录独立恢复。[历史offer损坏恢复](experience-w3-history-recovery-checks-2026-09-28.log)进一步核同一owner：前版损坏不移除当前图，恢复原清单后可重新读取，不把失败缓存成永久不可用。[发布器检查](experience-w3-publisher-checks-2026-09-28.log)另核已发布原像素不可原地替换。

## 实际输出与可比配准

[修前原图审计JSON](../../../../output/playwright/cloud-sky-w3-quality-0928/source-audit.json)包含153张原图哈希、亮度与原硬写比例；亮度/黑色统计明确不是coverage。已实际查看[总览](../../../../output/playwright/cloud-sky-w3-quality-0928/overview-contact.png)、[中层](../../../../output/playwright/cloud-sky-w3-quality-0928/medium-contact.png)、[细层](../../../../output/playwright/cloud-sky-w3-quality-0928/detail-contact.png)。全部JPEG为4,302,840源体字节，此本机数据集不等于人均流量、包体或月账单。

M31真实FITSWCS的来源、CRPIX/CDELT和Astropy像素基准沿用`sky-survey-wcs.fixture.json`；没有再次下载/研究同一原点。新[生产GPU核对脚本](../scripts/experience-w3-wcs-webgl-2026-09-28.mts)直接使用共享renderer、注册和相机；期望来自真实header及独立天文轴，不调用注册逆矩阵。普通JPEG的2D原始解码只用作独立双线性颜色期望，没有改图。受控观察者22.6°N/114.5°E/30m，UTC2026-09-28T16:00:00，390×844，投影中心163.8/481.08，源4°/256px。

- 5°/0°：31点，最大每色差0.49956；错误CRPIX129最大117.80。
- 2°/45°相机平面旋转：35点，0.48732；错误原点57.72。
- 1°/−60°：35点，0.49275；错误原点67.85。

[成功日志](experience-w3-wcs-webgl-r3-2026-09-28.log)、[完整数值](../../../../output/playwright/cloud-sky-w3-wcs-0928/result.json)、三张PNG在同目录。无GL错误；SwiftShader/WebGL是开发证据，不是手机性能。初次试验把设备Euler gamma误用为绕目标视线的平面旋转，窄视野离开目标，后两条件0取样；[第一次](experience-w3-wcs-webgl-2026-09-28.log)/[诊断轮](experience-w3-wcs-webgl-r2-2026-09-28.log)保留为探针构造失败。修正只在task脚本，不改生产相机，也不把这两次记作产品缺陷或通过。

M42新独立FITS/JPEG配对尝试按既有出版URL，仅将格式改FITS；[CDS官方API](https://alasky.cds.unistra.fr/hips-image-services/hips2fits)声明两个独立端点。主端点及备用端点各一次25秒有界读超时：[主端点](experience-w3-wcs-source-2026-09-28.log)、[备用](experience-w3-wcs-source-r2-2026-09-28.log)。没有取得可解析新WCS，也没有改源码原点/中心或以未取回样本补宣称；不重复该请求。脚本留[此处](../scripts/experience-w3-wcs-source-2026-09-28.py)。M51原18星CSV限制仍有效，没有再拟合。

## 当前原生代表链

[SDK原生记录](experience-w3-native-2026-09-28.json)及[脚本](../scripts/experience-w3-native-2026-09-28.mjs)操作/截图前后核IMGSEP28、9433和相同项目配置，所有动作经公开控件和Canvas触摸处理。没有私有状态编辑、API/传感器mock。服务仍是8788/pass→原8787/v1缓存；JPEG与新版完全相同。这条链证明当前图片和消费者，不认证新v2来源已在共享运行进程接入。

| 条件 | 图像 |
| --- | --- |
| 示例点UTC16:00/当地次日00:00，M31，地景关，10° | [原生图](experience-w3-m-31-10deg-native-2026-09-28.png) |
| 同条件3° | [原生图](experience-w3-m-31-3deg-native-2026-09-28.png) |
| 同条件1° | [原生图](experience-w3-m-31-1deg-native-2026-09-28.png) |
| 示例点UTC22:30/当地次日06:30，M42，地景关，10° | [原生图](experience-w3-m-42-10deg-native-2026-09-28.png) |
| 同条件3° | [原生图](experience-w3-m-42-3deg-native-2026-09-28.png) |
| 同条件1°，条纹明显 | [原生图](experience-w3-m-42-1deg-native-2026-09-28.png) |

M42来源Back[前](experience-w3-m-42-source-before-native-2026-09-28.png)/[后](experience-w3-m-42-source-after-native-2026-09-28.png)均73,699B，SHA `9b2003be61717fea9ae852c82d6a877146def4722336fb2610a4aa07eefa6e4c`，逐字节相同。SDK的来源文本/身份和Canvas像素分别证明其责任；普通WXML被Canvas覆盖的模拟器限制依旧，不把这组图当手机叠层或随图可见署名验收。

## 编译、实际HTTP与恢复点

API类型检查发现之前地景接口新增后，跨BFF/Mini的SAO绘制测试夹具缺`landscape`；只补未启用返回false，真实SAO点选/资料消费者继续通过。[首轮类型失败](experience-w3-api-typecheck-2026-09-28.log)、[修后](experience-w3-api-typecheck-r2-2026-09-28.log)、[消费者检查](experience-w3-consumer-checks-2026-09-28.log)保留。API发布构建退出0；实际production exports加载先揭示依赖产物缺日月新export，按既有依赖顺序重建coordinate/contracts/astronomy/API后通过，[完整依赖构建](experience-w3-release-dependencies-2026-09-28.log)。没有改这些依赖源码。

[新编译真实HTTP](experience-w3-release-http-2026-09-28.json)通过实际AppModule/Nest/Fastify，临时随机loopback端口，`--conditions=production`、明确`NODE_ENV=test`/LOCAL/MEMORY_TEST、development fixture关闭。当前v2清单180,929B响应体；M31/M42/M101细图新旧hash URL的JPEG逐字节相同；错误hash404；新月面1,595,187B/哈希和SDSS M51独立接口仍可取。[成功日志](experience-w3-release-http-r4-2026-09-28.log)。这不是生产环境容量/部署或8787进程更新；临时服务已close。

首次production exports缺依赖export、第二次Nest隐藏启动失败、第三次定位明确memory runtime未标test，三次均不是通过；日志[1](experience-w3-release-http-2026-09-28.log)/[2](experience-w3-release-http-r2-2026-09-28.log)/[3](experience-w3-release-http-r3-2026-09-28.log)保留。修后explicit test runtime不被称为真实生产鉴权/容量验收。

本轮未改Mini生产源码，未重发新包；当前IMGSEP28仍留原次日06:30/UTC22:30、45°、手动M51、普通DAY、地景/星座开、W3广角关、面板关闭、无mock。8788仍pass/blocked2，全转发；该进程仍必要。8787仍v1缓存，下一API代次须实际读回v2后才认证新来源。Moon新版仍没有手机投递；旧D不升级。独立审查仍未发生。

## 继续顺序

先使后续候选的API出版代次与已验证源码一致，再集中合并候选/资源与目标组合验证；共享运行身份、地点时间及未结工作需要保留。没有必要为v2仅元数据变化单独重建Mini或重做月面、M51细层回归。缺新基准的M42/SDSS细配准和源mask保留未验；源缺陷/清晰度与整体B3/星空体验继续按实际影响排序，不把免责声明或局部图当完成，不反复阻塞在同一次超时/拟合。设备不可用时继续可执行的候选一致性、干净包准备/性能入口与整体质量，不擅自部署或把本地开发证据提升为Android/iOS完成。

唯一PLAN、STATE/INDEX/PROGRESS及既有运行/产品Context已更新。[Context路径/controlling-source校验](experience-w3-context-check-2026-09-28.log)和[diff检查](experience-w3-diff-check-2026-09-28.log)退出0；普通Markdown链接另核存在。上述结构和本人检查不等于独立审查、产品正确或目标验收。分支/HEAD保持codex/remote-main-20260908/7898962b；无提交、推送或云部署，Goal仍active/无预算。
