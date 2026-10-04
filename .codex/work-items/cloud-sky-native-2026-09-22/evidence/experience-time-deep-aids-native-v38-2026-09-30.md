# 连续时间与面状辅助：本地原生开发检查（2026-09-30）

范围仍是[唯一 PLAN](../PLAN.md)的完整云观星旅程。本记录只认证所列模块和条件，不代替真机、整场画质、性能或最终交付。用户八张 Stellarium 参考原图和逐字说明见[参考索引](reference-user-stellarium-2026-09-29/README.md)与[指令记录](../USER-UPDATES.md)。约 1.7°不是时间启动阈值：公共时间按 1× 前进，同一角速度在小视场投影成更大的像素位移。

## 当前源码和运行所有权

- 几何仍由版本化 Sky report 的 `timeModel`、共享 Hermite/SLERP 和精确时刻位置接口提供。页面的播放、暂停、取消和明确应用接同一 Observation Context；天气只用实际提供者整点，细时刻没有适用目标帧时留空，不拿旧建议冒充新时刻。实际画面、拾取、选择定位、星座和图层随已绘帧走；未把 FOV 写成第二时钟或每帧 Context PUT。
- 本轮深空目录圆点和普通名称共用 `sky-deep-auxiliary-visibility.ts`。只有该对象注册影像**实际成功绘出**且目录有角尺寸时，才按当前视场中的投影直径渐隐；无图、失败或尺寸未知保留目录辅助。星座艺术/线/名已有独立共享淡化窗口。合格注册的红外或光学细节图继续显示，避免把真实影像一并隐藏。选择圆/十字与名称有独立责任，`sky-selected-object` 的名称按宽视场淡入、标记保留。
- 隔离候选 `apps/wechat-miniapp/dist/weapp-check-sky-time-v38` 绑定 `http://127.0.0.1:60061`，无反馈标记；`sky/detail/index.js` 381,569 B / SHA256 `6a3f15cad040e68f938caaf7b2cc9ad7703f44f4bc998f5bd7a9da9ea27d2539`。开发构建成功，原有 CSS 顺序、244 KiB 警告与无异步 chunk 建议共三项，官方包体未测。TypeScript 检查、两条尺寸/缺失规则测试、`git diff --check` 均通过。代码未提交/推送，HEAD `7898962b80d20df371a758748bc62e8c48db33a7`，只改云观星职责及其任务运行脚本。

## 微信开发者工具的实际结果

官方 `wechatide` 单窗口、427×919 模拟器、DAY/标准字号、深圳正式示例点测试夹具，观测夜 2026-09-29、所选 `2026-09-29T13:00:00Z`（21:00 Asia/Shanghai）。这份地点/天气为 `SAMPLE_DATA`，不代表现场。手动相机，搜索 M31→资料中定位→完整双指开始/移动/结束：

| 倍率与原图 | 观察 |
| --- | --- |
| [45°](experience-time-v38-m31-45-2026-09-30.png), SHA256 `be6377c58728bdaefefade8be61603f8b216d040f7ca041c0bd9a166c5701be` | M31 与邻近深空目标仍是目录圆点，未画细图。 |
| [约 15.7°](experience-time-v38-m31-15-settled-2026-09-30.png), SHA256 `9f0300814f7c0382a91b7c0b4a6e58b00785a74afB04f56880d939dcbcd4ac8a` | 本地深空目录标记保留；视场值由页面运行树 `15.7°` 核过。 |
| [约 2.2°](experience-time-v38-m31-2-settled-2026-09-30.png), SHA256 `38e5bb2767fADEC57BB520E8CFC28ED58DA56497678EE2CCE5D833E532356FC5` | M31 的 DETAIL 图实际出现在 Canvas，中心目录圆点退出；邻近未绘图对象的圆点仍在。运行树为 `2.2°`、M31 圆形选择节点存在，并展示 `NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像`。网络见真实 `GET /v2/celestial-objects/M%3A31/image?level=DETAIL&imageVersion=source-finite-v3`。 |
| [缩回约 15.7°](experience-time-v38-m31-return-15-2026-09-30.png), SHA256 `54bbe76a37e97110bf4abe5c71da2fc292a02100c25c7366fc99bf9cceeacb0e1` | M31 细图退场，原目录圆点恢复。 |

旧共享 8791/8789 监听随中断消失，原样本的 SAO/星座公开请求因此一度为 502；这些 M31 图只用于局部影像/标记检查，不认证完整星场。随后在本任务隔离 BFF 中接入**既有** `SaoPublicationController`/`ConstellationController` 及出版服务，保持产品源码和原资产不变；从隔离 `:60061` 读回 SAO v2 索引、实际 tile、星座清单、插画 asset、银河和地景清单均 200。新测试 Context `ctx:b4b38161-a681-4253-9f61-6fd0b59a2c73`/revision1 同一示例地点和 21:00，旧 Context 不迁移。单窗口重进搜索 Altair、定位、缩放约 25° 的[原生画面](experience-time-v38-altair-full-public-25-2026-09-30.png)，SHA256 `f81d7f6335426b40b55b7ec18412e36479d97a37b187397f1f2cc86c4815f8c2`；星座插画、线与星点同帧可见。该会话网络 61 个请求，其中 SAO 45、星座 2、图片资产 1，Sky report GET 2，Context PUT 0；控制台错误过滤为空。任务 BFF 在 `:60061`、单个 v38 窗口维持供后续开发，旧共享监听没有重新占用。

此前同源码时间链的本地开发结果保留：v35 的预览/暂停/明确应用产生**一次** Context PUT，取消不再提交；v36 重进在秒级提交后显示完整 `21:00:24`。v37 完整结束的双指缩放，在 Altair 25° 星座艺术明显、约 15.7° 变淡、2.2° 消失的实际 Canvas 图分别为[25°](experience-time-v37-altair-25deg-settled-2026-09-30.png)、[15.7°](experience-time-v37-altair-15deg-settled-2026-09-30.png)、[2.2° A](experience-time-v37-altair-2deg-committed-a-2026-09-30.png)及[2.2° B](experience-time-v37-altair-2deg-committed-b-2026-09-30.png)。两张 2.2° 图间隔约 18.1 秒，Altair 中心从约 `(221.1, 469.5)` 到 `(240.6, 494.6)`，约 31.8 像素；只说明该 1× 本地播放样本与预期天球位移量级相符，没有独立证明整夜或不同手机上的运动精度。先前触摸结束文件错误的过渡截图**不作**已提交倍率证据；已改用 literal `[]` 的 `touchend`，成功回执后才采用本组图。

## 仍需完成

微信开发者工具的 Canvas 截图对普通 WXML 覆盖层捕获不可靠；十字/圆形标记的呼吸合成、名称透明度与 dock/modal 层叠不能凭上图宣告已验。目标跟踪、跨午夜、迟到/失败恢复、SAO 深层真实失败与拾取、整场影像配准/条带、干净合并候选、资源峰值/帧时/官方包体/实际云费用、Android/iOS 与必要最终独立审查均仍开放。手机按用户指令暂不可用，继续用单个开发者工具窗口开发；大字号继续暂停。下一项应先把细时刻目标/事件建议和完整组合恢复按真实服务数据闭合，再批量核整场交互与目标性能，不再把单天体补丁当完成。
