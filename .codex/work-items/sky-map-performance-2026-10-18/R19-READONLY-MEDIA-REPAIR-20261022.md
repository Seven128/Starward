# R19 任务 API 只读媒体供给修复

2026-10-22。已修复[首个失败边界](R19-MEDIA-READINESS-BOUNDARY-20261022.md)：任务 API 现在能沿原公开地点媒体路由读取已恢复的三份原件。8799 与 8798 的六次实际图片 GET 全部为200，MIME、大小和 SHA-256 与原件一致。上传仍关闭，未知图片/匿名写入被拒。没有重建、下载、复制媒体或恢复数据库；本子任务未操作手机、IDE、桥、PG进程、账号、VPN或构建。

## 接线与保护

- 仅在原 `tmp/r17-normal-profile-api.mts` 增加显式 `STARWARD_R19_READONLY_MEDIA_MANIFEST` 接线；未指定时保持原 disabled store。指定时要求配置的媒体模式仍为 DISABLED。
- 新 `tmp/r19-readonly-media-store.mts` 复用现有 `LocalFilesystemMediaObjectStore.read/close`。清单限定已验证的3个键，启动时及每次读取均核字节数/hash；未知键返回 null，`put/delete` 明确抛出拒绝，绝不委托原件写入/清理。`kind=local-filesystem`、`enabled=false`。
- 原私有配置逐字节未变：SHA-256 `561fa6c8839343d2ac69fdd13dad0c8e9e398e4de3be861e4cef0f8d977427a5`。清单仍为原1,262 B、SHA `7709818c2e9aadb416af34ddb147416652d0fac81dc71b900b4bcf943ffdc960`。精确上传ID、对象键与图片URL仅留私有证据。
- 没有修改生产 store/framework、路由授权、桥准入、PLAN 或 HANDOFF；readonly DB、禁迁移、禁提醒、匿名公开桥与8791边界保持。

## 实际验证

三项窄测试通过：真实文件读取/未知键与写拒绝、启动后字节变化拒绝、重复键/非只读清单拒绝。新增适配及测试严格类型检查通过；整个任务入口连同适配/测试的严格类型检查也通过。后者首次发现旧自定义 terrainCache 分支的 nullable `publishedDirectory` 类型不匹配，按root授权改为已有条件spread：没有有效值时省略可选属性。当前服务没有设置自定义 terrainCache，不运行该分支，没有因此再次重启。

本机真实清单检查还验证了一个**存在但未准入**的原件键被拒，`put/delete` 拒绝后8份原件完整目录清单仍一致。该检查只读既有三份图片，不把合成单测文件当真实媒体证据。

| 原引用顺序 | 8799 / 8798状态 | MIME | 大小 | 两端与原件一致的 SHA-256 |
| --- | --- | --- | --- | --- |
| 1 | 200 / 200 | image/png | 2,681 B | `71604c4b85c6ac1918bce627b2a1a7a2128670c9047982c25647fc8785db5036` |
| 2 | 200 / 200 | image/png | 2,669 B | `0dc8bb63bb468c7e740277b809a2201133518c2408fee889b985470ae04575b6` |
| 3 | 200 / 200 | image/png | 2,690 B | `f0d5b247aeebd3eadb3a95dcfd76b60115a2cbdc932341a313c6a79f7757a3d2` |

先通过同一地点的真实 field200读回三条原公开图片路径，再逐条沿8799及8798读取；没有用对象键直达路由绕过原地点/公开关联。

- 两端 capabilities200，`mediaUpload.enabled=false`。桥 health200，`anonymousOnly=true`、`accountRoutesAvailable=false`、`reminderWorker=false`。
- 同地点未知公开图片两端404；无身份的上传POST两端403。这仅证明匿名HTTP/桥边界拒绝，store自身写入/删除拒绝另由直接调用验证；未登录、未写账号或构造真实提交。
- PG55441实际连接执行 `BEGIN READ ONLY`，读回 `transaction_read_only=on`、`default_transaction_read_only=on`，最后ROLLBACK/关闭。媒体关联查询只限清单中的三条公开引用。
- 全部8份原件共20,360 B，前后逐文件大小/hash相同；排序清单紧凑JSON SHA `5916958d2aeb1a281c598828e4a3c24e66ad3362456152d03522e498ddac3e99`。原件未复制、覆写、删除或重新加工。

## 当前服务与准备条件

原8799进程PID45932、创建时间 `2026-10-21T17:55:09.155249+08:00`，停止前重新核实127.0.0.1监听、Node路径、创建时间、精确入口及完整命令行hash，保全原script/日志/身份后**只停止该进程一次**。原父PID39928已退出。PG PID25424及桥 PID44604未停止、未重启。

第一次新进程PID40916缺少显式API tsconfig，因 parameter decorators 编译失败自行退出；首次health连接失败如实保留。定位该边界后，使用仓库现成 `workers/miniapp-api/tsconfig.json`（experimentalDecorators=true）设置 `TSX_TSCONFIG_PATH`，启动新进程PID54572，没有再次停止其他进程。后一次过早health连接失败时PID54572仍在正常初始加载，未误当退出或再次启动；随后实际ready200确认就绪。

当前：**PID54572**，创建于 `2026-10-22T23:06:37.712723+08:00`，隐藏启动，Node24.19.0，工作目录显式 `D:/dev/Starward`。最终 `2026-10-22T15:14:03Z` 的实际 `/health/ready` 为200/ready=true，精确入口匹配，当前stderr为0 B。

原进程CWD及两个可选 terrain env 未直接证实，不冒称完全复原。按root明确授权采用新的准备条件：原私有配置不变；当前工具shell两个可选env均未设置，启动不指定自定义terrain cache/evidence，继续使用现有 TerrainService 默认磁盘缓存，未删除/复制/改名缓存。**API重启重置volatile Observation Context与进程内缓存；本次前后不得作为同条件性能对照。** 旧Context的恢复由现有产品流程处理。

当前磁盘入口 SHA `fe3d23fbc9f1d408ac046293880305624306df677506460a7e20f4b64f1610dd`；PID54572启动时入口为 `0c9d339b17722b2d3793aded407c75c6a5cc53249aa4f2aea596f25fae24ec37`。两者仅差上述未运行的可选分支类型修复，未为此再启动服务；私有目录保存了与启动回执hash严格相符的修前内容重建副本，明确标为由反向应用该单处类型修复重建，非新的运行回执。

适配 SHA `f0e25a4b1f7bbfd967f423f5f9c27f3db6ef158e61183d82903cb9da41e7ee15`；测试 SHA `2c484caf6473ec2a08cbe23c46b35e4beded8db7873794479a74e82c700e9800`。

## 原件与继续入口

全部本轮原件在：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/readonly-media-repair-20261022T150026476Z/`

包括修前script、旧API日志、旧命令/身份、失败启动及成功启动日志/状态、三键准入、全8原件前清单及前后内容比较结果、原公开关联、实际HTTP结果与最终健康。没有上传。

可复用的启动文本是同目录 `start-readonly-api-current.private.ps1`：显式配置/清单/API tsconfig/CWD，先核输入及可选env；8799已有监听就拒绝，不停止或覆盖进程；每次启动使用新的私有日志目录。它已做PowerShell**仅解析**检查，0语法错误，未执行，不能冒称这个helper已经启动过或已验证完整重启。当前健康服务由保留的 `start-readonly-api-configured.private.ps1` 实际启动。先前包含写入/执行helper的长shell命令被工具自动审批策略拒绝（仅给 `blocked by policy`，没有更细原因），未执行；随后改为仅明文写入和解析检查，未重试该启动动作。

root随后已在原gen7普通文章入口，fresh capture后点击实际“重试照片”，实看 `screen-0fb0f4ed-4f3c-4796-818f-a22890870075.png` 出现蓝底TEST隔离图，版权/非真实场地说明仍在。此项手机输入/观察由root完成，只属一个文章媒体的原生解码与呈现反馈；不是实际现场摄影、所有照片模板或整个Goal验收。私有HTTP结果中的 `phoneVerified=false` 记录于该次root手机反馈之前，未回改历史证据。后续来源页/返回及完整UI义务仍由root沿当前候选继续。
