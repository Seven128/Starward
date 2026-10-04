# 当前页面资格到公共文件、解码引用和同帧 GPU 的首条真实路径

日期：2026-10-02。唯一 PLAN 的共享资源开发验证；未改生产代码、预算、来源、资产或发布。依 root 的中途指令，首条路径冻结后暂停扩展 W3 on 与 Moon 路径，先定位已复现的压力。独立审查由 `hst_registration_review` 另行记录，本记录是作者证据。

## 输入和实际执行

- 入口：`scripts/experience-full-hook-resource-journey-2026-10-02.mts`，当前与 r4 执行快照 SHA 都是 `b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a`。默认只执行 W3 off 的 45→85→139→274.9 dome→45；`--expand` 未执行。
- 成功输出：`output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json`，2,408,783B，SHA `548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b`。五份实际 PNG、完整 390×844 RGBA 和逐条件 JSON 同目录；138 个生产依赖、原始输入与 3 个只读诊断变体原/新 hash 在 `inputs.json` 和 result 内逐一绑定。
- 当前 page SHA `a7138124b4bf0d712951792a8306f7d93d4da32430b38b508496475f19c4f172`；GPU textures `cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e`；renderer `bc0c927aa861a078c5c0e96b123ed84034db1838ba55185c5eb5db44f2e27444`；scene `ea1b50bbfb4bdbdc9774ff537dc259e53d407a513a29ae0ce70bd739fec3808c`。
- 复用 `cloud-sky-wide-resource-composition-1002` 中冻结 BFF JSON 和既有当前 report SHA `c5f0dc230a53e6e296978604aa11bc7b3d7d4e38b1bd329e6b5097f3fb829b99`，没有请求旧编译 BFF 或外部网络。时刻固定 2026-09-30T13:50:33.000Z，真实 report 观测转换/太阳状态保留；普通 DAY 标签不是白昼时刻断言。
- 从当前 page AST 抽取 17 个原声明，保持实际可见星座资格、11 个正常影像 Hook 和 SDSS/LOCAL 两个有条件 Hook 的调用顺序。React effects/query 调度是 task 受控适配，实际 manifest client 仍通过冻结 JSON 的真实合同校验。当前选中天体为 null；实际 SDSS Hook requested=false、LOCAL development gate=false、W3 用户开关=false；selected W3 没有请求，本路径不验证其选中消费者。
- 实际完整 hooks→公共 runtime→单例 core→SHA/字节/尺寸校验→受控 Map FS write/lease→实际浏览器 HTMLImage 解码→同一个对象进入当前 renderer。文件 URL 不会走旧 session 分支。没有预先解码所有库存图片。诊断变体只捕获真实 cache factory 返回对象、增加 loader 的只读 `__measure`、在 Hook 返回前读状态；三个变体源码已冻结。
- 元数据请求、实际 encoded image transfer、decode 与 GL upload 分开记录。星表/星座结构由冻结已附着输入提供，其请求调度不在本试验；13 个 Hook 内的 metadata 请求与 alpha JSON 请求实际经受控离线 offer。缓存 byte/hash/Promise/lease 行为是真实 core，但 Map FS 不是 WEAPP 持久存储证明。

## 真实资源结果

|条件|art wanted|新增图传输 / 解码|当前 owner-held RGBA 模型|三个 pass 最大 GL logical bytes|第三帧源上传|第三帧驻留|
|---|---:|---:|---:|---:|---:|---:|
|45 出发|8|9 / 9|14,417,920|8,798,208|0|3,432,448|
|85|11|4 / 4|19,660,800|12,738,560|0|11,812,864|
|139|28|17 / 17|31,981,568|30,932,992|14,155,776|16,777,216|
|dome 274.9|0|1 / 1|18,874,368|18,874,368|0|16,777,216|
|45 返回|8|0 / 8|16,515,072|16,777,216|0|3,432,448|

45 返回与出发全 RGBA SHA 相同；回程实际从 cold 文件重新解码 8 个 HTMLImage，encoded transfer 为 0，不能称为无需解码。末次 cache actual inspect 是 encoded 5,710,448B、26 个 lease、16 个 cold 文件 owner 条目；退出 cleanup 后 lease 为 0，renderer dispose 后 logical bytes/texture 都为 0。该 lease 数包含冷文件引用，不是 decoded 个数。记录的 decodedSourceRgbaModel 仅当前 loader 持有的独立 image 身份×真实尺寸；状态采样约 8ms，未声称捕获每一瞬间 native 解码分配峰值。探针为身份诊断保留创建过的 HTMLImage，不能用浏览器进程内存推目标 GC 行为。

### 139° 淘汰和暖帧重传原因

28 张真实 wanted art 合计源 RGBA 21,495,808B，所有 wanted 受 loader 的 activeKeys 保护，其 16MiB 规则只修剪非 active 项。另有银河 8,388,608B 和地景 overview 2,097,152B，合为 31,981,568B。该身份集不含 W3/SDSS/selected/LOCAL 图。

第三帧的 18 个实际原 image 对象先完整上传，然后同 18 个对象连续删除，列表为 And/Aql/Aqr/Aur/Boo/CVn/Cam/Cap/Cas/Cep/Cet/Cyg/Del/Dra/Equ/Her/LMi/Lac，总共 14,155,776B。没有新的 encoded transfer 或解码发生在这三个 warm draw 之间；银河和地景不在重传名单。第三帧真正峰值为 **30,932,992B**，不能把第一帧 26,214,400B 当总体峰值。

冻结 `sky-gpu-textures` 的 getWindow 把 source 标为 used；begin 保护上一 frame 的 used 身份（包括先前 finish 已删但确实绘制使用过的身份），所以重新上传期间原驻留仍受保护。实际当前使用过的 18 张 full-source 图不能由 finish 的 unused 条件删除；其全源字节和最后 over-budget 连续删除与 finish 的 whole-first trim 相符。第三帧结束精确降为 16,777,216B，下一帧再上传这些图。原 GL trace 未采集私有 remove reason/callsite，具体代码原因是对冻结 control flow 的可审查推导；actual upload/copy/delete 字节与 source 身份是直接记录，不把推导冒充额外 instrumentation。

因此，仅调整 LRU 次序无法让同帧 30.93MB 工作集都驻留在 16MiB；擅自丢掉低 opacity 的有效 artwork 或上调预算均不能由本试验证明合理。下一实现应继续针对真实提交所需成本与共享保留/LOD责任，保持所有有效交互和像素义务，先取独立审查结论。

## 新的离线 alpha 外边界候选：收益 0，否决

按 root 指定，仅离线解码当前 28 张原 PNG，使用 **alpha>0** 的严格范围，保留原色值/负载/尺寸、不以 RGB 黑色猜透明。入口 `scripts/experience-resource-alpha-boundary-2026-10-02.py`；输出 `output/playwright/cloud-sky-resource-alpha-boundary-1002-r1/result.json`，77,896B，SHA `63303cafbb0c8bf95e132d33b1ff2ca1378ca146d18c6b0dab61aa6c3768febc`。

全部 28 张非零 alpha 范围到达原图四边；3 个原 texel 的 LINEAR 邻居 pad 后仍全幅，21,495,808B→21,495,808B，省 **0B**。所以与现 `skyArtworkTextureWindow` 的交集仍为原有窗口，宽视角 ray-hull 不确定时没有额外透明外矩形可用。无须为此建立 runtime PNG decoder、改资产/发布合同或重复 GPU 渲染。该算法不以亮度分类 source missing，也不删有效黑像素；RGB 在 alpha=0 下是否非零另行记录。

同一离线程序还独立读解五份实际 PNG，与原 readPixels 的 Y 反转 RGBA 全像素精确相等，逐步重算 15 个 GL pass 的 upload/copy/delete live ledger/peak/end 与记录精确相符；真实 201 个旧 deep-sky 资产和六项保留文件 hash 与先前冻结绑定一致。未修改这些输入。

后续只复用同一个已绘 139° 条件，调用当前纯 `skyArtworkTextureWindow` owner，逐一保存 28 个 registration 的原 ray-hull/UV/返回窗口：`output/playwright/cloud-sky-resource-window-geometry-1002-r1/result.json`，19,556B，SHA `c94f39c9d1e1635e2ebb33ad098f4db65d6a6e68450f7b647e3ddc5c068649a1`。28 个都未得到 partial window，现有窗口合计仍 21,495,808B。它是当前 owner 的有界几何分析，不是独立窗口正确性或新 GPU 像素验收；没有增加视角矩阵。

## 边界与未验

GL allocations 是实际调用的逻辑 RGBA byte ledger，不包括驱动对齐、mipmap、framebuffer、shader/buffer、native decoded source 或 OS 物理驻留。原 `draws.source` 是当时 TEXTURE_BINDING_2D；无纹理 primitive 可能沿用先前绑定，不能用它逐 draw 宣称图片 shader/source credit。实际 tex upload/copy 的 source 身份已与同一 Hook 解码对象、原 bytes/hash 和文件路径闭合；scene callback 的 SDSS/selected credit 均为 null。

softwareGpuWallMs 包含任务 JS instrumentation、真实 renderer 提交和 software GL finish；仅三个样本，非 WEAPP GPU/流畅度/p95。native FS、设备 200MB 余量、driver/GC/native 总内存、200DAU/4G或16G服务器容量和最终整体体验均未验。W3 on/Moon/选中 SDSS parent+fine/selected W3、冷启动和隐藏/重建全旅程下一依赖仍保留。r1 构建时 stdin 缺 TS loader、r2 缺 tsx 生成的 __name helper、r3 误等真实零贡献地景 opacity=1 均为探针失败历史，未升级为通过；r4 是首个成功代次。
