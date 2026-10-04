# B2 冰巨星历史纬度候选：离线加工与出版失败恢复

本轮按用户“尽量先完成非真机工作”只处理可独立成立的数据链，不占 Android、现用微信开发者工具或共享服务。官方 [MAST OPAL HLSP](https://archive.stsci.edu/hlsp/opal) 当前把这些产品列为 CC BY 4.0；[MAST 数据政策](https://archive.stsci.edu/publishing/data-use)说明再提供第三方时许可随数据传递。[Uranus Cycle 33](https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33)、[Neptune Cycle 32](https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32) 是具体产品页。源 README 和 TIFF、哈希见上一份 [来源核查](b2-remaining-appearance-sources-2026-09-24.md)。没有采用 DSS/Gaia/ESA 成品图，也没有发布任何新行星资产。

新增 `data-pipelines/planet-textures/publish_opal_ice_giant_bands.py`，在现有共享 `opal_latitude_profile.py` owner 上固定两份官方 RGB TIFF 的 SHA/721×361 几何，只导出经度中性的有效纬度条带，不把 2025 年特定云经度映射到当年以后的星图。官方源给天王星东经向左、海王星西经向右的不同方向；丢弃经度后不能据此称当前云位。来源的增强色、观测日期、CC BY 署名和处理变更以后若采用必须随发布物披露。

| 候选 | 有效源纬度行 | 8×512 PNG | SHA-256 | 输出透明边界（第4列 alpha） |
| --- | ---: | ---: | --- | --- |
| Uranus 2025a | 207/361 | 421 B | `308d1521b5f0adebc14249c686664907335cdf8e0334a5a7008392b62b66c817` | 北端255、南端0；实测对应输出行0–293 |
| Neptune 2025b | 302/361 | 527 B | `447b4fc50a47b025cbaf5c1e4e5a0a8df8b1403c3706ba4b46fd432e7de391e0` | 北端0、南端255；实测对应输出行84–511 |

候选 PNG 在本证据目录，仅作检查，不在 `workers/miniapp-api/assets`、API 清单、Mini 包或商业网络请求中。首次 LANCZOS 缩放把缺测边界扩散为非零的部分 alpha（天王星最远至296、海王星最早至80），这会让少量未观测纬度呈现颜色。现只为冰巨星候选增加独立的最近邻二值覆盖掩码，RGB 滤波前仅在不可见缺测行延展邻近有效色；重算后实际图的 alpha 仅为0/255，测量覆盖之外完全透明。两项 Python 回归包括缺测掩码与编码中断保留旧目标。木/土的默认加工路径及已发布哈希未改。不能从源“360°拼图”推出完整球面颜色。

同一共享出版函数原先直接覆盖目标 PNG；编码中断会损坏上一次有效资产。现先写同目录独立临时文件，完整读出并计算哈希后原子替换；失败时只清理本次临时文件，原有哈希绑定资产保持不变。`test_opal_latitude_profile.py` 注入“写一半后编码失败”：旧目标字节保留、临时文件无遗留，随后同源重试发布成功。1项恢复测试通过；现有土星 2025a 正式源重算仍为1003 B、SHA `68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c`，与现有服务资产字节一致。默认 `python` 缺 Pillow，运行使用本机 Codex 工作区 Python 依赖；这不是修改项目运行依赖。

再核出版边界发现源图全部黑/无有效纬度时原函数会成功输出全透明“成品”，调用方可能把无内容当正常发布。先写失败用例证实旧行为，现改为在创建临时文件前抛出明确错误，保持旧资产不变且不遗留文件；3项 Python 测试通过。两份有效冰巨星候选重算仍是上表哈希，正式土星源再重算仍为1003 B、SHA `68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c`。这只防全空成品，不声称少量有效行已足够成为完整球面。

随后完成不依赖 shader 的报告数值边界：BFF 用 Astronomy Engine 在每颗行星的光发射时刻计算天王星/海王星本体轴，再用报告接收时刻的观察者 ENU 变换；合同把这两颗的 `bodyFrame` 设为可选且严格校验，旧客户端无轴缓存仍合法。Mini projector 遇到两颗的坏轴只撤表面方向、降 PARTIAL，保留七颗位置/相位与独立天层。两时刻的七行星金标核两颗轴正交/单位化/实际变化，正式点的真实 HTTP 报告核同一时刻传输两颗本体轴，Mini 坏轴恢复测试核消费者；BFF 数值16项、HTTP 2项、Mini 4项、三个包 typecheck 与 SDK 合同生成校验均通过。

另用独立 [JPL Horizons observer API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) 的 `CENTER=500@399`、`COMMAND=799/899`、`TLIST=2026-09-22 13:00 UT`、`QUANTITIES=14` 金标复核本体轴：天王星亚观测点东经111.972918°、行星面纬度+76.149715°；海王星西经166.852223°、行星面纬度−19.473955°。测试从服务同刻轴与视线独立计算中心经度，并按 NASA 1-bar 赤/极半径将心纬度转面纬度；分别处理两星相反经度正方向，容差0.2°，BFF 金标17/17通过。这解决本体轴与图源纬度体系的独立数值方向检查；不验证微信 shader 对候选色带的实际采样或最终像素，也不能把经度已丢弃的历史云带称为实时云位。

Mini 的现有盘面 owner 已用 [NASA 天王星](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html)／[NASA 海王星](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html) 1-bar 赤道、极与体积平均半径，在有效同刻轴下投影两颗扁球轮廓，并沿用平色相位 shader、地平裁剪与点选轮廓；旧报告缺轴回退球面但不丢位置或相位。相关盘面测试16项、Canvas 同帧和拾取组合17项通过，Mini/API typecheck 再跑通过；未新增 GLSL 程序或图片请求。

正式 Taro WEAPP 构建在专属 `dist/weapp-check-sky-ice-20260924` 槽退出0，没有触碰活动输出或 IDE。保留既有 CSS 顺序和两大 JS 文件的3个 warning；257个文件原始求和4,410,628 B，主包按分包前缀排除后2,070,292 B，距2 MiB仍余26,860 B。这只是静态文件总和，不是微信官方上传包计量、手机加载峰值或 Canvas/WebGL 编译结果。

**未完成**：冰巨星候选尚无正式清单/服务/图像消费链；目标 WebGL 中纬度采样、透明回退与原生像素仍缺。土星新 shader 的目标 WEAPP 编译/像素和手机资源峰值仍属 P1/P4。离线候选、本体轴和扁球轮廓是局部开发成果，不等于 C05 商业产品整体交付；不在 P1 最小平台风险未验前把新图加入正式 shader 依赖。
