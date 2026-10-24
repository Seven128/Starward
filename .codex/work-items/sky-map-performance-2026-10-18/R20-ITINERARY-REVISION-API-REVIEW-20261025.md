# R20 行程历史/恢复 API 与版本语义独审

结论：**发现 1 项 P2；当前模块不能判整体通过。** 常规非空恢复、旧版本不变、原键重放、事务回滚和重开读回均已独立执行，但分次合法保存的历史内容可能无法通过完整恢复命令的请求准入。没有修改产品源码、PLAN、HANDOFF、Context 或 Git；未接设备、外部 HTTP 或共享服务。

## 范围和输入身份

读取适用 AGENTS、global/default Context 与架构/验证 owner、唯一 PLAN 最新性能后置顺序、Source 的 `REQ versioned-editing` 和 `CTRL version-and-share-actions`，以及作者实现报告。审查重点为 domain 完整可编辑投影/比较、SQLite history 摘要分页、service/routes、公开合同及恢复的实际事务效果；App 交互和 current authority 另由另一新审阅者负责。

开始及结束均逐件核对 object.files **24/24** 长度和 SHA 一致。冻结 manifest SHA256 为 `b6e165f5e05fa26c7d81fe1d6247163ea476d965412f1181e1b8eb7214c68df3`。没有把旧 main 576 的 CI 当作这份 WIP 的验证，也没有使用 Git 读取旧内容。

## P2：合法已保存内容的恢复准入不闭合

相关位置：

- `packages/domain/src/itinerary/draft-content.ts:70`、`:74`：恢复把历史 `title + inputs + stages` 一次完整投影成 `patch-draft` body。
- `apps/api/src/server.ts:117`：现有请求 body limit 为 64KiB。
- `apps/api/src/modules/itinerary/itinerary-routes.ts:14`：超限在命令处理前返回 413。

用现有 `privateDraftHttp` 的真实 Fastify inject → parser/service → SQLite 做独立反例：

1. 合法创建草稿，`origin` 使用40,000个 ASCII 字符的合成公开测试文本；完整 create body **40,342B，HTTP200**。
2. 合法 patch 加入200个不重叠、实际受支持的 `observation` 阶段（每段10分钟、唯一普通合成 id）；完整 stages patch **27,360B，HTTP200**，形成可读取的历史 revision 2。
3. 当前 revision 3 改成短输入并清空阶段，HTTP200。
4. 调用生产 `itineraryDraftRestoreInput(current, historical)`，完整恢复 body **67,596B**。实际 **HTTP413 / itinerary_request_body_too_large / outcome=rejected**，current 仍是3。

两个原始保存命令都在既有准入范围内，历史内容通过当前领域规则且完整保存在同一 owner 的不可变版本中；没有使用未知 schema、非法阶段、伪造授权或超限的原保存请求。问题是字段可以分别合法保存，恢复却要求合并为一个更大的完整 body。作者披露的超限文案及旧版本保留提供了安全失败，但没有交付这些已支持历史版本的恢复能力。Source 的恢复要求没有排除此类合法已保存内容，项目规则也不允许仅因现有传输限制缩减用户结果。

应沿同一 command/pending/actor/CAS/receipt owner 使恢复传输对合法历史闭合。例如可以考虑以受校验的不可变版本身份作为恢复输入；仍须保选中版本/比较 base、原 owner/原 key、完整字段和原子新 revision 的语义。**不裁字段，也不为此整体无界放宽所有请求。** 具体实现由 root/作者按现有边界决定，本审查未写修复。

反例原件：`tmp/itinerary-revision-api-review-20261025/body-limit-counterexample.json`。合成 DB 目录后缀 `OIzOcc` 保留，API/SQLite 均已 finally 关闭，无 listener。

## 已独立通过的有界行为

自有 `probe.mjs` 组合一条真实非空旅程，使用独立数据和断言，经实际 client fixture 的真实 API/SQLite；只替换未调用的原生存储/crypto 适配器，没有替换业务 route、SQL 或恢复函数。该旅程核对六组机制，不与作者 test 数相加：

1. 实际非空历史 HTTP/schema/private no-store/Vary，摘要只含 revision/sequence/title/updatedAt；空对象不能通过新 schema。
2. 历史内容包含所有可编辑输入差异和两个用户阶段；完整恢复形成新 revision 4/sequence 4，id/owner/timezone/createdAt/source/evidence/stops 保 current，旧三个 SQL version body 原字节不变。
3. 恢复后再正常编辑成 revision 5；原恢复 body/key replay 只返回原 receipt/revision 4，不覆盖 current 5；同 key 改 body 返回409。
4. 实际 SQLite receipt trigger 在 effect 后拒绝写入，当前行、version 和 receipt 同时回滚；去掉本轮合成触发器后，原命令安全重试生成 revision 6。
5. 旧比较 base 冲突不覆盖；三种不同无效 cursor 被400拒绝；可信 B 携 A 限制头为403，无头则看不到 A 历史而404，caller header不授身份。
6. 关闭原 API/SQLite 后从同一新文件重建真实 runtime/API，current 6 与历史2完整内容可读，所有已保存版本 body hash 一致。

证据：同目录 `probe.mjs`、`probe.log`、`result.json`；合成 DB 后缀 `aPMGS0` 保留。全部调用终态 exit0，无 TCP listener，原/重开 API 和 SQL 连接均已关闭。

## 合同/源码判定

- 新 route 复用实际可信 actor 与 restriction 后的 owner，history 查询始终同时限制 actor/id；SQL `LIMIT 51` 只读摘要、按 revision 降序，最多返回50项且 next cursor 排除末项。没有拉全 snapshot 列表或逐版本 HTTP 扩散。
- 恢复没有改写旧 version 或倒退 current 指针，仍由原事务与 CAS 产生新版本。完整投影和比较共用字段声明；API 输入字段也复用该声明，未知 inputs/stage 字段拒绝用于恢复，身份/证据不从旧记录带回。上述普通路径没有新增其它确认 P1/P2。
- 当前公开合同 **193 个内部 refs 均可解析**，新增 operationId 唯一。与作者保全的 `openapi-before.json` 深比较，仅新增一条 path 和一个 schema，其余语义一致；此比较不冒充独立 Git 基线核验。
- 实际成功历史响应与所测失败 envelope 经现有 Ajv2020 校验；format 注解未重新资格化。该边界检查不声称全仓合同或 Native 平台验收。

## 资源与保留义务

源 pin 首尾一致、资源关闭结果在 `tmp/itinerary-revision-api-review-20261025/final-pins-and-resources.json`。没有遗留 Node/helper 进程、API listener 或 SQLite 句柄；没有删除/上传任何原件，也未触共享 PG/API、网络/VPN、IDE、冻结构建、N05 或 R6。

本 P2 修复后需对相同合法保存/恢复反例作有界复核。Native 实际画面、AsyncStorage/进程杀死恢复、触摸/键盘/Back/生命周期、生产/混合版本/多owner部署、完整行程 family、完整 Goal 与后置性能/OOM仍未由本审查关闭。
