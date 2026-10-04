# 共享影像资格／贡献回执：有限开发闭合

2026-10-02。Goal active、无预算、未完成；当前分支与六项 Settings/outbox 保留修改不变。此记录闭合 opt-in renderer owner 的开发责任，不采用普通 science-v2 场景、候选画质、原生资源预算或最终验收。

## 源码与责任

- [shared contract/factory](../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts)：资格为 selected fine/coarse/any 的 HAS／EMPTY／UNKNOWN；photo 为 POSITIVE／UNKNOWN，completed 与 draw 对象身份独立。默认 display fragment 与原实际 shader 字节相同；新输出 R/G 为 fine/coarse `maxRGB*opacity`，B/A 为各 selected slot 的二元资格。
- [GPU owner](../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts) 当前 SHA `87467f231b709599befc57113e30d4c69c3d34d8782a95c1ecdeb2505b61c4dc`：默认不分配；捕获调用方预算值、按实际 drawingBuffer 与 ceil/MAX 全链计算；同尺寸 pool 与单共享 scratch 复用，组数及总逻辑 RGBA8 字节受限。预算与现有 source-image 16MiB allocation pressure 分开；并非总 GPU／手机 RAM 上限。
- [renderer](../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts)：在 image pin 内以实际已准备纹理/window、uniform、VBO 执行 signal；每次后续普通 submit 即时 replay 当前 shader alpha／destination factor。新 group 先衰减旧 group，自身再捕获；ONE 保留，ONE_MINUS_SRC_ALPHA/ZERO 作用于 R/G，资格不随遮挡消失。finish 的 pending points/lines 与真实导航 scissor clear 先执行，普通 GL/context 成功后才冻结 receipt。
- 辅助 setup/编译/FBO/读回失败清理并 latch，保普通独立绘制，仅 explicit reset 重试。正常 draw 的既有 GL error 不由辅助路径吞掉。begin／reset／dispose 退休旧 ticket；完成后两 getter 仍检查当前 context/尺寸，晚期 loss latch，resize 退休但允许新 begin 按原预算恢复；foreign／disabled／retired 查询无 GL。

资格是 **实际 prepared draw 的 selected samples**，不能替代源覆盖／所有期待字段已准备的事实。某个未准备槽被 shader 排除，不认证原字段缺测；未来 whole-cutout W3 EMPTY 许可必须同时核期待字段、配准和 prepare 状态。有效黑色仍合格并排除 coarse/W3，photo 零仍 UNKNOWN。positive 是未钳位加权分量参与，不证明饱和后的反事实最终颜色差。

## 实际开发证据

- [一次实际 16 条软件 GPU 条件](../../../../output/playwright/cloud-sky-contribution-receipt-1002-r1/result.json)，SHA `509cb3ef5e67e6d7244d42eb7cd8d2bb341f6ad2599c0a7c0ef911cf5d8ab164`，执行历史 owner `2182203f…`。实际细/粗黑色、partial alpha、完整 EMPTY、多组覆盖、拒绝第二 probe 仍遮挡第一、默认禁用、预算拒绝、受控 compile/FBO 故障及 reset、正常 GL error、loss-before-finish 均保存。五组普通 full49,152 B、high-DPR full11,849,760 B 输出与 disabled 相同。初次 target/部分 chain 故障属受控 API 边界，不是实测驱动 OOM。
- 1170×2532 实际单组 auxiliary **15,803,512 B**，source resident557,056 B，合计逻辑纹理 peak **16,360,568 B**；96×128 单组65,540 B。正常每组有资格与完成两次同步 one-pixel read，多个 group 额外增长。未测 native 帧时、物理 RAM、完整场景峰值或容量，不能把 one-pixel 读回称为便宜。默认没有任何 auxiliary read/allocation。
- [预算真实修前反例](../../../../output/contribution-budget-regression-1002-r1/result.json)，SHA `75d4fa43b9f09a46813588d5bbf7bf036e6d8c16da3b7e154e4ffad17dfe4094`：caller95 B→96 B 后旧 owner 错进 setup；同一加强观察测试 before FAIL2读／current PASS1预检。原 mock 可吞 setup 异常伪过，已补观察。仅 Node/mock 资源边界，不是 GPU。
- unused-attribute MAX 防护已补全 enable 恢复。保存的修前 GPU witness **beforeFailed=false**，当前 positive；软件 GPU 未复现此前 Android 风险，保留负诊断，不写 fail-before。
- [独审 getter 修前反例](../../../../output/contribution-getter-lifetime-independent-1002-r1/result.json)，SHA `e0baf17fd699480fb52d60090b0d6e229ad42770e895ece76b9c6b483e8805ab`，证明完成后 loss/resize 仍返回 positive；固定 readback `[10,0,255,0]` 的实际 owner API 执行，不是像素。当前同一反例撤销。新 owner 相对218仅增加 currentEntry gate／替换两 getter，其余 emitted JS 同一。
- [实际新生命周期 r1](../../../../output/playwright/cloud-sky-contribution-lifetime-1002-r1/result.json) **整体 FAIL** 保留。仅 root 验证脚本误把 image normalized-UV 变换当源像素缩放，实际画了极小矩形，positive 正确。其晚期真实 loss/getter、resize/新 begin、辅助读回故障/停止自动重试/reset/恢复均已通过，base 与 read-fault full49,152 B 相同。修 script 为 `[96,0,0,128,48,64]` 后，[r2 只重测 postdraw](../../../../output/playwright/cloud-sky-contribution-lifetime-1002-r2/result.json)，SHA `27d1895596f8512ee8cda623e5e5a5a158f9bf898a89d3fc3fc52ab9b19a1c71`；全 white＋实际 top8 导航像素逐字节核对，后续 draw 撤销完成态，二次 finish 为 HAS／photo UNKNOWN。没有重跑 r1 其他已通过项或旧16条件。
- Root 先做 affected texture/lifecycle/contract 检查，getter 修后只做 owner5检查及 app TS5.9.3；[保存回执](../../../../output/contribution-receipt-root-readback-1002-r1/checks.json)。[root 只读汇合](../../../../output/contribution-receipt-root-readback-1002-r1/result.json) SHA `7503c86c97de3fe00871acec1b2470a1dd8f9676ad474fee298e2be438490a91`：80历史输入／当前唯一 getter delta、原 display shader、full像素、账本、预算反例、六保留修改及已存在 watch emission 均核实。bundle当前 getter/renderer marker 与 mtime 已核；无新 watch／IDE 启动。当前 chat app terminal 未附，PID、IDE/WXML/native/clean candidate 不由此认证。

## 独立审查与当前剩余依赖

[独审原文](experience-contribution-receipt-independent-review-2026-10-02.md)，SHA `929103d47dade43797a27d65aac59e4323b84cf86b12b887a4e4e0cafcb4d765`；[独审 closure](../../../../output/contribution-receipt-independent-closure-1002-r1/result.json)，SHA `3172c3835a8a166f8a28bb6e6bfa90e74abbdf0eac86e812bc43e90b42773162`。完整 PNG/raw、实际 resource identity、31 current＋2 before state pairs、新 getter 修前／修后与生命周期输出独立核对；其首次 state selector 选0项的 reader r1 未升级，r2 修选择且非空重读，无 GPU。新 private signal／中间 MAX 全平面未导出，setter/native sampler/uniform/VBO 数值未额外保存；same prepared 是源码 join，不能宣称新通道任意输入 byteexact 或 native 性能。旧 FBO 完整 signal 证据保历史条件与旧布局。

下一依赖是 normal consumer，导航见[只读 consumer 设计](experience-sdss-science-consumer-design-2026-10-02.md)：明确 caller auxiliary policy／实测成本，whole-cutout 光学/W3 选择、actual primary/parent→fine/coarse 映射及不可变完成 fields[]，同步迁移 modal/status/recovery/cues/sameScene/picking。没有 science intent 保 legacy；明确全 optical group 未提交的 unavailable alternative 可保独立 W3；submitted UNKNOWN 不授权在其上回填；HAS（包括 black）阻 W3，只有完整期待 ready 槽配准/prepare 且实测 EMPTY 才许可 whole W3。晚遮挡只撤 photo credit，不反向选择 W3。

Caller 的下一有限开发范围已核定，依据[只读预算/成本边界](experience-science-caller-auxiliary-policy-2026-10-02.md)：只通过实际 Scene 与同一个既有 renderer/receipt 显式注入当前 admitted test publication；单个选中目标的 primary/parent 合为一组，`maxGroups=1`。任务输入须冻结真实 backing pixels/DPR、完整 signal/MAX 链字节和固定独立上限；尺寸增大按原上限拒绝为 UNKNOWN，不自动加预算或降低证明分辨率。source16MiB、encoded32MiB、服务器内存都不转作辅助/native预算。普通页面继续默认不传；这一决定允许继续真实代码路径的开发接入，不采用任何手机预算、候选画质或正常发布。全场 replay、同步读回及共同 pre-aid 决策的增加成本必须单列，不能把小结果或 allocation 复用称为低成本。

Canvas aid 在 finish 前、DOM name 在完成后，不能用最后 receipt 反推之前 alpha；同帧 aid 决策责任及自然淡化／恢复义务必须保留。当前 catalog aid、局部图、源码功能及 default-disabled 都不代替完整体验。普通 science 注册/发布、candidate质量、全部目标交互、WEAPP/WXML、Android/iOS、新月面、总资源/混合业务200DAU容量、官方包体/成本与最终独审仍开放。

后续[只读 aid 独审](experience-pre-aid-readability-design-independent-2026-10-02.md)（SHA `4682915962d853d44038326c972f644c46477a2b9df5e8d1f248a2e54671c3d8`）进一步确认：global fine/coarse positive 只认证来源分量参与，不能替代 catalog 天体 footprint 的局部可辨认度。有效黑细层核心与正粗层外围可以同时成立；全局 OR positive、HAS 或新点中心亮度代理都不闭合自然淡化。最小 observed-photo API 只解决同帧因果时序：在 deep-sky aid loop 前 assert/flush/observe/assert 一次，不调用 finish/nav/texture.finish、不在各 aid 后重取；按实际 signal revision 缓存，后续 draw/clear 与生命周期使缓存失效，UNKNOWN 不改成 NONE。冻结真正采用的同一个 ref/view/frame/native-generation/opacity 决策给 Canvas 与 accepted-completion DOM；后续 terrain/nav 只更新 final source，不能倒推先前 alpha。失效时也须推动实际重绘，DOM 单独恢复而旧 Canvas 仍淡出不认证同帧修复。局部可辨认判定仍未实现或采用，本轮不扩 observation API、重跑 GPU 或以持续保留 aid 代替完整交付。
