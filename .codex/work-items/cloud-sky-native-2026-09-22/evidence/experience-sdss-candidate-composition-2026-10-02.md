# M51 单 field 候选：真实软件 GPU 背景组合（2026-10-02）

唯一 PLAN 第 2 步的小实证。输入是[一次真实 corrected-frame 获取](experience-sdss-corrected-acquisition-2026-10-02.md)、[当前 r2 source reader](experience-sdss-corrected-frame-2026-10-02.md)、[同母图候选 owner](experience-sdss-gri-tan-candidate-2026-10-02.md)。当前结论：**单 field 不能交付完整范围，默认颜色/背景映射没有采用，未替换旧 SDSS 图片**。本次实际像素用于确定下一依赖，不以矩形少了或渲染成功认证画质。

## 真实产物与代码绑定

运行 `scripts/experience-sdss-candidate-composition-2026-10-02.mts --candidate=output/sdss-gri-tan-candidate-1002/candidate.json`。原报告/目录在 [`output/playwright/cloud-sky-sdss-corrected-candidate-1002-r1/result.json`](../../../../output/playwright/cloud-sky-sdss-corrected-candidate-1002-r1/result.json)，SHA256 `e784cc33e12dc3f24535565701189d371f70335cb1f5257d87158070c450dba9`。当前 production renderer bundle SHA `f2e7c4eb07059a48961015578bd9cf0267b4602b17e02c792497f48b85a06087`，记录实际 84 个渲染源码、候选 JSON/六 PNG、旧 SDSS 清单/三 JPEG、已有绑定天文报告和 BSC 目录的 bytes/SHA。全部 46 PNG/原 RGBA 保存于同目录，各自 hash 在 result 内；不升级之前 41/48/49 场或任何 native/手机代次。

使用生产 `drawSkyScene`、camera/projection、注册/GPU/遮挡/点选；task-only 构造候选 descriptor 并对候选 artwork pass 选择现有 blend 方式。**旁路了当前固定 JPEG v1 的 API/清单/下载/loader/source-route**，不能说普通客户端已支持新产品。所有图像预先 decode，不测 cold download/decode/逐步加载或实际客户端峰值。场景为目标中心的局部星空，关闭地景/辅助线；这些图片不能认证完整页面/WXML、物理手势或全天旅程。

真实 saved report 中选取太阳高度 +35.4364°、−5.3148°、−31.4456°三个时刻；“DAY”是既有普通显示模式，此处昼/暮/夜依据上述真实太阳高度。各时刻在同一真实 M51 朝向比较 FOV 0.3°/0.12°/0.05°：无光学 counterfactual、旧 JPEG、候选 availability-alpha source-over、availability-alpha additive、候选 continuous-display-alpha source-over。另保实际红光条件。当前 shared scene 仍保目标身份和点选。

baseline 把 optical pass 标为 `suppressed` 且返回 success，以保同一对象/label条件；它是明示 counterfactual。result 中 `sceneReportedPaintedImage` 因而可能仍是旧图，这是被改写 success 的 scene 回报，**不是 baseline 实际图像来源**。真实参与 pass 可从 `draws.suppressed`/图片身份读取；本轮不认证新光学 publication 的完整已绘来源链。

## 观察与没有关闭的缺口

根 agent 实际观看原 candidate overview/detail 以及同场 day-overview 旧图/continuous-display-alpha、night-medium 旧图/候选：

- 原单 field 的斜边截掉北侧与伴星系；其 joint science 支持仅全母图 **48.4369%**、中档 **83.3647%**、细档本地 **100%**。细档完整不补全概览。原始帧完整与 target field 齐全是不同事实。
- 旧 JPEG 在蓝天空覆盖成明显有限黑矩形。continuous-display-alpha 降低黑底覆盖，但仍有可见斜边、噪声/色点和未优化的暗棕颜色。additive 不把背景变黑是混合公式的结果，不能据此证明外围、颜色或质量更好。
- 候选一次 Lupton transfer 后各档从相同 master 派生，科学 availability 与 display alpha 独立；这解决处理责任的一致性，**没有自动解决真实曝光/颜色/分辨率、缺帧、源饱和/坏像素和完整配准**。当前默认 transfer 保留为第一代证据，不原地调参数重写。
- 全场 changed/darkened 像素只描述相对同背景 counterfactual 的差异。候选覆盖比旧 JPEG 少，不能拿 darkened 像素减半认证矩形修复或画质进步；公平对照须先有完整源与可比较范围。

46 条件 GL error 0、受控纹理对象退出释放为 0，最高逻辑纹理分配 2,080,768B，仅此 predecoded 局部静态试验。非原生/OS/native/decoded 总资源、真实驱动故障或 200 DAU容量。实际红光不绘候选照片；对应目录目标仍可按既有功能识别/点选。

## 当前依赖

补完整母图须从真实 target TAN 缺口与各 band 源 WCS/stencil 定位需要的 field，复用已取得三文件。一个 target 5×5真实点的 CAS primary-field 查询已返回七个候选 field；25 点/primary ID 只是发现输入，不能认证全像素覆盖。下一有界步骤先取得六个新候选 r 文件供真实几何 set-cover，再给选中的 fields 补 g/i，并最终核每带全 target 像素 union；r 集合不替代 gri 完整性。不要盲猜 field±1、下载全部源库或填缺数据。

完整输入成立后，才按明确 overlap/背景/一次颜色规则在新 generation 验证拼接和三档整场，保来源/科学 mask/display alpha/旧产品兼容。现有所有旧 JPEG/清单/服务保持；native观察链、手机新版月面、总资源/性能/成本和最终完整体验仍开放。
