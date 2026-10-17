# 细视场光学背景与精确恢复（2026-10-09）

本轮修复已采用低分辨率 Mellinger DISPLAY 在小视场退出的问题；不补图像清晰度、科学有效性、绝对配准或区域照片融合验收。完整 Goal active、无预算、未完成，全部 33 项原状态保留。

## 责任与修复

`sky-galactic-band.ts` 原先把 Galactic 示意带的 `(fov-12)/20` 淡出同时用于图像发现与实际 Scene，12°以下背景完全退出。新的 `skyGalacticImageBandAt` 与原示意带共用精确观察帧及太阳暗度；光学全景按夜间暗度在有效视场持续显示，未知 discovery 在冷细视场也可查询，已知旧 2MASS 继续原广角规则。Hook 与 Scene 使用同一 owner；红光、无效/过期报告、页面/Canvas/出版退休及 W3 替换仍由原责任控制。

图像与示意带强度分开，GPU 图像失败时用原视场的 `schematicStrength` 回退，细视场为零；纹理上传或命令提交不冒充已绘来源。原光学 PNG、J2000 纹理轴、IR 专用滤波与所有出版 hash 保持。

实际第一、二次页面发现完整 RGBA 恢复失败。第二次保留完整读回：37 个 RGB 通道各差 1，alpha 不变；较大缓存裁窗和退休后新较小裁窗导致采样舍入不同。`sky-gpu-textures.ts` 增加 `getExactWindow`，全景按既有量化视口裁窗使用一致采样坐标。包含该窗的旧纹理可用相对坐标同步拷贝，无须整图再上传；静止帧复用，失败拷贝保原纹理和原坐标，原普通包含窗复用语义保留。

## 实际证据与限制

当前完整页面：`output/playwright/galactic-scale-lagoon-2026-10-09-r3`，525 前端输入、59 Scene、104 页面 native 请求；真实软件 WebGL/安装的 WEAPP React 桥，原公共进入、M8 搜索、三档及来源返回，DPR2 780×1688，18.14867°/9.07434°/4.08345°。三档均有当前已绘 Mellinger 来源与实际 GPU 轴，光学 IR 滤波为零。

4.08345° 同一完整 Scene 仅移除背景图，实际改变 1,223,011 像素、最大通道差 33；不移除目标照片/星层/其它图层。无背景 SHA `a23215c5dc929ab5ece798dfce508d6ed957fa367849a15a8a8a26a4c437d411` 与上一轮 `derived-regions-2026-10-09-lagoon-r3` 的细档原始完整 RGBA 一致。恢复 SHA `6bf7548270346f9e1e2a040bfcb79b6098a2f4373554aed6b25e4953cf3cafc1` 与本轮之前完整 RGBA 一致。来源 Back 一帧已完成、完整 RGBA 相同，额外 Prepared 影像 body 为零；退出解码引用、source RGBA 等价量和 GPU texture/buffer 模型为零，API/browser 已关闭。并非物理内存、手机或普通全应用容量证明。

当前 23 个相关 owner/边界/恢复检查与 App 实际 TypeScript 5.9.3 通过。新增 Scene 回归先失败 `narrow optical display must reach the actual renderer` 后通过；实际 r1/r2 精确恢复失败保留，r3 修机制后通过。类型检查中一次测试局部推断错误保留并用明确返回类型修复。诊断传输改成逐字节 base64，保持完整 GL/2D/截图前后 RGBA 相等检查，避免数百万 JSON number 对象；不声称产品性能改善。

实际 medium 图已查看：背景有连续低频亮度，但原有限覆盖的照片硬边、源间色彩差、粒度及弱结构/点源质量仍未满足完整要求。M8/M61 等质量队列仍 NEEDS_REPAIR/FAILED；配准 UNVERIFIED、科学 UNKNOWN、真实 WEAPP/Android/iOS、物理峰值与最终独立审查 MISSING。普通 Prepared 空、HiPS 关、v72 保持。0 新模型/PS/源图下载/栅格化/生产图片编码；不提交推送、部署、发布或外联。

下一依赖只见唯一 PLAN：已有 PS 局部恢复成品接现组合 producer/Scene，以及集中真实质量异常和其它电脑原生义务；不无变化重跑加工或闭合矩阵。
