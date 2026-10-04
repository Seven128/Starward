# 当前连续 Scene 旅程与实测修复

本轮继续授权后，首次 Goal 查询为空，按 GOAL-CURRENT.md 建立无预算持续 Goal；读回 active。工作区/分支及 HEAD 72e65cf309d700cb7d40c5b7afd53660fd39fa35 保持，未提交/推送/部署/发布/推手机。六项保护修改由执行前后 SHA256 核对保持不变。

## 实际执行与证据边界

当前实际页面的 selected 声明、请求/decode effects、draw 请求、lifecycle paint/publish/release、credit 判定、来源导航动作和跟踪回调经有界 AST 提取执行；共享 Scene、缓存、文件校验、图像/纹理及星表 owner 使用当前源码。原始报告/天气 Context 固定，本地当前 buildDeepSkyScene 和 celestialObjectPosition 提供目录配准及 0/1/60/900 秒几何，不写共享业务 Context。图像和星表使用已缓存真实出版字节，没有重新下载或重新加工月面。node preparation 图、browser bundle 图、虚拟适配与工具身份分别保存，生产输入执行前后绑定；不是完整 Node loaded-module trace。

主结果：`output/playwright/cloud-sky-current-scene-1003-r5/result.json`，SHA256 `1ab3dd10fd06e354fbb248e502d126f69936eb0f530eece67aa7defc19bd2b0e`；精简读回 `current-scene-summary.json`，SHA256 `bfb44484daf73178f754835e95d464cadbd17e27eadbb06cb936d3973bea61ef`。脚本入口是 `scripts/experience-current-scene-journey-2026-10-03.mts` 与 `experience-current-scene-browser-2026-10-03.ts`；迁移器可用 `--check` 核对生成结果，不覆盖历史脚本/失败输出。

连续执行冷进入、下方浏览/地景渐隐、全景、M51 overview/detail 单次细层失败保 MEDIUM/重试、出屏/暖返回、广域 W3 与银河切换、关闭/恢复地景星座、红光恢复、月面/七行星浏览、跟踪及迟到旧时刻拒绝、来源遮挡/返回、hide/新 Canvas 返回。每次提交核对实际 lifecycle 接受和实际新 staged snapshot 发布，并保存完整 RGBA/PNG、资源与 GL 明细。细层失败时实际 MEDIUM 保留并继续呈现；暖返回/来源返回/hide 返回图片传输均为 0，仍执行现有公共文件校验和重新 decode。

这是**受控软件开发证据**：React/Taro/MapFS、姿态/手势/时间送达、网络回调和导航交付受控。来源导航执行了页面实际回调和带 publication pin 的实际 route；没有执行独立来源页实际 Back 事件。时间交付到真实几何/跟踪消费者，没有执行公共 time-picker UI 的完整 preview/cancel/commit 流程。已有 FAILED_DEVTOOLS、Android/iOS、新版月面手机、完整质量/容量/独立审查缺口保持。旧五态 image26 登记 UNKNOWN 不由本轮倒填。

## 整场资源与时延

按对象去重，所有家族的 wanted/ready/retained/cold、selected 页面状态、文件租约、native WeakMap 实际登记、pending decode 与 GL 分配/退休分别保存。UNREGISTERED 不使用兼容绘制 API 的 true 判断泄漏；强诊断引用和 offered bytes 单列。

| 观测层 | 整场峰值 | 含义 |
| --- | ---: | --- |
| 当前 owner 解码 RGBA 模型 | 30,408,704 B（29 MiB） | 模型，不是 native 物理分配 |
| 有效 native 登记 RGBA 模型 | 30,408,704 B | 独立观察登记与 owner，不能再相加 |
| 正在解码的源 RGBA 模型 | 11,534,336 B（11 MiB） | 另时刻临时峰值，不等于峰值同帧求和 |
| GL texture 登记峰值 | 29,360,128 B（28 MiB） | 按实际 texImage/copy/storage 与 handle 记录；附件引用不重复计 |
| GL buffer 登记峰值 | 125,388 B | driver/program/shader 物理内存未知 |
| 编码 MapFS 文件 | 7,927,420 B | 含索引/暂存，同层独立计数 |
| 活动文件租约 | 37 | hide 与卸载分别观察 |

控制条件下首个有 Scene 对象的冷提交约 99.9 ms，冷 Scene settled 683.6 ms；仪器化提交 p95 52.1 ms。它们包含大量诊断开销与同步软件 GL，网络/文件 adapter 为本地受控送达，**不是微信首个可用 UI、手机 FPS、12Mbps 时延或 200DAU 容量**。不据此新增队列、扩大预算或采用某默认政策。全小程序客户端物理总资源仍未知。

## 实际逃逸缺陷及修复

1. `use-sky-landscape.ts`：缓存 publication 在关层/无 Canvas 后仍使缺 alpha 被报作 loading。R2 `failed.json` 保留完整 `bounded readiness layers-off`、修前源绑定和像素。新的真实 Hook 回归修前失败、修后通过；loading 现在以实际 wanted 为边界，重新开启仍正确 pending。独立粗源失败/重试和取消机制保留。
2. selected W3：R4 `source-back-hidden.json`/`hide-return-hidden.json` 显示 GPU/有效登记已归零，但纯 hide 留 1 个 recovery 文件租约；此前卸载清理不证明纯 hide。页面现在 hide 时清 requested/recovery 两角色与 IDLE，公共编码文件仍可缓存；可见的 Canvas 重建间隙继续保留 recovery。真实页面回调回归覆盖共用/分开 release 身份，修前失败、修后通过。R5 两次纯 hide 的文件租约、有效登记和 GL texture/buffer/renderbuffer 均为 0；返回无图片下载。最终 clear/卸载的文件、SAO、回调及 GL handle 登记无残留；不认证物理 GC/driver 回收。
3. 服务 SAO：`sao-burst-before-2026-10-03.json` 使用真实 65 个 v2 瓦片、2,369,537 B 源字节与受控慢读，重访第一 key 导致 66 次读取/不同 envelope；修后 `sao-burst-after-2026-10-03.json` 为 65 次/同一 envelope。`SaoPublicationService` 分开 in-flight 去重和既有 64 项 ready LRU，pending 不参与 ready 逐出，成功/失败 finally 均释放 key。非法 hash/id 在进入表前拒绝，distinct pending 受固定、校验后的出版目录限制（本代 826），未新增任意 key、分布式缓存或猜测的并发/字节阈值。保 hash/contract、旧/新路由、失败重试、64 项退休。已测最大 64 瓦片源字节和可用边界仍不等于 JSON/native/RSS；字节预算/过载回压及生产频率继续由实际混合容量证据决定。

相关地景/selected 请求回归、SAO 实际全出版/HTTP/304/兼容及两个子项目 TypeScript 5.9.3 检查通过。一次根目录 TS6 检查仅因 baseUrl 弃用退出，未据此改配置；一次根 cwd 的 worker 测试因 decorators 配置入口失败，已在 worker cwd 使用其既有配置通过。watch 复用现有进程，当前 source map 的页面及地景 sourceContents 与源码逐字节一致；构建仍有既存 CSS order warning，不能当作 DevTools 呈现健康。

## 尚未交付

完整交互 UI/WXML/native、实际来源 Back/时间 UI、M51 矩形/弱结构/接缝和 M82 输入、新月面手机与平台性能、Prepared 真源质量/普通采用、端云混合容量/最终独审仍开放。当前 legacy 高倍率 M51 图已实际查看，图质没有因缓存/重试成功升级。Prepared registry 未采用。本轮同场结果不能关闭全部 33 项产品义务。
