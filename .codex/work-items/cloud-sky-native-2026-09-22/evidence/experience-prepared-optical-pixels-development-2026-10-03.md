# Prepared 真实 PNG / 当前软件 Scene 像素（2026-10-03）

技术路径通过，整体图质未通过。Root 已实际查看 overview 和 rotated DETAIL+MEDIUM 的本代 PNG：较细档可显示真实源结构，但 overview 仍明显带原照片矩形/背景接缝。它是普通采用前必须解决的共享显示质量问题，不能因脚本通过、局部更清晰或透明缺口正确而验收。Prepared ordinary/default 仍未启用。

## 实际路径与绑定

[像素 R4](../../../../output/playwright/cloud-sky-prepared-optical-pixels-1003-r4/result.json) 6,988 B / SHA `cd0871213b33b5a4de5b1b97b3d864e1513903e528801e432b1e603d0806db11`，实际 cached Playwright/Chromium SwiftShader、App TS5.9.3 已知编译器身份。R4 三个原 PNG 的 byte/hash/manifest admission 后 browser decode；没有原 JPEG/FITS 下载、decode 或重投影，也没有服务/IDE/手机。控制 report 的星表/deep catalog 明确 unavailable，固定矩阵/相机/视口；不是完整页面、真实地点姿态、物理精度或目标平台。

当前完整 Scene/GPU bundle 2,084,184 B / SHA `aa8e41c87abf7e311859e090f2eed447358ee1dba3a97ef641218e940aa7e8dd`。esbuild 每份实际解析 buffer 绑定 97 项，`parsed-inputs.json` 17,451 B / SHA `b5279dfda961db33ed231bcecabb77413906fee0ab4cf9bc346b12f6b8cb1c8b`，同 buffer 交解析器并末次重新核 exact；额外 15 输入包括 source/publication、runtime/executable 和 6 保留项，inventory SHA `9a528452e4c0e9d24939ed4f9037bcc081622a67bb74cc09568220e4641f7ce6`。不是完整 vendor 模块装载/干净候选闭包。执行脚本 13,850 B / SHA `9177e28befcc169eb902beed13f2e7725de0d1f3fb0511595baa7d8dfa0a294b`，entry/bundle/PNG/whole RGBA/background/实际 summary 均保存本代。

六个候选帧各有同条件无图背景：overview、MEDIUM+OVERVIEW、旋转 DETAIL+MEDIUM、fine 退休留 MEDIUM、同视角 MEDIUM-only、wrong-family port。像素 delta 分别 85,785 / 282,805 / 329,160 / 329,160 / 329,160 / 0。fine 退休帧与独立 MEDIUM-only 的整幅 390×844 RGBA exact；wrong-family 整幅无作用。每帧 GL error0、当前 renderer dispose 后被记录 texture object0；这只证明所跟踪的软件对象 release，不证明 native GC、全部 GPU 资源、总内存或帧时。原纹理/encoded cache 预算未更改。

## 来源参与与质量边界

默认未提供 `artworkContributions` 分配政策时，真实 GPU getter 返回 `completed:false` 的 UNKNOWN receipt，因此全部光学 completion 均 null。实际照片像素存在不能制造 completed/live photo credit。此前 controlled surface 的完成来源检查仍有效，但不能被描述成默认 GPU 已能提供相同 receipt。普通采用的完整署名与参与资源成本需要共同完成，不能先启用图片再隐藏 credit。

geometric source alpha 只表离散几何支持。矩形背景问题属于 display presentation；不能通过改成 science availability、把真实黑/暗像素当 missing、逐天体手抠或 AI 补造细节处理。需要共用源母图/显示责任的背景及有限边缘方案，保持真缺口、fine-before-coarse 与 source/colour/修改披露。颜色、PSF、publisher 约5″物理精度、全场注册及全对象质量仍待验。

R1 为 esbuild filter 的 JS `/u` 不能交 Go 正则解析，发生在 browser 前；旧脚本/失败回执保留。R2 错猜无观测预算时仍有 completed receipt；实际 getter不完整，修的是控制期望。R3 把 device gamma 误当 screen roll，转移 forward 后 DETAIL 正确离开视野；仅前两帧有保存像素，整代 FAILED。R4 用保持 forward 的明确刚体屏幕旋转，保真实无 credit 断言，完成所有六例。全部失败保原条件，没有升级为产品缺陷或成功。

[Scene 独审](experience-prepared-optical-scene-independent-review-2026-10-03.md)只关闭该源码/受控消费者边界。[独立完整读回](experience-prepared-optical-pixels-independent-review-2026-10-03.md)已收口：note SHA `64407e41b4b4dff69d15ae3a4b9990ce66f3e85f5aab98c1c33cb65f2518b9f8`，独立结果 SHA `14e0f0661ce52e903d52d9f125b74df02db5d7a45791de1700552c180654776e`。六个PNG由独立CRC/zlib/filter解码并与全RGBA精确相等；DETAIL相较同视角MEDIUM-only确实改变186,096像素。149项输入在Root末次读回均exact，未重跑GPU；纹理handle计数仍不能代替完整资源账本。当前唯一下一依赖见 [PLAN](../PLAN.md)，完整图质/native/可见 credit/default/总资源/200DAU 混合容量与原全部交付仍开放。
