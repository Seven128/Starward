# D 当前商业排除项的发布路径复核（2026-09-24）

核查的是当前工作区正式候选与本轮发布镜像，不替代生产部署取证或数据权利法律审查。

| 排除/待核项 | 当前路径观察 |
| --- | --- |
| Gaia DR3/EDR3 深星 | 共享 astronomy-core 源目录仍有历史 Gaia DR3 文件（供仓库其它责任保留）；Mini API Dockerfile 编译后明确删除两份 Gaia DR3 数据并在 runtime 断言缺失。对本轮镜像以 `--network none` 只读运行 Node `existsSync`，两份均 `false`。当前服务 BSC v2/v3、SAO v1/v2 的报告/搜索路径已由 HTTP 与 PG 组合验证；不能因源码在仓库中就误报正式镜像使用 Gaia。 |
| DSS 与 ESA 银河成品图 | 当前 Mini/BFF 发布资产文件名搜索未见 DSS/ESA 银河成品，现用 2MASS/W3 和坐标淡带有独立来源。NASA/ESA/HST 的 OPAL 土星/木星署名是另一个已核来源，不能把名称里的 ESA 当成被排除的银河成品。文件名搜索不证明所有内容/转运链的完整许可；按已采用素材清单继续核。 |
| PS1/SkyMapper 光学 | Mini 商业页面 `useSkyOpticalHips` 由 `__MINIAPP_DEVELOPMENT_FIXTURE_MODE__` 门禁，不发 manifest 查询；服务仅允许 `LOCAL + MEMORY_TEST + TRIAL` 注入，正式环境无 optical assets。本轮镜像 HTTP 非夹具 manifest 404 已实测。公共合同保留路由用于受控试验，不等于正式光学发布。 |
| ISS/卫星/彗星/小行星动态 | Mini Sky 页面和 BFF 当前服务/控制器未发现该类商业动态路由或请求。仓库保留独立 OMM 算法及数据客户端供其它研究/责任，不据此声称云观星已交付动态能力。这里只是当前代码入口范围检查，不证明未来配置或新路由自动符合商业决定。 |

本轮没有新发现需改产品代码。新增发布源或消费入口时继续由对应 owner 核权利、功能门禁与正式镜像资源；商业排除项不转为交付待办。Android、用户 IDE、共享服务未使用。
