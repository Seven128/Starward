# 栅格文件删除失败后的预算恢复

2026-10-21。承接 [资源 owner 审阅](R22-OVERLAY-LIFETIME-OWNER-AUDIT-20261021.md) 中已复现的文件清理问题。只修改 `raster-image-resources.ts` 及其现有测试；没有改动 PLAN/HANDOFF、其他生产 owner、设备、IDE、服务、构建或远端数据，也没有 Git 写入。

## 修复及边界

先前一次空闲文件 unlink 失败会设置 `cleanupFailed`，随后 `makeRoom` 永久排除该文件。即使文件系统已恢复，后续视野请求也不能收回这个名额；生产单例没有调用测试中可重试删除的 `close()`。

现在每次新的预算申请都可重试无 reader、无 native pin、未处于删除中的旧文件。该次 `makeRoom` 记录失败的**物理路径**：一次失败后不经同路径 alias 再次尝试，继续考察其他空闲文件，无可回收项时仍返回 `raster_image_budget_busy`。下一次实际需求重新有资格尝试。成功删除后的原有文件/字节释放、alias detach、串行 mutation、reader 取消和 native pin 保护保持原 owner。

失败仍保留文件及账本，不提高八文件/16 MiB/两下载的生产预算，不添加后台轮询、计时器或重启全局 owner。这个修复处理编码文件清理恢复；不提供 native/GPU 退休确认，不解释 Sky allocation failure，也不关闭整体泄漏或手机验收缺口。

## 实际检查

新增两条真实 owner 行为回归，先只加入测试并对未修生产代码运行：**两条均失败**。

- `later demand retries an idle failed deletion while retaining the live native file`：A 空闲、B 持 pin，删除 A 一次失败后再申请 C。修前删除调用始终只有一次；修后新申请删除 A、取得 C，B 全程受保护，成功后文件数和实际字节账本准确。
- `one budget request does not repeat a failed physical deletion through idle aliases`：两个 idle entry 指向一份已校验文件。修前一次预算申请会尝试同一物理删除两次；修后每次申请只尝试一次，连续故障保持有界拒绝，恢复后同一 owner 可取得 C。

修后检查：

- `node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/services/raster-image-resources.test.ts`：9/9 通过。
- `node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/services/raster-file-adapter.test.ts apps/wechat-miniapp/src/services/map-raster-files.test.ts`：4/4 通过。
- `npm run typecheck --workspace @starward/wechat-miniapp`：退出 0，无诊断。

这些测试使用现有 in-memory adapter，没有删除真实手机文件。未重复 native remove 九轮反例；原生永久 pending、外部卸载、三层持续操作/资源回落及目标收益仍按原证据保留。独立修复审阅与后续整合候选由 root 继续安排；本文件不认证它们已经完成。

## 本次字节

| 文件 | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/services/raster-image-resources.ts` | `db2291fbb31e0484ce35cb06a73d012eb4cf5f93e28d45f61bb3527c1ffc26d3` |
| `apps/wechat-miniapp/src/services/raster-image-resources.test.ts` | `411d40341c15551bc9d621e28e33699b2b4395e790e2771fff0249cf13895f10` |

冻结 r22 prepared 字节没有被本次修复改写；同包 Stable 对照应继续沿其原绑定，后续产品候选再合入该修复。
