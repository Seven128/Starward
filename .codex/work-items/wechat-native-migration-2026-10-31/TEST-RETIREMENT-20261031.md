# 原生迁移前测试代码退役

用户要求：删除已编写的全部测试代码，保留业务代码；迁移期间不允许添加任何测试代码，代码质量约束继续遵守。当前范围为本仓库自有代码，不删除第三方安装包中的内容，不改写Git历史，也不删除历史报告、Profiler/Heap、截图和其他采集原件。

## 已执行范围

- **1,302个文件已移入Windows回收站**，逐文件核对回收站元数据、原路径消失及回收内容SHA-256；另有完整恢复ZIP。包括前后端/共享包/数据管线/工具/项目skill的单元与集成测试、E2E/合同/源码模式测试、专用夹具、模拟数据目录和测试驱动，以及仓库内对应历史测试源码副本。
- 清理根与workspace测试命令、测试专用Vitest依赖、测试夹具导出和CI测试步骤；锁文件离线更新。没有用空测试、成功占位或改名脚本伪造通过。当前CI保留类型、构建、真实数据/资产/依赖及发布保护，不再声称有自动化产品测试覆盖。
- 为避免悬空引用，只从业务源码中移除了测试专用入口：`MiniappService.createFromEnvironment`的内存测试仓库/确定性天气/光学试验分支、`createTestRuntimeConfig`及测试Sky provider重导出。正常PostgreSQL、真实天气及业务状态实现保留；旧MEMORY_TEST/fixture启动被明确拒绝。开发工具`--memory`入口同步退役。
- 发布工具中的空正式地点→合成地点模拟成功分支及对应provider模拟诊断退役，缺正式数据不能再冒通过；真实发布身份、权限、端口、数据完整性、备份/恢复和候选资源/包体保护保留。`inspect-production`中的模拟人口与源码子串测试已移除，实际产物检查保留。
- `tools/miniapp/device-test.mjs`是实际设备会话/截图/交互观察工具，不是自动化测试套件，保留；其测试与专用fixture已删除。输入校验/权限检查等业务功能、类型检查、真实数据准入与发布保护同样不因名称或assert语句被删除。
- 原来已修改的规则、Context、封存资料和新test-authoring Skill文档保留。新增迁移禁令优先于旧测试复用/适配文字；test-authoring Skill不是本次新增测试授权。

## 保全与证据

原始源码参考提交为 `f09da5e2762c6f80f387ded5a5de853b160e9924`。完整清单、操作前已有改动快照、删除回执、回收站内容校验及恢复包位于：

`E:/Dev/Starward-data/verification/native-migration-test-retirement-20261031/`

主要文件：`manifest.json`、`before/`、`retired-test-files.zip`、`recycle-receipts.jsonl`、`recycle-verified.json`、`edited-files.json`、`documentation-edits.json`。原私有数据/候选保全仍沿旧owner，未上传任何新材料。恢复单个文件须核manifest身份与最新用户规则，不整包覆盖当前业务源码，也不在迁移中自动恢复测试。

保留源码哈希清单覆盖1,347项；扣除明确追加退役的测试文件后，只有上述三个业务源码文件发生测试入口删减，其余保留源码字节未变。后续文档/配置修改不代表产品或迁移已经完成。

## 实际检查与限制

- 小程序合同、Mini API、小程序前端TypeScript检查通过；修改的JavaScript语法检查通过。
- 当前仓库剩余自有代码未发现自动化测试框架导入；活跃源码没有指向本次删除文件的悬空相对引用。
- 回收站1,302份文件内容与删除前哈希一致，源路径已不存在。
- Context、生成SDK一致性、修改的JavaScript语法、工作流YAML解析及差异检查通过；活跃package scripts和CI已无自动化测试调用。独立App API与管理后台类型检查通过。
- 保留的独立App类型检查未通过：`apps/mobile/src/features/map/MapScreen.tsx:140`的`/spot/[spotId]`与生成Expo路由联合类型不匹配。本次未修改该业务文件，也未生成Expo路由；退役的App测试没有该路由的类型扩展，未扩大范围修复App业务。不能声称全仓类型检查通过。
- 不新建任何测试用例或测试脚本，不以这些静态检查声称真实运行、迁移完成或历史测试仍可执行。

前端仍是Taro/React，原生迁移尚未实施；[迁移入口](INDEX.md)持有当前规则和方案要求。后续优化及原P1–P6仍封存，本次测试退役不解封旧实施任务。
