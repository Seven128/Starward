# Mesarthim 主目录身份冲突定位

本轮在既有 PLAN C／C07 内核定一个实际未准入输入，没有改 PLAN、33项、目录、准入代码或已采用正文。先前“HIP为空守卫可能是唯一阻碍”的假设被实际 HD 冲突否定；移除守卫仍不能使这份固定原文匹配，不为这个未成立的修复增加测试。

[HEASARC BSC5P](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html) 官方 TAP 的有界 `SELECT hr,hd,alt_name FROM bsc5p WHERE hr IN (545,546) ORDER BY hr` 实际返回 QUERY_STATUS OK。原 VOTable 为1140B、SHA256 `973799a9466125083191d3a0bf2ebd02aadba173c3859b810ffebf5509e67c15`；复用现有 Astropy8.0.1 环境解码，exit0，得到 HR545／HD11503／5Gam1Ari 与 HR546／HD11502／5Gam2Ari，与项目当前 BSC一致。没有重建目录、改标量测量或借系统HIP。

固定 Gamma Arietis 文章及成员 Q10288208／revision2427179665 则将 HR546 绑定 HD11503。内部 Wiki 关系与有引用编号相符，不能证明其等于 BSC 身份。[当前 WGSN 名称表](https://exopla.net/star-names/modern-iau-star-names/)实际 Mesarthim 行为 `* gam Ari`／`γ Ari`，HIP空，且没有精确分量HR/HD，不支持交换编号或补HIP8832。本轮不裁定哪个来源的物理记录错误，也不声称所有其它来源不可用；当前条目仍 BASIC_ONLY，五个有名星源缺口保持。

完整实际请求、失败及判断在 [primary-adjudication](../../../../output/cloud-sky-catalog-identity-2026-10-12-r1/primary-adjudication.json)。原 `FORMAT=csv` 虽 HTTP200，但 QUERY_STATUS ERROR／Unsupported format:csv，保原失败；只针对这个实际错误恢复项目已有 VOTable协议。同目录 [astropy-readback](../../../../output/cloud-sky-catalog-identity-2026-10-12-r1/astropy-readback.log) 是已执行工具输出的如实转录，保存没有再次执行。default Python缺Astropy的失败也保留；没有网络安装、产品构建、旧检查重跑或影像操作。

限定只读独审见 [审查记录](independent-catalog-identity-review-2026-10-12.md)。这次取得的是来源冲突的决定性证据，不是代码修复、正文采用或目标运行时通过。
