# 云观星商业版范围决定（2026-09-23）

以下保留用户本轮原话，作为当前目标的优先约束。对应产品和外部数据 owner 已由用户更新且 Context 校验通过：`project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md:23`、`project_context/external-capabilities.md:62`。旧目标、原始附件或研究与本决定冲突时，以本决定及当前 owner 为准；无冲突的细节继续有效。

> **云观星不用整体砍掉；商业版先缩掉几项依赖特定数据源的能力**。“无需新授权”指已有公开条款明确允许我们的商用方式，不是数据能免费下载就能自行部署和分发。
>
> - **去掉 DSS 深空影像源**：它的营利使用需要书面许可。光学巡天功能可以继续评估 PS1、SkyMapper 替代，但这两套影像的瓦片自托管与分发条件还没核完，暂不能承诺 Stellarium 式的全天高清覆盖。[MAST 政策](https://archive.stsci.edu/publishing/data-use)、[PS1 数据条款](https://registry.opendata.aws/mast-panstarrs/)
> - **去掉当前 Gaia DR3/EDR3 深星数据和 ESA 银河成品图**：这会降低可承诺的恒星数量和银河画面精度；已有 BSC/SAO 星表、星座及合规素材仍可用。Gaia 档案标注了非商业许可。[Gaia DR3 权利说明](https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/DR3.html)
> - **商业版暂不上 ISS 等人工卫星的实时位置、轨迹和过境功能**；彗星、小行星的动态位置也暂缓。现有接口能取数、算法能计算，但尚未确认来源允许我们按这种产品方式交付结果。找到条款明确、无需逐项申请的来源后，可以恢复。[CelesTrak 使用政策](https://celestrak.org/usage-policy.php)、[JPL 小天体 API](https://ssd-api.jpl.nasa.gov/doc/index.php)
>
> 全天浏览与缩放、现有合规星表和星座、日月行星计算、网格及夜间模式等仍按原生引擎路线开发。**现金成本上不安排新增逐项商业授权费**，但数据获取加工、云存储与流量、Agent 开发仍要单列；此前的云费用算例不是全天高清影像的成本上限。现有路线也不要求开放项目核心代码。

本轮后续用户问：目标文本是否应修改，如需修改，提供一份完整新文本供其全量覆盖。`GOAL.md` 保存完整替换文本；当前激活 goal 的实际内容以实时 `get_goal` 为准，不从此记录推断其是否已覆盖。
