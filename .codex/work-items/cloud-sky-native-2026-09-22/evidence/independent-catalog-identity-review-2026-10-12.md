# Mesarthim 主目录冲突限定独审

审查者为用户已授权的只读子代理 `cloud_sky_missing_hip_review`。范围只含实际 BSC／固定文章／关联实体、名称映射与准入 owner、NASA和IAU新回执及PLAN边界。子代理未编辑、联网、执行测试／构建或操作IDE／设备／图像；已完成并结束，不复用。根代理执行的Astropy结果由工具输出转发，子代理没有冒作自己执行。

独审结论：

- BSC v2/v3均为 HR546／HD11502／HIPnull；相邻HR545／HD11503／HIPnull。NASA原回执 QUERY_STATUS OK，核读了root转发的Astropy8.0.1、exit0解码结果，编号一致。此前CSV回执属于查询失败。
- 固定文章与Q10288208却绑定HR546／HD11503；即使移除HIPnull排除，原匹配规则仍因HD冲突拒绝，继续隔离Gamma Arietis合理。
- `build_bsc5p.py`直接复制原BSC行的HD，名称映射只供应专名与HIP。当前IAU行无精确HR/HD且HIP为空，不支持交换编号或借系统HIP8832。
- 这是PLAN C/C07内的来源冲突定位，无须修改PLAN；结论不构成产品修复、正文准入或运行时认证，也未裁定哪一来源的物理身份记录错误。

原始回执、绑定及执行者边界由 [来源证据](catalog-primary-identity-2026-10-12.md)持有；当前状态只见CONTINUE。
