# 完整组合资源旅程独立只读复核（2026-10-03）

本次没有启动浏览器、GPU、HTTP、IDE、服务、watch、测试或下载，也没有修改生产源码、PLAN、Context、资源或六项保留修改。它是已执行的受控软件 WebGL 全场输出读回，以及独立读取一个另代 CPU ownership 控制，不是目标 WEAPP/真机验收。

## 实际执行与状态

实际 GPU R2：`output/playwright/cloud-sky-complete-resource-1003-r2/result.json`，16,556,714 B，SHA `80a2270a1d922f86019a9518ba7ef249aeff0603e9676ca709df6b7d9b8c04c3`。**保持 `MEASURED_WITH_FAILURES` 与原 exit 1**，唯一 retirement 断言失败不追溯改写。

五态 Moon45 → Moon85 → M51 OVERVIEW → M51 DETAIL held/fail/retry → Moon45，共 4/4/19/7/4 = 38 次实际提交。M51 overview 的 15 次额外提交来自真实 browsing-camera returning timer，非新增视角矩阵。报告、星座、Canvas、renderer、GL 的运行对象身份不变。实际 page 先按上一 accepted camera 决定 Hook 资格，再 paint 新 live view；通过实际 staged→done→lifecycle presented→page publish 更新资格。逐提交的新 staged/published snapshot identity 相等，实际发布计数连续 1–38。React、查询、时间、native callback 与 MapFS 为受控替身，不能推为真实手势、传感器、TanStack 或生产 HTTP 时序。

旧 GPU R1 的 DETAIL 失败等待条件曾误把仍有效 MEDIUM 的 `updateFailed=true,failed=false` 当作 `failed=true`。实际失败与三态/第四态 partial 图留存；独立 predicate 证据见 `experience-complete-resource-refinement-predicate-independent-review-2026-10-03.md`。只修 task helper 两处 predicate，不是修生产渲染，R1 不升级完成。

## 独立实际读回

最终独立读取脚本：`scripts/readback-complete-resource-independent-2026-10-03.mjs`。冻结执行副本、结果与绑定位于 `output/complete-resource-independent-1003-r6/`：

- `result.json`：49,507 B，SHA `e3fab3c43724775fe7d141c64bec85be35766a943fb063b456a5c8d872bbf6f9`。
- `binding.json`：670,755 B，SHA `f77c17c3fd5765190468f41663ffdc85621bfcb7bd1bfd0d5dbe0ff0265f556f`。

自写 PNG chunk CRC/zlib/五种逆滤波/Y-flip核 38 张完整 PNG 与底向 RGBA，每字节相等；每图实际 390×844，RGBA readback 1,316,640 B。RGB channel bits 8，alphaBits 0（opaque readback alpha 255），不声称 alpha attachment 为 8 bit。返回 Moon45 normal-warm 与初始 normal-warm 全 RGBA exact。

按 1,991 个实际 GL 事件独立重建所有 texture/buffer/renderbuffer/framebuffer/program/shader 的逻辑 handle 与分配，核每事件 live 值、38 frame peaks/retained、source upload、源与窗口复制共存、FBO attachment 只引用既有 storage，不双算。逻辑峰值：texture **17,367,040 B**，buffer **63,948 B**，renderbuffer 0；全旅程 source-upload **105,381,888 B**，GPU-copy **18,415,616 B**。五态最后 normal-warm 各 upload/copy 0。16 MiB 是已采用压力目标，active-used 允许超过它；这不是泄漏判据或 GPU 总内存。

所有 GL handle 的 delete 请求记录、hide/clear 之后 cache leased/running/pending/reserved 0，最终 cache entries/bytes 0，所有 SAO loader disposed、pending/loaded 空，实际 GL errors 0。GL 删除请求不证明驱动立即回收；物理 native/driver/RSS/GC 内存仍未知。所有已记录诊断纹理绑定并非真实 sampler-use 集合，存在已删除的历史绑定记录；独立账本保留此区分，未把绑定推成照片贡献。

158 source bindings = browser metafile 156 实源 + page/API 2 项明确追加，444 Node metadata preparation graph，5 browser virtual inputs，733 actual inputs = 663 初始 + 70 个动态 SAO raw/envelope 条目。35 个额外本地 SAO tile 在交给浏览器之前绑定，与实际 index 的 SHA/bytes/rowCount 及实际 producer envelope 全相等；不能倒填初始库存。当前源码、保存副本、工具、输入、六项保留文件读前/读后吻合。Node graph 的 metadata-only bundle 未执行，两个未调用 Nest optional externals 明示，不能升级 whole-server runtime trace 或完整环境重构证明。AST 实际使用的 task TS 与 app 类型检查版本分别记录，未混成同一工具。

公共图 cache 各观测 running≤2；`nativeCallbackPeak=4` 是 metadata+image+SAO 的混合 transport 计数，不能用来判公共图片 2-slot policy 超占。SAO 6 MiB 只约束 index.tile.bytes；tuple 数值模型、JSON bytes、resolved/projected 数量另列，JS heap 未测。强引用 HTMLImage、RGBA/PNG/base64、metadata/JSON 等诊断副本不计入生产 owner 总量。

## Bitmap26：实际未知与另代控制

R2 hide 后兼容 API 仍对 diagnostic image26（landscape DETAIL）返回 true。独立遍历全部 states、38 提交与完整 GL 事件：**没有任何 Hook entry/ready/submitted 图片或 GPU 上传/绘制绑定来源为 26**。同一 source 有先前 ready24、下一态 cold file、回程 ready28。harness 诊断 `addEventListener('load')` 可以将被取消的 raw HTMLImage 记为 decoded；生产 request 仅在自己的当前 `onload` 成功之后注册 WeakMap，取消会 detach 属性 callback。WeakMap 对未注册对象返回 legacy-compatible true。因此旧“所有创建图片都必须 false”的断言不能直接证明 owner 泄漏。

但 R2 未观测 WeakMap membership，**26 的历史 membership 仍 UNKNOWN**；上述线索不是证明它在该浏览器实例未注册，不以它认证退出全部 native 图片或物理内存。

另代 CPU 小控制 `output/native-image-membership-observation-1003-r1/result.json` SHA `cb96a155d802e0ac0f080e1db92d4bc7ae29590e92120773b3dbbbe95f1ce47f`，读回 51 源绑定前后 exact。实际 cache/request/loader 使用同一真实 bound landscape PNG，受控 image/MapFS；loader 仅追加原 WeakMap 的只读 getter，独立核追加文本 exact，无生产替换。cancel-before-onload 与强制 late 原 callback：未注册、lease 0、owner ready 空、API true；成功对照注册后 owner dispose：registered=true/retired=true/API false，clear bytes 0。旧全创建图 predicate 被实际未注册候选触发；membership-qualified predicate 正确排除。最后 `currentOwnerImages` 是 last-published Map（dispose 不 emit），**不是 dispose 后现存 entries**。本控制不回溯 R2 image26。

## 实际边界与后续责任

M51 DETAIL held/人工一次 transfer failure 后，实际 MEDIUM25 及其光学来源继续可用，`updateFailed=true`；真实 retry 后 DETAIL 恢复。W3 独立 decode 与 SDSS 光学 source credit 分开。普通 science-v2、LOCAL fixture 未启用；JPEG 覆盖与科学/显示画质未知。实看 Moon45、Moon85、M51 retry PNG：整场星座/恒星/地景与图片确有内容；M51 detail 仍软、棕/绿，不能由资源读回采用画质。未覆盖太阳照片/所有行星纹理、全视角/全部图层、目标 native、真实退出 GC、UI/FPS、200DAU/云容量或最终体验。

独立 reader R1–R4 的错误为输入容器形状、metafile 额外绑定计数、历史纹理绑定意义与 legacy kind 名称误读，完整 failed/source/log 均保留；R5 首次完整读回，R6 仅追加 CPU 控制/动态 index/diagnostic binding join，没有再 GPU。它们不改写 GPU R1/R2，也不把 preparing/protocol review 作为运行通过。
