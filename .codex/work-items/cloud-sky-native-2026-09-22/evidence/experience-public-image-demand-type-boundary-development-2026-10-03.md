# 公共影像 demand 的纯类型边界

2026-10-03，本轮只调整共享接口归属。纯 `deep-sky-image-request.ts` 原从微信 `sky-public-image-runtime.ts` 获取 `SkyPublicImageDemand` 类型；Scene 的 Node 消费者因此把 Taro 平台模块及 ambient timer 声明带入 worker 编译图。原真实完整 worker 的七条诊断不是七项 worker 业务修复需求。

唯一接口定义现在归既有 `sky-public-image-cache.ts` 契约，与 lease/acquisition 同层。微信 runtime 继续提供实际 acquisition/epoch-retirement，实现该契约并 type re-export 保兼容；纯请求直接读 cache 契约。三个文件精确采用已独审候选，没有添加全局声明、调整 compiler lib、压制错误、改 worker 业务或改缓存/取消/预算行为。[独立审查](experience-public-image-demand-type-boundary-independent-review-2026-10-03.md)读取实际消费者、候选、诊断和源码；它未代替实施后的实际检查。

只读前置实验 `output/public-image-demand-type-boundary-probe-1003-r1/result.json`，SHA `2496e699c5b05b4c918698e656c8e5d69c55bb2737e27a63e12b5819a51e9140`：实际 worker TypeScript 5.9.3 compiler-host 原七条、内存候选零条，1,733 个实际编译源及列明工具输入读前后相同。三个文件按声明的 ESNext/ES2022/removeComments 转译生成完全相同的 JavaScript。原结果当时仍未采纳，保存候选及原失败；该次 inventory 没有 Node executable，不能补写为当时已绑定。

实施后实际命令回执、日志、原源码、精确候选身份、Node v24.16.0 executable 和 1,748 项读前后绑定保存于 `output/public-image-demand-type-boundary-fix-1003-r1/result.json`，SHA `feb66b5073ba0da390f2c712c7440e47203ca0d074761fce8363821275656c88`。此 inventory 是原诊断编译图加明确的工具/检查/审查输入，不是整个 App vendor 图。

- worker：实际 `node ../../tools/run-node.cjs ./node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json`，exit 0。
- App：相同命令从实际小程序目录运行，TypeScript 5.9.3，exit 0。
- 现有公共文件缓存和深空请求消费者：18 项行为通过，exit 0；覆盖已有取消、退休、并发/租约、损坏与清理恢复，没有新增镜像实现的测试。
- 三份实际当前源码与候选字节一致，当前生成的 JavaScript 仍与原始源声明的输出哈希一致。保留的六项 settings/outbox 修改逐哈希不变，HEAD/分支仍 `72e65cf3` / `codex/remote-main-20260908`。

这闭合纯类型依赖和当前实际编译检查。此前目录区域阶段的七条 FAIL 回执保持历史失败；旧绑定图不改写成新源码，新 GPU、微信/native、画质、完整组合、客户端总峰值和 200DAU 容量没有因此验收。完整资源旅程仍在冻结前静核：同五态的 actual accepted-camera 反馈及返回动画要保持真实页面依赖，额外实际 wanted SAO 来自现本地出版，不下载全库。

入口：[只读诊断探针](../scripts/experience-public-image-demand-type-boundary-probe-2026-10-03.mjs)、[精确候选采用](../scripts/experience-public-image-demand-type-boundary-adopt-2026-10-03.mjs)、[检查前绑定](../scripts/experience-public-image-demand-type-boundary-inputs-2026-10-03.mjs)、[检查闭合](../scripts/experience-public-image-demand-type-boundary-check-closeout-2026-10-03.mjs)。
