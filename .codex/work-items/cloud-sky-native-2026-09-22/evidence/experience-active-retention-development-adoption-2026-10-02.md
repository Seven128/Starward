# 当前帧纹理保留：开发采用与目标验收边界

2026-10-02。状态：**开发源码已接入并完成最终源码独审；WEAPP/真机总资源与性能未验**。没有提交、部署、启动新服务、刷新开发器、推手机或重新获取影像。唯一 PLAN 继续管理剩余依赖；本记录不是另一个计划。

## 采用的责任与实证取舍

`sky-gpu-textures.ts` 保护本帧已使用身份及同步 multi-sampler pins；在准备新图时优先释放未使用整图、再释放未使用 partial resident。finish 无条件释放本帧未用身份，保留实际 working set，不累计历次视野。失败身份仍保持零字节 latch，weak native owner 退休、空帧与 dispose 仍释放资源。已有窗口、原像素、copy 回退、shader 和源数据不变。去掉无效 previous-frame Set，并将内部 `byteBudget` 改名 `pressureBytes`；共享常量 `SKY_GPU_TEXTURE_PRESSURE_BYTES` 为16MiB **上传前分配压力目标，非帧后上限**。地景细档仍用同值选级，已需的总览/天体需求可能超过它；未改地景选择结果。

采用理由是已重现旧策略在 stationary 宽场每帧重传可用纹理，而不是只因候选某一项指标好。有限真实正常 Hook 软件 GPU 旅程13条件/双策略，[独立原始像素与账本复核](experience-active-retention-boundary-and-normal-independent-review-2026-10-02.md)核26整幅图、78帧账本、原138源码与既有影像。W3-off139°、W3-on139°、Moon朝向85°的第三帧 source-upload 分别14,155,776/15,204,352/2,621,440B→0。13条件39帧的 source-upload244,121,600→189,333,504B，copy26,566,656B不变，全部输出严格同像素。只是有限已记录场景的逻辑GPU量，不能换算为网络出流量、FPS或200DAU容量。

代价保留：最高帧后持续驻留16,777,216→31,981,568B（约30.5MiB）；两个139°首帧各额外上传8,912,896B，逐场景首帧/转场峰值可能提高。全矩阵最高peak相同不抵消这些差异；31,981,568B不是所有相机/DPR/图层组合上限。没有凭暗淡opacity删图、猜alpha、扩大LOD或虚构有效覆盖来满足内存。Native bitmap、copy同时存量、backbuffer/framebuffer、driver延迟释放及整个小程序总资源仍需目标测量；今后改变源规模、选级或消费方必须重新评估实际 working set。

## 共享边界：root 独立读取 peer 作者证据

peer实际作者最终结果 `output/playwright/cloud-sky-active-retention-boundary-1002-r5/result.json`，410,662B，SHA `b08a200f32713f6dcb45e3c3564fac75faf178ea2bc6bd6a752bb846df2e1a30`。root完整阅读脚本/机制及结果，独立使用 Pillow/numpy 全幅PNG→bottom-upRGBA，并逐identity重算所有texture create/upload/copy/delete/draw账本和pin平衡；没有运行作者的比较函数或新GPU矩阵。

root入口 `scripts/experience-active-retention-boundary-readback-2026-10-02.py`。结果 `output/active-retention-boundary-root-readback-1002-r1/result.json`，18,071B，SHA `1139963a2b9c3a7ae7490ff02b8a5e12581b7b790723314aa2064b32903f5b69`；绑定39,108B，SHA `1414f605f83f85cfbcb23e48d1906aa9e56e84386a5e1477101b09cd2893deca`。56张完整图/48项完整数组比较、15个机制row、作者66输入/119artifact全部字节一致。

实际 coarse/fine、同bitmap两slot、fine失败保coarse且新身份恢复、一次copy失败保whole、ready退休拒绝旧身份、empty-frame和双dispose全0成立。实际桌面 `WEBGL_lose_context` 在copy期间触发，原非空画面与throw/lost/清理成立，loss之后像素不解释。退休fence有界mutant仍绘旧身份，相对正确empty有106,048不同像素、max162，证明oracle能检测失效作用。所有登记coarse/fine/replacement都实际退休。root查看pair和fine-failure PNG，明显矩形/软化保原质量缺陷，像素保持不验收图质。

边界探针显式1B task压力目标，属于机制验证，非生产容量；隔离renderer/受控weak lifetime，不是完整公共文件clear、Taro hide/newCanvas或目标context恢复。正常矩阵的baseline final raw记录缺口仍保留；r5原运行只有2项源码绑定，后补完整bundle AST/原r4冻结138项关联不能追溯成为事前receipt。

## 当前源码与验证

本次GPUowner SHA `a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3`。其行为依据冻结候选 `0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448`，只清理失效Set/局部名称/预算注释；独立最终源码AST核已确认行为等价（归一化仅dead previousFrame/局部及常量名称，canonical SHA `2f87565caeff3266b2f1c7b68965cf90244f41c5efcfdc5d1dbc87ca9b9d7da3`）；其额外weak-current只读调用次数减少，不引入真实所有权副作用。Renderer删除唯一新增注释严格回原`bc0c927...`，landscape反向名称/注释严格回原`674b907...`。这关联此前候选像素证据，不把旧hash改写为新源码事前绑定。

有作用的修前日志 `experience-active-retention-regression-before-2026-10-02.log`：新stationary/current-used与pin回归在原owner上3失败、其他5通过。首轮受影响检查的native-chain仍断言旧frame-end cap而失败，原日志 `experience-active-retention-affected-2026-10-02.log`保留；按新明确责任修正其稳定/转向输出要求，不修改window/shader迎合测试。随后独立责任审计要求普通AB→BC压力释放，已补真实used B/unused A的单条回归。最终源码独审发现原nested检查在inner退出后立即get标used，会漏掉提前解除outer pin的mutation；已补inner退出后的新D allocation，再检查outer未来samplers，正确生产owner未改。最终 `experience-active-retention-affected-r4-2026-10-02.log`19受影响检查通过，包含empty-frame在dispose前0、nested未用sampler保护、异常pin在下一frame压力前释放及actual native-image chain。MiniTSC此前r2退出0，最终nested补强后的 `experience-active-retention-typecheck-r3-2026-10-02.log` 也退出0；不追溯升级旧日志。测试数不代替整场体验、来源质量或目标性能。

[最终源码独立审查](experience-active-texture-retention-adoption-independent-review-2026-10-02.md)及结果 `output/active-retention-adoption-independent-1002-r2/result.json` SHA `6121f6f755abbf33ccebd6450a8583eaa87798bb8e5461bf5d906bc08553f78c`，实际9个最终fixture通过；原cbbe shadow有修前失败，删除current-used guard、empty-frame retirement、nested added-filter、异常finally-release的4个mutant均有真实失败。r1原检测缺口/独审CRLF反向假设错误保历史，r2使用实际LF严格闭合。当前GPUtest SHA `d30d8b0d75f791d9e61ec0436447027ae2d57c6bdd33c4a3b713e12c952dc946`，281公共资产文件/6保留修改保持。

[独立采用责任审计](experience-active-retention-adoption-owner-audit-2026-10-02.md)核实际wanted/source-resolution/scene/lifecycle：没有累计历史集合机制，当前星座85个identity/43MiB全库存只是有限包络，无28同帧硬cap；W3与银河互斥，body/SDSS/selected/fallback组合仍须实测，31.98MiB不升级为全局上限。连续转向/SDSS/selected/隐藏与新Canvas总资源旅程及端云mixed-business容量后续依唯一PLAN。WXML已知FAILED_DEVTOOLS、新版月面未推手机、Android/iOS/物理内存/帧时/包体/成本/完整33项义务全部保留。Goal active、无预算、未完成。
