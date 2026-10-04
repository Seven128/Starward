# 显式显示出版当前 source 清单纠正

本文件纠正 r95[出版证据](experience-m82-display-publication-2026-10-04.md)关于旧 checkpoint 覆盖范围的描述。该证据和 r94/r95 checkpoint 保持原字节，actual writer/PNG/来源/回归结果不改。

终端 continuity 首次断言失败：预期七个旧 source 变化包含 `publish_prepared_optical.py`，但 r94/r95显式清单都未收录这个已经存在的真实消费者。实际被旧清单绑定的变化只有六个：science共享合同和五个Sky文档/索引。不是其他业务改动。Prepared writer本轮确实迁移到共同IO/固定数组守卫；修改前23363B、SHA256 `26beb0b058a5da5241665d8ee0a4d42788405bfaed777efa257068aff5ee5873`已在首次修改前独立封存，但不属于 r94 的428 source绑定，不能把它说成被旧checkpoint核过。

当前清单新增这个既有Prepared消费者；同时保留11个本代新源码/回归/task。新的r96 checkpoint替代r95作为实时入口，而实际开发增量仍为本轮r95，未另跑出版或处理。continuity以r94作旧精确基线，按真实旧集合交集核六项变化，另外核新增的既有Prepared owner和本代源码；旧6786证据/六保护/进程/HEAD与暂存仍按原断言检查，未删减保护。失败记录见[continuity-r95-failed.json](../../../../output/sdss-m82-display-publication-readback-1004-r1/continuity-r95-failed.json)。

原73文件/Windows allocation计量发生在这项清单修复前，不倒填后来失败/修复/检查点为其计量范围。最终产品图质、API/静态/cache/Hook/Scene/Back、采用/成本/容量/独审等仍沿唯一PLAN开放；没有其他业务修改或部署发布。
