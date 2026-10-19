# r10 task 接入与地形实际文件身份独立审查

2026-10-19，`/root/review_r10_probe_integration`。结论：**PASS_TASK_INTEGRATION_OFFLINE；P1/P2 为 0**。审查绑定的生产页及 presentation 与既有生产独审一致；本次没有重开生产方案。完整构建、实际候选及手机结果不属于本报告已验证范围。

r10 只包裹真实 `requestedTimePresentation` memo，原四项依赖和生产 selection／accepted scope 保持一致。准备完成可以得到 null，表示一次真实计算尝试完成，不表示几何供给或请求已成功。draw 在实际 request 时读取当前准备 ref，并核对所用 presentation 身份；等待中的 accepted／committed 回退、无数据请求和保留的旧 draw 不会消费新准备。等时 memo 复用保留原准备 intent，不按新 state 补造准备。新供给、取消、外来 binding 和准备抛错均由实际源码 fixture 核对。draw 字段、调度依赖、资源需求、accepted setter 和消费者没有被 task 接入替换。

地形新增 `fileBytes`／`fileSha256` 来自 `read.promise` 返回的 **实际 `RasterImageFile`**。正常路径先由 adapter 对下载文件调用既有 `getFileInfo`，再由共享资源 owner 检查 bytes、预算、完整性错误和可用的 expected SHA，最后 resolve 给 hook；现成 ready 文件同样经过当前期待条件核对。probe 在 resolve 后、原 `setImageState` 前取标量，未增加文件读取、stat、hash、请求或重试。没有把 metadata 期待值当作已核验文件事实。

存在 expected SHA 时，平台 stat 请求 SHA-256，owner 不接受错误或缺失 digest。没有 expected SHA 时，adapter 不把默认 digest 标为 SHA-256；这种场景只可声称已取得实际字节数，SHA 保持 null。probe 对缺失／非法 SHA 和非正安全整数 bytes 分别输出 null，且不导出 URL、路径、坐标、原始 key、额外对象或错误文本。80 行、64 个短期身份、15 秒和单一 task own-key 的原有语义不变。`file_ready` 仍不等于原生安装或首个可见覆盖；手机实际 SHA 与 HTTP 侧、候选源码和动作的关联仍须现场读取并核对。

独立检查结果：当前1583份输入仅在内存变换，完整 r10 fixture **30/30**；地形7项与既有 adapter／资源 owner10项合计 **17/17**；实际变换 hook + 正常 adapter／owner 的5条内存端到端路径 **5/5**（正确 digest、错误 digest、错误 bytes、无 expected SHA、stat 失败）；有限 argv **12/12**。r2–r9 的三项 Sky helper 输出对照 **24/24**：controls 用实际模板，surface 用实际生产源码，page 用完整字符串替换边界输入；作者对历史完整 raw 页的24项结果按其原范围复用，本审查未用 Git 重新恢复历史 raw 文件。旧 helper 等价不意味着使用当前模板重建可复现历史完整候选；新增地形字段属于当前模板。

旧 r9 六件 owner 与三件地形模板已逐件复核冻结 SHA。当前 task、生产与正常文件 owner 的精确绑定、执行结果及限制见 [机器记录](R17-NORMAL-R10-INTEGRATION-REVIEW.json)。一条审查 harness 起初用 `deepStrictEqual` 比较两个 VM realm 的结构相同对象，因原型身份失败；改为逐一比较 source 字符串和数值后24项通过，没有修改产品或待审脚本。复用既有133项生产验证和1583输入严格语义检查，不重复同一轮生产审查。

本 agent 只新增这两份审查结果，没有改生产／脚本，没有 prepare／build／inspect 主调用，没有创建候选、操作设备／IDE／feedback／服务／账号／存储／配对／VPN，也没有 Git 操作。root 可以沿当前方案完成构建和现场验证；本报告不关闭实际跨日、持续普通预览、完整 A/B、Apply／持久化、地形收益或其余 Goal。
