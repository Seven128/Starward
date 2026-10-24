# R20 行程阶段精度与恢复 pending 增量独审

结论：**本次 App 源码及实际 React/client/HTTP/SQLite 增量审查范围内通过，未发现新的 P1/P2。** 原先秒／毫秒与 DST 重复本地小时的两个实际差异反例均已通过；新版本引用的未知结果、当前 B 私有投影、A 原键确认与后来更高 current 也已独立执行。不是实际 Native 画面、完整行程 family 或 Goal 验收。

## 范围与输入

按适用 AGENTS、global/default Context、Native Screen Contract、DESIGN、Source 的 versioned-editing／version-and-share-actions 及唯一 PLAN 的 historical restore closure／exact stage comparison display 审查。使用 starward-interaction-design 的 Native 状态／恢复和文字可读性方法，没有重设计、创建资源或套用 WEAPP。用户后置层叠／Sky Play 性能的最新顺序保持，未做性能或现场工作。

已读取[原 App 独审](R20-ITINERARY-REVISION-APP-REVIEW-20261025.md)和[批修报告](R20-ITINERARY-RESTORE-REVIEW-REPAIRS-20261025.md)。修后清单为 `tmp/itinerary-restore-review-repairs-20261025/source-freeze.json`，object.files **24 项**，manifest SHA256 **0c4bd6e0d5efb3d367f6899c34cb011db790f59b433d4584adc02040ba2ceaee**。开始及结束都逐件核对长度／SHA，完全一致。本次没有生产源码、合同、PLAN、HANDOFF、Context 或 Git 写入；API/reference 事务语义由配对独审负责。

## 阶段瞬间差异

直接使用原审查的 `tmp/review-itinerary-revision-app-20261025/subminute-preview.test.tsx` 与原 config，没有替换生产 formatter、command、client、route 或 SQL。实际 ItineraryScreen → client → Fastify inject → SQLite，只有 Native 原语、shell 与原生 storage/crypto 适配器沿已有 bootstrap 替换。

**两条原严格反例 2/2 通过**，日志 `tmp/review-itinerary-precision-pending-final-20261025/precision-original-counterexamples-after.log`：

- 同 stage 只变化受支持的秒／毫秒时，当前／恢复后两行已可区别，实际一次恢复仍将 SQL 中时间恢复为原完整值并生成新 revision 4。
- Europe/London 的两个不同 UTC 瞬间落在同一 DST 重复本地小时，当前／恢复后也已可区别，实际恢复仍回到所选旧瞬间。

源码 `stageComparisonTime` 保原本地可读摘要，并附经既有 `normalizeUtcMoment` 得到的完整 canonical UTC（含毫秒）；没有通过截断保存值或只增大显示差异文字来通过。历史摘要 updatedAt 仍用原分钟级 `localTime`，没有无关格式迁移。

stage diff 的实际 Text 和其 `difference`／`comparison`／`panel`／ScrollView 祖先没有单行 `numberOfLines`、固定最大高度或隐藏溢出的新限制，源码允许多行。**上述 Native 原语替身没有真实布局，因此实际设备像素、换行和长内容可读性仍未验证。** 不把字符串可辨识当作 Native 视觉通过。

## 新引用恢复的实际消费者恢复旅程

独立增加一个临时实际 UI 旅程，只复用上述 bootstrap 与真实 `privateDraftHttp`，没有复制新持久化平台。原件在同一 review tmp 的 `reference-pending.test.tsx`、`pending.vitest.config.mjs`、`reference-pending.log` 和 `reference-pending-result.json`；**1/1 通过**：

1. A 的旧 revision 2 与 current 3 有真实内容差异；通过实际恢复按钮提交后，服务端已保存 revision 4，但暂丢回复。原 pending 为 `restore-draft`，冻结原 itineraryId、baseRevision 3、sourceRevision 2、原 key 与 A 资格；实际待确认文案显示“恢复版本 2 · 基于版本 3”。
2. 关闭历史后原 pending 不变。可信 resolver 切至 B，并建立 B 自己的合成基线；实际界面显示 B 资料，A 的原目标 id、恢复版本文案、旧标题／出发地不显示在 B 的待确认内容中。
3. 在 B 界面按原重试，实际返回403。原序列化 pending **原字节保持**、current authority 仍为独立 ready B；这次重试未给 B 新增效果，B 自身基线仍 revision 1。
4. 恢复 A，并在服务端将 current 正常编辑为 revision 5。卸载／重建实际消费者及 client 后，待确认仍指向原 source 2／base 3；再次按重试，原键回执确认后读取权威 current，界面／SQL保持后来 revision 5，未倒退到原恢复结果 4。

三次实际 POST 状态为 **[200, 403, 200]**，body 完全相同，限制头均绑定原 A；原恢复确认后 pending 清除。所有请求沿真实 route/service/SQLite，未建立 TCP listener、未请求外部 HTTP 或触真实账户。此处 consumer/client 重建仅证明对应适配器与协议，不证明实际 AsyncStorage 原子性或进程杀死恢复。

## 源码与现有机制核对

- 新 `restore-draft` 仍进入同一 owner-qualified／pending owner。资格元数据只保本地；wire 保原引用和 key，retry 不用当前 B 资格改写 A，旧 create/patch pending 解析分支未转换成新恢复命令。
- client 在 receipt 确认后另读原 owner 的权威 current，并检查版本不低于 receipt；Screen 按当前资格发布且保留 cache 中更高 revision。未知 readback 不被当作已确认保存。
- 新 restore-source 拒绝码只在 restore retry 分支认作已有 receipt 查询后的拒绝；普通 parser／authority／未知失败不被扩成原 attempt 没提交的证明。具体后端产生点和 alias 由配对 API 独审核验。
- 历史选择／取消、未存表单、明确冲突重比、历史响应身份与当前 private authority 仍由原 Screen/client/content owner负责。恢复引用没有替换这些状态；关闭预览不删除未知 command，未存输入阻止恢复，当前／源 id、owner、revision、schema和完整可编辑内容仍受检查。
- 原 same-owner 成功观察身份及旧拒权规则未在本次批修重写，既有定向证据按原范围复用，没有为了放心重跑整个 owner／类型／family 矩阵。

## 资源与剩余义务

两个 Vitest 调用均已终态 exit0；各 case 的 React root、QueryClient、Fastify、SQLite由原 afterEach 正常关闭，无 listener。结束后实读本 review 路径的 Node 进程数 **0**，没有杀任何进程。合成 TEMP 数据由既有 fixture 保留；未逐 case 记录目录映射，不将其描述为完整取证索引。原件、原失败和源清单均保留，没有删除或上传。

收尾记录为本 review tmp 的 `final-source-check.json` 与 `process-readback.json`，24 pins／manifest 与起点一致。独立运行结果不与作者55项或配对 API 数量相加。实际 Native 画面／触摸／键盘／系统 Back、AsyncStorage／进程死后恢复、production／混合版本／多owner、旧无原资格的可证恢复，以及完整行程／其它 family、完整 Goal 与后置性能/OOM义务仍未完成。Root 最终整合、交付和精确 head CI 另行判断。
