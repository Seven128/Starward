# C 模块：SkyMapper DR4 原生观测的小样本与服务边界

2026-09-25 仅按[官方 SIAP 文档](https://skymapper.anu.edu.au/how-to-access/)对 M104 0.05° 方向作有界查询；原始 CSV/FITS/bitmask 仅留 ignored `artifacts/miniapp/cloud-sky-native/legacy-surveys-trial/`，没有放入商业包、服务或光学 TRIAL。此次不重新采用 SkyMapper 全空域或 CDS 已加工 HiPS。

## 权利和取得方式分开

- [DR4 发行页](https://skymapper.anu.edu.au/data-release/)明确包含经处理的原生观测图和 TPV WCS。[DR4 DOI](https://doi.org/10.25914/5M47-S621) 的 DataCite 原生元数据 `rightsList` 为 `CC-BY-4.0`，`resourceType=Dataset`，描述覆盖原始图、合成砖及伪彩图；这是比“公开可下载”更具体的许可依据。仍需在最终制品明确来源/改作、核选中内容属于该发行版；CDS 加工 HiPS 的数据库/派生物权利另算，不能借 DR4 DOI 替代。
- [官方引用页](https://skymapper.anu.edu.au/how-to-cite/)要求引用 DR4 论文和 DOI，并对 Survey/第三方观测有不同的致谢段落。其 `policies` 链接目前重定向至“Protected Science Projects”，并不能被当作已阅读到完整有效服务政策。
- [官方 cutout 页](https://skymapper.anu.edu.au/image-cutout/)明确：**不得用该服务系统性抓取大片天空**，滥用会被封锁。[获取文档](https://skymapper.anu.edu.au/how-to-access/)将切片限制为每边 <10′，不提供完整 CCD 批量下载，若需全 CCD/批量需联系供方。文件许可和源站容量/使用规则是两条独立边界；不能据 CC BY 4.0 通过便以 SIAP 扫取生产瓦片。用户当前未授权联系供方，故 C 的广域生产获取路径仍未落实。

## 真实接口与数据形态

以项目 OpenNGC M104 `(RA 189.99763°, Dec -11.62305°)` 查询官方 `dr4/query`：`SIZE=0.05`、`BAND=g,r,i`、`INTERSECT=COVERS`、`FORMAT=image/fits`、CSV。21,129 B 的原始元数据 SHA-256 `0a358a5c88ecb5b748e4cf3cfc983d5eb14cd97378329b2707193d634271c09`；实返22张候选，g=7、r=5、i=10。它列出独立曝光的 `get_fits`/`get_mask`、TPV WCS、曝光时间、观测时刻、像质与每帧信息，**不是**自动合成的同 WCS 彩色图。

只取 CSV 前三行同夜相邻 g/r/i 观测及各自 bitmask，共六文件 1,270,080 B。三图各 364×364、BITPIX16、282,240 B；三 mask 各 BITPIX8、141,120 B。g/r 分别5秒、i 10秒，像元约0.497″，FWHM 约2.75″/2.13″/2.18″；原图与 mask 都是带 PV 畸变参数的 `RA---TPV/DEC--TPV`，其 WCS 原点和旋转不宜套用现有只有 TAN 的一像素差异修复。三图 SHA-256：g `964d4e9ba0957d0e99bb011bae687cf2c8d31220cc59afaa79f4652ca35ec998`、r `1b84f8ae1819f3c5c96c3a9fd23c9eefb489f559e57c2db80cf1b0c591f954fb`、i `6bad41e771ab8772f3fd9e121e26b8c434d81083161abcb44438031e3b8f273d`；mask 分别 `ab9ab5e99820c2a9f2c3cc346a2cd500a33b133c65a56553a8e530caec21312a`、`a39190937b673909f9ad2c01cfa32875a1953501270681f9e711911ee1f9075b`、`27a961f0f835c1ef6882c266c59ae30772253f8139309726a1379a062be7ad4a`。

三张图的中央64×64 mask 各只有6个非零像素、中心像素为0；这比 Legacy Surveys M104 原生 coadd 的中心连续缺波段值得继续分析，但尚未解出 mask 各 bit 的确切语义或跨帧配准，更不能从输出 DN 最大值代替原始饱和判断。DR4 的单次曝光和多帧拼合、色彩/坏像素、目标完整尺寸、上游许可归因与生产获取仍缺，不将小样本提高为合格成品。

**当前决策：** SkyMapper DR4 原图仍是有明确 DOI 许可线索的候选；SIAP 只用于当前小范围验证，**不用于系统性生产瓦片抓取**。除非找到无需逐项申请、且遵守源站规则的合法规模化取得方式与可发布质量/成本证据，维持商业光学关闭。可与 Legacy Surveys 的小范围可行/高亮目标失败事实并列，不靠下载成功或可计算 WCS 缩小 C06 的真实义务。
