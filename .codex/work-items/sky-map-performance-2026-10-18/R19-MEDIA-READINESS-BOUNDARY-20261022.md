# R19 当前照片读取的首个失败边界

2026-10-22。只读定位当前 gen7 UI 开发环境的媒体供给；未操作手机、IDE、服务、配置或账号存储，未写数据库，未重跑恢复、生成或上传。除本报告与父代理随后明确要求的私有对象映射证据之外未写文件。照片来源模板可读不等于照片加载成功。

## 结论

当前失败首先落在任务 API 的媒体存储绑定，尚未到图片渲染/来源模板边界。8799 与 8798 匿名 `/v2/capabilities` 都返回 `mediaUpload.enabled=false`。当前监听 8799 的 PID45932 是 `node.exe`，命令入口匹配 `r17-normal-profile-api.mts`；未打印完整命令行或进程环境。

- 已有私有 `device-resume/api-environment.private.json` 选 `MINIAPP_MEDIA_STORAGE_MODE=DISABLED`，其 `MINIAPP_MEDIA_STORAGE_ROOT` 指向同根下空的 `media/`。这是磁盘配置读回，不冒充对进程环境的直接读取；当前 HTTP disabled 与它一致。
- 任务入口 `tmp/r17-normal-profile-api.mts:58` 自行构造 `MiniappService`，没有传 `mediaStore`。`miniapp-service.ts:746` 因而注入 `DisabledMediaObjectStore`；即使只改私有配置为 LOCAL_FILESYSTEM，此入口仍不会自动创建真实 store。正式工厂在同文件 `:800` 明确传 `createMediaObjectStore(config)`，责任不同。
- `DisabledMediaObjectStore.read()` 恒返 null（`media-object-store.ts:260`）。公开图片流程先核地点公开媒体关联与上传记录，再由 `contribution-service.ts:232` 读取对象，null 抛 `contribution_media_object_missing`。现有异常映射在实际 HTTP 上表现为 500 / PROVIDER_UNAVAILABLE。
- 8798 公共桥允许现有公开图片路由，并转发上游状态/内容；直连 8799 和桥 8798 同样失败，未发现需先修改桥的证据。

## 最小 HTTP 核验

只使用匿名公开路由，没有 Authorization/Cookie。没有打印完整媒体 URL、上传 ID、对象键或响应原文。以下 hash 只绑定当次响应字节；动态时间/requestId 使错误或 envelope hash 不适合作为稳定资源身份。

| 读取 | 状态 | 大小 | SHA-256 |
| --- | --- | --- | --- |
| 8799 capabilities | 200 | 1,771 B | `074f70d85415c13a2c1098bb9147082d3dde68e0c57bd31556419701f0549303` |
| 8798 capabilities | 200 | 1,771 B | `ee72aff0f111a64ab96ae30fee93aaf0c717384ee8c5c3d0cc667cbc07b0c5f8` |
| 当前隔离点 guides | 200 | 2,279 B | `c9a242e8656af738b779346f71ea45a91d179b6348eb80be45853fdec22a4f76` |
| 同点 field | 200 | 18,384 B | `02b7f15c5ada2de3a9b7e3c3affb01b3f43654c3b941ace2615273f50f8c9688` |
| field 引用图片1，8799 | 500 | 175 B | `8a80934afe59c9ee6c7b89659407f55527f6163905ca52fbae68909910a0cf47` |
| 同图1，8798 | 500 | 175 B | `c0c0d917cd4082b95c11cbe84ef91439b13b874177d389660d0d7960c8e47f33` |
| 图片2，8799 | 500 | 175 B | `1f4136a83fccf910dd538818f143d5a733d28a85d34b3c5e1a44eba67827f21f` |
| 同图2，8798 | 500 | 175 B | `8bb4c924afd4363d202c8cff273bf0fb4ebf64ffb36d803e749f7fd4e29846ba` |
| 图片3，8799 | 500 | 175 B | `265f74eebefe84570691dd804fd502c930a8f59be47adea73b48a029f7c838c8` |
| 同图3，8798 | 500 | 175 B | `3834b3983cd96226f624b26aabc47891b71dc5ac3c375066f035dbdc4fc27b57` |

一次未带必要查询条件的 overview 探查返回400；不将其算作该地点 overview 产品失败，未重复。随后使用可独立读取的 field/guides 获得必要媒体引用。

## 原件是否缺失

沿既有恢复 owner（`data-handoff-20261018/RESTORE.txt`、runtime lock 的 privateRecovery 指针）核对本机已恢复媒体，未下载/解密/恢复另一份数据。原件所在目录：

`C:/Users/momoooo/AppData/Local/Starward/private/data-handoff-20261018/media`

该目录有8文件，共20,360 B；当前 device-resume/media 为0文件。field 中三个公开媒体上传标识仅在内存用于匹配已有媒体文件名，每项恰好一份，并与既有 `archive-readback/FILES.json` 的路径、大小和 hash 匹配：

| 引用顺序 | 字节数 | SHA-256 | 既有恢复索引 |
| --- | --- | --- | --- |
| 1 | 2,681 | `71604c4b85c6ac1918bce627b2a1a7a2128670c9047982c25647fc8785db5036` | 大小/hash相符 |
| 2 | 2,669 | `0dc8bb63bb468c7e740277b809a2201133518c2408fee889b985470ae04575b6` | 大小/hash相符 |
| 3 | 2,690 | `f0d5b247aeebd3eadb3a95dcfd76b60115a2cbdc932341a313c6a79f7757a3d2` | 大小/hash相符 |

因此这三份既有输入不是缺原件。随后按父代理明确要求，以同配置的 loopback55441 只读连接做有界核对：`BEGIN READ ONLY` 并读回 `transaction_read_only=on`，仅对上述3个已有公开引用执行 `getContributionUploadObject` 的原SQL投影（只取 object_key/mime_type），最后 ROLLBACK/关闭连接；未查账号表或个人资料。三个实际 objectKey 均直接命中上述媒体根下的现成文件，各自字节/hash如表，MIME均为 image/png。不是只靠文件名推测；公开路由的端到端供给仍未修复。

敏感上传标识与精确对象键只留私有 `device-resume/r19-ui-20261022/media-readiness-keys.private.json`：1,262 B，SHA-256 `7709818c2e9aadb416af34ddb147416652d0fac81dc71b900b4bcf943ffdc960`；3项合计8,040 B。该新证据以排他创建写入原私有目录，没有原件覆写。没有查看/输出图片像素，以上不构成照片内容、真实现场归属或 UI 渲染验收。

## 可执行的最小修复建议（尚未实施）

只在下一次必要的任务 API 更新中修复这一媒体依赖注入，继续使用当前 PG、禁迁移/提醒和公开桥准入，不恢复数据库或账号。优先从上述已核对的私有恢复根提供**只读媒体 store**：复用 `LocalFilesystemMediaObjectStore` 的受控键/路径读取，在任务入口注入窄只读适配；`kind="local-filesystem"`、`enabled=false` 保持现有上传准入关闭，`put/delete` 明确拒绝，`read` 与 `close` 委托现有 owner。现有代码没有独立只读媒体 store 类，但已有 `MediaObjectStorePort` 足以接这一任务适配，不需扩生产框架或新端口。LocalFilesystem构造、read与close均无写入；put/delete不调用真实store。

`miniapp-service.ts:940` 的 capability 直接读注入 store.enabled，不读 config.mediaStorage.mode；contribution 创建上传与头像写入也先检查 enabled。因此**保持配置 DISABLED 并显式注入 enabled=false 的只读适配**，可以让公开媒体 GET 继续沿原地点关联/实际对象键读取，同时保持 capability.mediaUpload.enabled=false。反过来，直接注入原 LocalFilesystemMediaObjectStore（enabled=true）即使配置仍 DISABLED，也会把 capability 变为true，不满足此次最小只读接线目标。应只接已核对的恢复根（可按私有3键有限准入），保桥allowlist/readonly DB/8791不变；需核验不写入或清理原件。

若采用现有标准工厂而不做只读适配，则必须同时：使用新建且受控的媒体工作副本（复用既有字节、保目录结构并核对 hash）、将 task 配置选为 LOCAL_FILESYSTEM/该新根、在任务构造中传 `createMediaObjectStore(config)`；同时重新评估 capability 会变为上传可用的差异。只改配置、只拷贝文件或只改来源 UI 均不足。不要把可写 store 直接指向保留原件，也不要为此次 UI 检查开放账号路由。

修复后先通过**同三个公开图片入口**核验8799及8798均200、正确 MIME，响应字节/hash与相应已核对文件一致；再由当前手机候选读取实际照片并验来源页返回。手机验证前不能关闭本缺口。若实际完整 objectKey 仍找不到文件，保留具体缺项，沿既有恢复索引处理，不重产照片、不伪造现场图、不把来源页成功改写为照片成功。
