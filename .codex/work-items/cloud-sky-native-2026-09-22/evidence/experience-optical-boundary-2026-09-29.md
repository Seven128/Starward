# C/B1/D：有限光学视场与连续缩放

本轮完成一个影响连续浏览的实际缺陷：原 M63 中档切图的有效结构延伸到图边，但切换到这一有限细档时，已出版宽档的外围结构被单层选择移除。v30 使用同对象、同出版的宽档承接外围，再绘细档；原图、科学覆盖声明、商业范围和既有技术路线保持。整体参考体验、手机和目标性能尚未验收。

## 责任与实现

- `use-sky-sdss-optical.ts` 仍使用共享 native 图片 owner，同时请求所需档及直接父档，沿用两张 512² RGBA 的 2 MiB 逻辑预算及原有两个并发槽。优先显示所需档，失败或加载时保留有效档；对象/出版/Canvas 代次隔离、取消和 GPU 重试标志保留。
- `sky-scene-render.ts` 将更宽光学档和细档交给同一球面注册、投影、artwork 和 GPU 路径，宽档先绘、细档覆盖。实际成功且未被前景遮完的最细档负责来源；一档失败不丢独立有效档，光学均未绘出时保留已有 W3 回退。已绘光学不与目标 W3 红外混色。
- `spot-sky-page.tsx` 将父档身份、层级和视场纳入原生绘制队列及变更比较，按实际已绘档提交来源和重试状态。没有新增引擎、逐对象特殊绘图、数据编辑或推断缺测 mask。

只有三个 Sky 生产 owner、四个 Sky 检查文件及已有 Context 的 Sky 段落有本轮产品相关变更。地图 CSS SHA `81283f7b…` 保持；其它业务源码和分包未改变。v27 撤回探索未采用。一次已授权审查保其历史范围，不复派；本轮及最终变化的必要独立审查仍待完成。

## 因果与本地检查

修前六个有作用的回归失败，修后六个受影响文件 42/42 通过；两处新检查的类型错误修复后 Mini 类型检查及对应 15 项通过。检查涵盖父档到达/释放、双档晚到取消、身份隔离、失败保有效层、实际来源、前景遮挡和原生队列消费。数量只定位证据，不衡量产品完成。

[真实生产 GPU 试验](../../../../output/playwright/cloud-sky-optical-boundary-0929/after-r2/result.json)复用修前冻结的公开精确天文输入和原始图片字节，通过完整生产场景/GPU 绘制。修前/修后各十条件；修后 WebGL error 0，六份创建资源全部退休。中档不透明核心 206,384 像素保持；69,214 个细档视场外像素全部来自真实宽档，与宽档单绘相同。细档中心最小 0.05°视口位于细图以内，没有外部区域；核心保持，边缘过渡有实际作用。单档对照前后相同。

首轮修后诊断误以为中心最小视场也有细图外部区域，失败和原始输出留在 `after/failed-trial.json`；只修诊断假设，另存 `after-r2`，未据此修改产品。逐图拒绝是场景边界受控案例，不能冒称原生 GPU 故障。软件单轮串行耗时仅供开发观察，不主张性能改善或目标预算通过。

## 固定候选与实际 DevTools

[干净 v30 候选](experience-combined-clean-v30-candidate-2026-09-29.json)：SHA `bbc5f610…`，257 文件、4,488,797 rawB，较 v29 +1,992B；仅 Sky JS 和检查项目配置变化。主包 raw 2,089,891B 保持。无诊断、fixture、vConsole、source map 或 app.debug。构建 exit 0，三个现存 CSS/包体/无异步建议警告保留；raw 字节不是官方上传包体。loopback 8791 不推手机。

[v29 修前冻结基线](experience-optical-boundary-baseline-2026-09-29.json)与[v30 原生绑定](experience-optical-boundary-v30-native-validation-2026-09-29.json)分开。旧窗口通过官方工具关闭后才打开 v30；唯一 PID25916/项目 V30-0929，SDK3.17.4、iPhone 12/13 (Pro) DevTools、DPR3、普通 DAY/标准字号。通过公开入口选择示例正式点、进入云观星/手动、公开时间 21:00→19:00、中文别名搜索 M63、定位、原生 SDK 双指缩放、自然中心点选和来源 Back；没有状态注入或真实姿态 mock。

新 Context revision2、ID SHA `893b8fd5…`、fingerprint `0bb96485…`；正式点 `spot:test-published`，民用 2026-09-29 19:00 Asia/Shanghai、观测夜09-29/UTC11:00。它不是 v29 revision3/原 Context。自然点选得到 M63/NGC5055/Sunflower Galaxy、高度15.8°；独立来源读回绑定实际 SDSS 版本、CC BY4.0、历史 gri、北上东左、有限视场/未知科学覆盖和总览原红条带说明。来源截图只显示首屏，完整 SDSS 条款来自真实页文本读回，不把该首屏图说成已看见全部条款。

真实 SDSS HTTP 请求253/254/255分别完成 MEDIUM/OVERVIEW/DETAIL 200，与出版字节、视场一致。原生 DETAIL 时保 DETAIL+MEDIUM；回中档/宽档后保 MEDIUM+OVERVIEW、DETAIL 释放，JPEG 摘要与原出版一致。另有四份 PNG 属独立 Sky 图片责任；编码文件数量/大小不当作 decoded/GPU 峰值。

六张本代原图均由主 Agent 查看。原始427×919星图区裁切比较、没有缩放：

| 观察 | 实际结果 | 适用范围 |
| --- | --- | --- |
| v29 中档→v30 中档 | 75,298像素改变，最大通道119；外围真实宽档有作用 | 两个独立 Context，同公共点/时刻/SDK及四舍五入视场；不认证精确相机配准等同 |
| v29 宽档→v30 宽档 | 0像素差 | 上述有限对照条件，单宽档保持 |
| v30 中档→宽档→中档 | 0像素差 | 同 v30 Context、公开操作回程 |
| v30 中档→自然点选/来源→Back | 0像素差，Context/时间/选择保持 | 同 v30 Context、独立来源返回 |

修前[中档原图](experience-v29-native-optical-boundary-m63-medium-before-2026-09-29.png)、新版[中档原图](experience-v30-native-optical-boundary-m63-medium-after-2026-09-29.png)、[宽档](experience-v30-native-optical-boundary-m63-overview-after-2026-09-29.png)、[来源返回](experience-v30-native-optical-boundary-m63-source-back-2026-09-29.png)保原字节。60事件与六原图已冻结。前轮 v29 HTTP503/重复重试及正文取消证据仅保原候选条件；本轮正常200不升级这些故障，也不替代解码/GPU异常验收。

## 参考与剩余依赖

保存的 Stellarium Web 页具有 M63 公共 URL/资料、对应地点与意图视场，但实际暂停19:00:08，与本代19:00:00不同；图中还出现另一对象标签，精确相机/注册等同性未认证。来源与显示响应不同，原图不用于像素等同或最终配准验收。此参考限制、早期未匹配试验的撤回均保原记录；没有采用已排除的 DSS 数据。

Sky 原生截图仍只见 Canvas；WXML/控件动作不证明普通名称、dock、modal 的实际合成。这一缺口未用源码或工具成功掩盖。整场识别、昼暮夜/全天/普通红光、合法覆盖与实际配准、源条纹/饱和、手机完整旅程/新月面、真实姿态/旋转校准/OS后台、原生解码/GPU故障、性能峰值/官方包体/流量/费用和最终必要审查仍开放。缺现场数据只限制现场承诺，不重新变成地景/大气的普遍硬依赖。

恢复点：单 v30，M63 中心约0.15°手动/19:00/revision2，DAY/标准字号，无 modal/跟踪/列表/时间面板。任务8791/PID4924/exec17379/controller64485、原 epoch09:14:20.175Z、PUT3([200,200,200])、totalObserved261，source/context/resource pass、settled、held/active0；8789内存和共享8787/8788保持。没有手机、预览/上传、云部署、提交/推送或新 Agent。Goal active、无预算、未完成；唯一下一依赖见 [PLAN](../PLAN.md)。
