# 完整资源 normal lane：执行协议

状态：冻结 task-local 协议；2026-10-03 续接 10-02 准备阶段。不改变生产、预算、science/default 或 LOCAL 开关。首次 launcher 在 Node 前因多个 Application 匹配失败，记录在 execution-1003-r1；仅选择首个实际 executable 修复。随后实际软件 GPU main-1003-r1 在第四态人工一次 DETAIL 失败后因任务谓词错误超时：真实 MEDIUM 可用，所以整体 `failed=false`、`updateFailed=true`，脚本错等前者为 true。前三态及三 partial 完整 RGBA/PNG、原 source/错误/raw log 保留；该代仍为失败。修正仅两行任务谓词：更新失败等 `updateFailed && !failed && !loading`，恢复要求 `!updateFailed`。独审后以新代执行同一五态，不追认旧 FAIL。

## 入口及输入

入口是 `scripts/experience-complete-resource-journey-2026-10-02.mts` 与 `scripts/experience-complete-resource-browser-2026-10-02.ts`（相对本 work-item）。前者由旧 continuous 入口生成后，按当前实际页面和独审意见逐项修改；builder 是初始生成历史，不声称重生成即可得到最终执行版本。实际执行源会原样复制、hash。复用 `experience-complete-resource-composition-preparation-2026-10-02.md` 和 `output/complete-resource-scope-preparation-1002-r2/result.json` 的五个合法视角，27 影像、29 SAO 瓦片为候选输入并集，不是同时驻留量。原目录、原报告、原 metadata 和原图片均绑定，不新增取得影像、安装、BFF、IDE/watch 或手机工作。

生产 browser import graph 和 Node producer/preparation graph 分别严格解析绑定、保存 metafile 和源码副本。Node 实际执行原 import；另存的 Node bundle 仅用于 graph inventory，不冒称 loaded-module trace。既有报告经实际 present/attach 一次生成、一次 seed；每态及结束检查 canonical 内容和 report/catalog/entries/figure 的实际引用、同一 renderer/GL/node（释放时要求 node 为 null）。实际 Node、TS、tsx、esbuild 入口和 platform binary、缓存 Playwright 入口及 browser 可执行文件分别作限定身份绑定，不声称整个 vendor loaded-module trace。

## 实际依赖链与提交

真实 page AST 的 `currentViewBasis`、`presentedFov`、`presentedCenter` 声明负责 Hook 资格：上一 actual acceptedCamera 优先，初始未显示时使用原 sensor/manual fallback。受控原 pose 与 requestedFov 独立供实际 request/paint，不把 camera 输出再当新 live 输入；paint 是唯一实际 browsing owner update，Date.now shadow 使用同一个 logical clock。85°→小视场的真实 returning 由原 page 16 ms timer→当前真实 draw ref→request/paint/accepted 驱动，同一 clock 有界前进，每次自动提交同样完整记账，直到实际 owner settle。不是传感器、触摸、真实连续动画或帧率观察。

每态先 commit 上一 accepted 资格，向实际 lifecycle request 新 live 视图并记录首次提交；actual stage/done/presented→真实 page publish 后，再 commit 原资格声明读取 acceptedCamera，记录 pending/partial 提交及后续 readiness 状态，随后作两个 normal 提交。十个 normal、初始 cold、四个过渡首次帧、五个反馈 pending 帧、必要真实 returning 提交，以及 DETAIL held→MEDIUM 成功→DETAIL 一次 transfer fail→真实 retry 恢复所需提交，共用一个 Canvas/GL；不新增 pose/pair 矩阵。held 只匹配 `sdss:M:51:DETAIL`，selected W3 不受该控制。

不是把 lifecycle 通知计数当新发布。每次提交检查 actual setter 内 publish 计数增加一次、stage snapshot 对象就是 painted snapshot，保存实际 accepted camera/FOV/center/native generation。每次正常实际提交完整 PNG、bottom-up RGBA、hash、source credit、已用 common opacity、实际 SAO Scene 计数及 GL ledger 均保存；异常保存原执行源、错误和可获得 partial artifacts。

## SAO 与资源账本

SAO 使用本地 `SaoPublicationService` 校验原 publication/index/tile bytes，受控 transport bridge 到实际 `createSaoCatalogClient` 准入/冻结，再经受控 `useResourceQuery`→实际 `useSkyStellarSupplement`→实际三槽 loader→实际 Scene→accepted page。29 瓦片仅原 settled 资格并集；真实返回中若请求其他目录现存瓦片，通过同一 producer 按需读，交付前保存并核 index bytes/hash 与实际 envelope，时点明确列为 delivery 前动态绑定，结束复核，不倒填 run 前绑定或全目录预读。未执行生产 authenticated SDK/HTTP/api-operation/TanStack/API-response 持久缓存，metadata retention 另列。loader 的每个实际 owner 注册只读快照，hide 后即使 Hook ref 为 null，仍能观察 disposed、wanted、loaded、failed、refresh、pending 和各 pending AbortSignal，保 abort 后槽位直到 settled 的语义。

6 MiB 是目录编码 tile bytes 的 view budget。账本另外列实际瓦片和 tuple 数、编码原字节、publication JSON 编码尺寸、数值 payload 估算、resolved points/JSON 尺寸、实际 Scene appearance/projected/picking 身份计数，以及实际 GL typed upload/buffer 容量。picking 身份不是最终可见像素数；GL draw 的 texture-unit bindings 不是已证明的 sampler-use/source credit，真实 page 来源状态另列。JS 对象/字符串/副本总内存、WeakMap/GC、driver、RSS 未测，保持 unknown。编码/JSON/数值 model 是不同层，不能相加冒称总 RAM。

图像 source bytes、公用文件 lease/cache bytes、当前 native image unique RGBA model、纹理 source/copy allocation、buffer capacity/peak、renderbuffer、FBO attachment 引用和各类 handle 分列。attachment 引用纹理，不双计容量；GL create/delete ledger 是真实 handle 的逻辑请求统计，delete 不证明驱动物理释放。普通 drawing buffer 单列逻辑 RGBA8 readback plane，实际色深/深度/stencil 属性保留；物理 swapchain/driver 未测。observer 的 getParameter/finish/readPixels 有成本，不认证性能。

实际 page hide/release、Hook cleanup、SAO owner disposal、公用 cache clear 和控制 MapFS readback 后观察 native current、presented、leases、requests/pending、文件、GL logical handles。控制 adapter 的保留引用和 metadata/offer 字节独立报告。transport 受控调度不认证 12 Mbps、200 DAU、目标 WEAPP/native FPS、质量或最终验收。

## 采用边界

复用当前既定生产选择和正常 lane，没有 contribution budget/probe，没有 science port，没有 LOCAL。局部几何/科学质量/readability/default 开放状态维持。新结果只绑定当次实际源码，不升级旧软件 GPU 或手机证据。root 的纯公共接口边界变更已闭合，执行冻结绑定当前源；独审由 Sphere 对最终源、协议和实际结果进行。执行前静读发现的 pending 清空计数及 returning 输入/clock 阻断已在任务 harness 修正，无生产修复或旧失败运行追认。
