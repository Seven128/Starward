# 云观星公开 HTTP 与 SDK 格式修复

沿唯一PLAN A/B/F支撑合格图像接入，修复现有公开接口声明与实际HTTP格式的差异；没有新增图像、编码、来源、正式采用或发布。当前结果和源码/日志SHA绑定在 `output/sky-public-contract-2026-10-10-r1/result.json`。

旧SDK把七类月球/行星的裸清单及图片、Moon coverage和HiPS部分响应声明成`ApiEnvelope`。真实before检查在Moon的200响应上按旧声明读取`.data`得到undefined，而完整清单存在；`before-body.log`与当时的`before-bindings.json`保留这个逃逸缺陷，不以新版通过抹掉。首次controller编辑的换行`satisfies`造成transform失败，原`after-body-route.log`也保留，随后修正。

公共operations原112项全部保留，新增12个已存在的精确版次清单、SAO原始分片及HiPS权益路由声明，改正19个既有响应的封套标记。SAO文件返回`SaoStellarTile`，普通分片API仍是`ApiEnvelope<SaoTilePublication>`；没有把二者混成同一格式。共享天体handler沿现有`BODY_IMAGE_KINDS`准入与映射，不增加天体家族。路由检查按这个已准入枚举展开两个共享路径，仍严格核全部路由、重复项和operation ID，不屏蔽差集。当前124项精确匹配。

六个受影响API测试文件共15 PASS/0 FAIL；当前API与miniapp typecheck exit0，generated SDK check CURRENT。真实Nest/Fastify读回覆盖七类天体当前/精确清单及完整图片bytes/hash、独立Moon coverage、旧Moon image-only alias、未知版次/家族拒绝、HiPS当前/精确清单和index/tile、可变权益发现/不可变说明正文，以及SAO原始JSON/封套API/GET/HEAD/304、字节篡改及合并读取。权益测试使用明确synthetic本地fixture，只证明合同与完整性，不提供实际素材许可；HiPS默认仍关闭。Prepared当前/精确目录与恢复原检查同时通过。

当前发现维持no-cache，精确版次与图片维持immutable，权益发现维持no-store。没有改公开URL、已出版正文或旧图片别名；未知hash不替换成current，image-only alias不补造清单。三份Prepared合格候选的默认registry和正式采用仍空。旧原生构建/严格源码指纹不能因本次SDK源码变化冒当前验收；精确旧文件与对应Scene输出继续按原输入范围复用，未重跑无变化的55帧。

历史 `global-sdk-route-surface.json` 的raw反射/七项差集FAILED回执仍保留；当前共享准入域展开及实际HTTP格式通过解决了该结构检查缺口，不认证全部运行义务。原生Canvas/控件截图FAILED_DEVTOOLS_OUTPUT、原因UNKNOWN_PRODUCT_VS_DEVTOOLS、科学UNKNOWN、旧static reader拒绝旧九项/新22项、实际rollback/off-host/容量和设备验收、独立审查MISSING均未提高。完整33项及PLAN不改。
