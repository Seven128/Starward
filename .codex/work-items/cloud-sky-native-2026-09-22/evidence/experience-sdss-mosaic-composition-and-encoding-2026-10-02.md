# 完整 M51 母图：真实天空组合和编码比较

2026-10-02，root 延续唯一 PLAN 第2步。真实六字段构图与 partial 修复见[owner](experience-sdss-m51-mosaic-2026-10-02.md)、[独立审查](experience-sdss-m51-mosaic-independent-review-2026-10-02.md)。本次固定 r2 完整母图，比较实际天空合成及编码；**颜色、显示混合和编码方案均未采用，没有替换旧产品**。

## 固定输入与实际合成

输入 `output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json` SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`。root 使用[新任务脚本](../scripts/experience-sdss-mosaic-composition-2026-10-02.mts)运行实际生产 camera/projection/scene/WebGL/picking，28个候选条件新绘；18个原 baseline/legacy 条件直接复用[上一实际代次](experience-sdss-candidate-composition-2026-10-02.md)已绑定的 PNG/fullRGBA。

复用前检查 renderer bundle、84个实际源码、原报告/目录/旧清单、所有场景的时刻、太阳高度、目标高度、basis、mode、level、FOV、variant、原 PNG/RGBA bytes/hash完全一致；没有把旧天气/服务或目标验收升级。当前结果 [`result.json`](../../../../output/playwright/cloud-sky-sdss-mosaic-candidate-1002-r2/result.json) SHA `23669070f57b0794eec6589907d3e7fb30be1da53435d75501ab806a3fdf2ae3`，bundle 仍 `f2e7c4eb07059a48961015578bd9cf0267b4602b17e02c792497f48b85a06087`。56个新 artifacts、36个复用 artifacts 逐项保身份；18复用场景明确 `renderedInThisGeneration=false`。

在原太阳高度 +35.4364°/−5.3148°/−31.4456°、目标中心/原相机、FOV0.3°/0.12°/0.05°下比较完整 availability source-over、availability additive、encoded-display contribution source-over；原9个无光学 counterfactual 与9个旧 JPEG保持。另保红光实际不绘照片、仍有目标身份/点选。当前图片预decode，候选注入旁路 v1 API/清单/下载/loader/source UI，不能宣称正式客户端已支持新版本。

全部实际新场景 GL error和退出逻辑 texture/bytes为0，静态逻辑峰值2,080,768B；不是 native/decoded/OS/GPU峰值、冷请求/细化或200DAU容量。原 baseline success 被明示改写，`sceneReportedPaintedImage` 不能当 baseline 实际光学来源；新试验也不认证完整 publication/source-route 链。

root 实际观看完整母图 overview、day-overview contribution 和 night-medium additive：真实北侧/伴星系与连接区域已在来源图，原单field缺片斜边消失；仍有暗棕颜色、绿/橙点和 PSF/细节问题。day contribution没有原大块opaque黑底，但不能因此认证整场质量；正常 opaque source-over 在蓝背景仍有明显有限矩形。additive 不暗化背景是公式结果，不能单独当质量通过。

例如 day-overview 相对同背景的暗化像素：旧JPEG272,706，完整availability source-over272,711，contribution249,714，additive0。统计是counterfactual差异，**不是亮度物理测量、影像完整外围或质量分数**；整个候选颜色/源PSF、不同run相对配准、窗口边界与昼暮夜组合继续开放。

## 相同实际像素的编码试验

[编码脚本](../scripts/experience-sdss-encoding-trial-2026-10-02.py)只读取 r2 hash-bound 六张 PNG，未改 source/science/RGB master。失误的首个编码代次 `output/sdss-m51-encoding-trial-1002-r2/`因相对路径 binding 失败，只有一个文件，不作完整结果；修正 path resolve 后的新 r3保独立身份。[完整 encoding.json](../../../../output/sdss-m51-encoding-trial-1002-r3/encoding.json) SHA `346dd3b478120d357c609f7c3f886de9941cc14a77c6d8b9c4a493d71ca66f1b`，18个编码文件均完整解码/保512²。GPU命令首调用遗漏启动器的bin-name，Node启动前拒绝；随后正确入口运行完整，不存在失败GPU代次被覆盖。

每行是一个**互斥 family 的三档合计**，不是全部发给用户；原availability949,846B、contribution2,069,743B，旧JPEG64,352B。

| family / 编码 | 三档合计 B | RGBA逐值全等 | 最大display premult byte差 | 最大alpha byte差 |
| --- | ---: | --- | ---: | ---: |
| availability / RGBA PNG optimize | 862,098 | 是 | 0 | 0 |
| availability / opaque RGB PNG | 738,236 | 是 | 0 | 0 |
| availability / JPEG88 4:4:4 | 72,880 | 否 | 58 | 0 |
| availability / palette256 PNG | 72,472 | 否 | 29 | 0 |
| contribution / RGBA PNG optimize | 1,983,016 | 是 | 0 | 0 |
| contribution / palette256 PNG | 452,700 | 否 | 59.424 | 59 |

只有在真实源每个alpha都255时才比较RGB/JPEG，未删除任何已有透明度。opaque RGB PNG在本候选把字节减约22.3%，解码成RGBA逐像素不变；无需因此认证PNG native解码峰值/耗时。JPEG/palette的字节更小，但不能据体积采用，尤其contribution palette实际alpha误差59，会改变与明亮背景的混合。上述是编码字节/像素诊断，未在全部真实背景/缩放/粗细过渡及目标平台验其有损影响。

独立实际组合审查还指出粗细替代风险：本task强制 additive 会同时累加 coarse+fine 的同母图信号，亮度alpha的 contribution source-over 也会透出已有coarse贡献。当前v1 opaque细层路径没有由本次改动改变；不能从这些候选的更亮核心宣布显示更好。采用任何新透明/叠加方案前，须在共享progressive owner区分fine实际样本资格与displayalpha，按成功可用fine区域替代粗层，失败/partial保相应粗层，避免重复信号；需检查真正受影响消费者而非只改task截图。

当前优先使用可复用的同母图共同颜色/曝光机制，比较有依据的全局 transfer，再联同粗细单一贡献/失败回退、显示混合、窗口边界和格式作实际画质/字节取舍；不逐档独立拉伸、不逐对象手抠、不中途改已绑定 r2。科学可取/坏像素/显示alpha仍独立。无新 source获取、云发布、采购或手机操作，4GB测试/16GB预期资源、持久缓存、正式版本合同/已绘来源、全部影像/完整旅程与最终验收继续保留。
