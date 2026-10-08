# 原HiPS标准静态消费者开发结果（2026-10-06）

原光学HiPS没有标准静态枚举，canonical tile URL被writer拒绝；修前反例及原六文件字节已保。现在publication owner沿已有manifest/index/tile完整性边界逐项枚举精确版本，复用标准writer、index/fragment校验、history union及原子完成规则。manifest和index为原API consumer表示（含版本/同源URL），不是把带本地file的原root冒充wire响应。原root身份、原index绑定及JPEG字节保持。API和静态响应头共用小owner；既有可变discovery继续API/no-cache，精确版本metadata及原文件immutable。静态route仅接受canonical版本、源、合法order/pixel/Dir，拒绝越界、leading-zero、query和任意filename。

显式`opticalHipsTrialSkyPublicAssets(owner)`只接受TRIAL；没有加入`approvedSkyPublicAssets`、CLI、OCI构建、ordinary registry或release输入。标准bundle结构有效不是商业出版批准。原LOCAL/MEMORY注入和release-profile限制不变，普通HiPS关闭、Prepared空。既有path-only分类覆盖全`/v2/sky/optical/*`，仍是`optical_trial`，没有改成`optical_published`或放宽日志隐私。

原有限两版本实跑：旧11JPEG加root/index为13静态文件，当前20JPEG（9 order6、11 order8）加root/两index为23文件；现history union36文件，各版本URL/headers/bytes均保。当前20JPEG共2,691,868B，无下载、加工或预算扩展。当前23个API响应与标准bundle逐字节及header相同，两代实际HTTPS manifest/index均通过现前端validator，所有downloadUrl走到实际原文件。复用缓存的确切Caddy image digest（无pull），新隔离本机read-only实例实际111次HTTPS：36文件各GET/HEAD/304，以及可变discovery和两未知URL404。全部文件静态命中，已发布tile不再走API；Caddy真实`optical_trial`分类、request/resp_headers移除与identity body计量逐项核对。任务API/Caddy退出；没有重启原BFF/watch/DevTools、切production/current、部署或调用手机。

同长JPEG损坏仅注入任务的新source副本，沿现owner发生hash拒绝。root/index已经写进失败stage，但完成publication没有出现；失败stage原样保，旧/当前union完全不变。原sourcefresh retry生成相同bundle hash。该开发结果证明本机immutable文件/URL及失败保旧，不证明trusted OCI admission、正式release/rollback/current、off-host backup、目标容量、商业再分发或数据完整覆盖。没有为候选重造部署/保留框架或重跑旧112矩阵。

17影响检查与固定项目TS5.9 API类型通过。HiPS完成帧来源/Back的前一代19检查及实际page未重新跑；本轮无前端实现变更。当前来源成功提交身份仍不等于局部地景/跨源逐像素可见贡献，后者MISSING；完整图质、科学支持、cold/show/new-wide、DevTools/Android/iOS/月面、物理资源、独审及33项未整体通过。

当前唯一下一：Q1同帧可见贡献资格。先复用原Scene/地景遮挡/HiPS绘序及归因能力，以局部地景和跨源后绘覆盖小反例界定“成功提交但无可见贡献”，补最小owner处理与实际page消费者；不重跑闭合LOD/source Back矩阵、不靠生成mask补科学缺测。不新增复杂框架或盲扩缓存；数据覆盖/完整图质、商业发布及P1/A1各保剩余义务。

证据：[实际完整结果](../../../../output/ps1-hips-static-1006-q1-r1/result.json)、[新旧bundle](../../../../output/ps1-hips-static-1006-q1-r1/bundles.json)、[真实API](../../../../output/ps1-hips-static-1006-q1-r1/api-consumers.json)、[真实HTTPS](../../../../output/ps1-hips-static-1006-q1-r1/http-consumers.json)、[损坏/保旧/重试](../../../../output/ps1-hips-static-1006-q1-r1/failure-recovery.json)、[退出](../../../../output/ps1-hips-static-1006-q1-r1/cleanup.json)、[修前六文件](ps1-hips-static-before-2026-10-06.json)、[唯一PLAN](../PLAN.md)。
