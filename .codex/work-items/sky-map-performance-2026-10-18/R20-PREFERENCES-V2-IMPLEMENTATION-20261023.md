# R20 原生 App 偏好当前态、回放和原子存储

基线为266df53ea48a65013b9a358cfc2ffeb28c274fcf；本批在新机同一checkout实施。依据[原合同核验](R20-PREFERENCES-CONTRACT-REVIEW-20261023.md)、原PLAN R20及native Screen/Source Plan。不占用微信IDE、手机、共享服务或原账户数据；本记录不关闭完整Goal。

**Web候选曾被真实检查推翻，现已修复复验：** [双标签页证据](R20-PREFERENCES-WEB-CAS-20261023.md)保原Web Locks/localStorage双确认丢写失败。最终已改IndexedDB事务CAS，并取得真实同origin双页、刷新、旧数据迁移、abort/丢回执恢复及新独审通过。旧模拟Web端口通过不提供原子保证；当前结果只指该新事务边界，完整Goal和设备验收仍未完成。

## 已实现的责任

- domain runtime 在原 `preferences-runtime-state` 保存v2当前投影：全部用户预设、当前选择、最后有效位置和目的地恢复提示。每个当前profile保留末次save receipt，active/location/destination各保末条责任回执；save同时改变该profile和active。无任意LRU/TTL、不删除用户预设；读回历史receipt时同时返回当前投影，不把旧保存重新当当前选择。
- `prepare` 固定完整JSON输入、调用nonce、当前全局revision及版本key。存量回执先比actor/operation/原输入digest，再replay；已退休旧key不能越过不可回退的revision栅栏变成新写。新命令拒绝非JSON值，字段顺序等价不产生冲突。
- storage接口要求真实compare-and-swap。Node SQLite与Expo适配用条件INSERT/UPDATE；Web使用IndexedDB同object store的readwrite事务，在同一活动事务内get/compare/put，仅oncomplete确认。旧AsyncStorage/localStorage只作一次原字节导入与恢复材料，null也有初始化记录，不支持事务时明确失败。每runtime串行只协调本runtime调用顺序，不充当跨实例原子性。
- 合法v1按stateVersion折叠，保持Map式预设顺序、save激活语义、旧destination别名及invalid-late-location保前一有效值；缺失精度/时间不补造。先把完整原始字节保存在内容寻址legacy archive，再CAS替换同一状态key；archive只作恢复材料。未知schema/结构失败保持原字节。legacy digest保原值，不从有损JSON重新计算冒充原输入身份。
- CAS/迁移丢回执先读当前状态确认；不能证明提交时报告unknown而非重发新意图。并发不同命令仅一个可确认该版本，另一方收到显式冲突；相同已提交意图可replay。
- 实际mobile facade/store/Wizard/quick profile保留完整候选、timestamp和prepared key。unknown重试不换命令；从未可能提交的first-stale或CAS冲突仅在下次显式重试重新prepare。已unknown/成功的退休命令不翻新。明确profile版本冲突会读取权威当前态、保草稿，用户核对后再次保存新revision。
- Wizard保存成功后推进表单基线；在途编辑的较新草稿继续保留。当前选择/位置/目的地各由对应projection应用，根hydration/早期动作与路由独立性保留。未确认保存的文案不再断言服务器/存储肯定未提交。
- structured acceptance改用真实完整profile和prepare，检查当前projection、SQLite restart及旧save回放仍保当前B；不再以generic token receipt替代业务效果。

## 实际检查及限制

1. 修改前实际运行原`changed payload` case，旧实现返回replayed而未拒绝，失败成立。首次根目录Vitest同时发现旧tmp副本；后续使用`--root packages/domain`限定当前源码，不把旧snapshot测试算本批结果。
2. `node tools/run-node.cjs --bin vitest vitest run --root packages/domain src/preferences/runtime.test.ts`：20/20。含同key异payload/actor/operation、等价字段顺序、退休key/修改baseRevision、固定实体反复写的有界当前态、全部新profile保留、v1迁移/原字节/未知schema、丢回执、真实双SQLite和重启。首轮发现旧Map顺序回归，已修后全文件复验通过。
3. `node tools/run-node.cjs --test tests/acceptance/structured/preferences-probe.test.mjs`：3/3。真实carrier通过；缺当前projection和回放错误历史projection两个反例必须失败。
4. task `scripts/r20-preferences-contract-review-probe.mts` 已替换原错误期望为正确契约。真实两个SQLite句柄同base0：一个确认version1，另一明确conflict；显式新准备后version2保两份，same-intent为succeeded/replayed；重启保alpha/beta/gamma与revision3。原件 `tmp/r20-preferences-v2-contract-review-cn2g7V/result.json` 已由root读回，`lostIndependentProfile=false`。不连接用户数据库。
5. mobile完整套件在最后三项独审修复之前：27文件81测试通过；后续最终受影响4文件33测试及typecheck通过。独立审阅者又实际运行`npm run test --workspace @starward/mobile -- src/state/preferences-runtime.test.ts src/features/preferences/PreferenceWizard.test.tsx`：2文件14/14。它们是不同批次，不能相加冒一次最终全套。
6. SQLite adapter行为测试通过真实Node SQLite执行Expo适配生成的SQL；原Web模拟锁端口测试已被真实失败证据否定并退役。最终storage6/6和typecheck通过。
7. 实际Chrome双页 `tmp/r20-preferences-web-cas-DKYwBL/result.json`通过：同expected直接CAS插入/更新各[true,false]；domain一成功一conflict；显式重试保两实体、same-intent一次效果、刷新保三完整profile；v1/v2旧字节/archive/null防复活、实际abort和提交丢回执均通过。root重新核全部bundle输入hash，错配0；新独审核原始CLI/输出/输入和事务实现通过。此结果不包含Expo原生、整个App浏览器UI、设备定位或视觉/手势验收。迁移后仍运行的旧版本页若继续写localStorage，不会自动合入IDB；仅声明启动前旧字节兼容和两个当前版本client的并发。

## 独立审查

新建reviewer只读核合同、PLAN原生义务、基线和实际domain/storage/mobile/structured消费者；三条实际P2均修复并复验：unknown已提交后改稿revision卡死、never-written first-stale重试卡死、正常保存关闭重开重复旧revision。另确认在途较新草稿保留。最终报告当前偏好范围无剩余已证实P1/P2，并独立取得上述14/14结果。实施和审阅代理已结束，不复用。

原源码/受控消费者独审后，另有新建Web reviewer核对最终真实浏览器结果、全部输入hash/CLI输出、事务/迁移代码，当前Web边界无剩余已证P1/P2。其指出probe可能被domain先报stale绕过CAS的缺口已通过生产storage同expected跨页直接检查补齐。所有实施/审阅代理已结束。

源码/受控消费者通过与目标运行时通过分别判断。F07共享夜/精确时刻/真实地点链接续实施；Map/Sky重构、原native资源/OOM、数据/设备/部署/交付以及所有R/H/A/N缺口继续保留。没有数据上传或Git提交/push。
