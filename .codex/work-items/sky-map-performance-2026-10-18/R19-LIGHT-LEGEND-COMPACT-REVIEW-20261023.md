# R19 LIGHT 图例紧凑投影独审

结论：本批源码、科学语义与隔离编译消费路径未发现新增 P1/P2。修复针对已确认的重复文字/单位问题，保留五档固定色标；**旧手机 LIGHT 排版 P2 仍待新普通包实际画面复核，不在本独审关闭**。

## Candidate identity

本批为 WEAPP 日间局部采用稿的普通生产源码修复。上游为当前 AGENTS、`uiux_design/SKILL.md` 及文字层级参考、DESIGN 小程序档案 §5A.4、Map Screen Contract 与 `map-and-finder.md` 的紧凑层叠/年度夜光边界、[修前独审](R19-ADOPTED-UI-CAPTURE-REVIEW-20261023.md)。未重选或生成设计资源。

本代理实际查看了既有采用 `layers-light.png`（临时读回目录 `starward-r19-ui-capture-review-20261023-0915/delta/review-images`）及 gen14 旧手机 `screen-a3b630d2-8fde-4828-80ce-d66001ee295e.review-450.png`。前者为三项示意图例，后者为五档真实固定色标；示意项数不授权删档。采用源 review.mjs 的 12px 图例/gap12、全宽方角仍作为局部约束；后续真来源页要求继续有效。

本批审查时源码身份：

| 文件 | SHA256 |
| --- | --- |
| `map/map-layer-legend.ts` | `8f295e26cc6cfdc3b87bda0ee54b724fc41c171b1d5b537e233d6c4bba615830` |
| `map/map-layer-legend.test.ts` | `913dd52791b46fccfb6a8c1245f070c1f1e09cb8e0ada04f610e07e8b57ed5a8` |
| `map/index.tsx` | `49ad22a7e45d7995db9505907ea9300d4a2963bd17267c730a7b70dbb4a77219` |
| `map/map-layer-selector.scss` | `ca90932cd4149a558391720dc7c33cb3d640cafb34e6ebbad39e65cb503024c8` |

## Invocation result

使用 Root 已保全的 `light-legend-compact-repair-20261023/before.private.json` 与对应修前副本逐项比较。`index.tsx` 的本批差异只有导入、当前显示数据的投影调用和图例渲染三处；SCSS 仅新增共同标题规则。没有把工作区相对 HEAD 的其他未提交成果误算成本批改动。

Root 提供的三个相关测试文件 14/14 与正式 typecheck exit 0 结果在本批复用，未重跑全部测试。其首轮三个不完整 MapLayerData fixture 引发的 TS2352 由窄 `Pick` 输入类型修复，没有 `as unknown` 或放宽运行时合同；该失败不作为产品失败或通过证据。

本代理只读 Root 唯一隔离构建 `dist/weapp-check-r19-light-legend-20261023`，没有启动第二次 build、IDE 或预览。原 build.log 末尾为 webpack 5.91.0 compiled with 10 warnings in 29297 ms；构建进程最终 exit 及包身份由 Root 原执行回执持有。

## Observed product behavior

修前 gen14 实图中五档每条都重复“年度夜光”和 `nW/cm²/sr`，确实形成明显的五行内容。新代码只在 `LIGHT_POLLUTION`、raster method/style/unit、五档项数，以及每档按序的 label/color/完整 range 全部与当前 `NIGHT_LIGHT_FIXED_SCALE` 一致时，展示一个共同标题 `年度夜光 · nW/cm²/sr`，五项保留“很低/较低/中等/较高/很高”与原范围。

原范围 `0–0.5`、`>0.5–2`、`>2–10`、`>10–40`、`>40` 和各自原色均未改；不是 Bortle、SQM 或现场天空亮度的科学含义未被替换。既有年份/不随观测时间变化、EOG 署名、PARTIAL 缺测说明和来源页消费路径没有变动。

未知 method/style、不同项数或任一 label/color/range 差异不进入合并分支；有 raster 的未知图例仍保完整 label/range，不做字符串截前缀或单位。无 raster 的历史相对夜光保原 label-only 规则，云量仍按原 label/range。原 LIGHT 5 项、其他 4 项显示上限保持原消费者行为；本批没有将未来未知科学字段改成当前固定色标。

## Verified

- 当前实际服务边界 `getMapNightLight` → `readMapNightLight` → `NightLightService.layer` 原样返回 fixed layer；后者直接调用 `nightLightFixedLegend()`，raster method/style 来自通过验证的 proof，unit 为当前固定物理单位。`fixedNightLightDataset` 校验 method/style 及完整 policy，`readFixedNightLightProof` 再校验同一 policy、method/style/unit。因此当前被准入的 fixed 服务输出具备新投影要求的全部精确字段；合并分支不是仅测试 fixture 能到达的死路。
- Root 给出其只读核得的当前 nightlight 目录 `data-pipelines/runtime-data/releases/r6-gba-20261017/nightlight` 后，本代理只读其中原 dataset/index 的首个声明 proof，没有扫描所有源。原 inventory SHA 为 `d91fd8f7fcdd68d63f9a219df11fdad13673fefa2e1a99e313a148e29676c5bd`、509 项；选定 key `10-831-440-1-1`，文件 `nightlight-v2-8c5d859dccd524588cabb841c8f2360ba051b551eb0a595d6f933eb49798b342.png.json` 为 7152 B / SHA `2285e80af78390a753897a2a9cd0413281c00825051249b0f995eb62b6bdcf27`，逐字节/哈希与 index 声明相符，proof 完整 policy 与当前共享 policy 深相等。将它的实际 method/style/unit 和实际 `nightLightFixedLegend()` 结果送入生产 `projectMapLayerLegend`，得到一个共同单位标题及全部五项正确颜色/范围，有限只读核对 exit 0。
- 上述实际 proof 消费核对补足了仅构造任意 fixture 的限制，仍不是完整 `NightLightService.layer` 新实例执行或 live HTTP。本代理没有请求活动 HTTP、另读数据库或重复执行 publication producer，未将本地已发布文件冒充当前在线/手机读回。
- Map 使用 `displayedLightLayer`（先取 native installer 已呈现数据，再按原无 raster 回退）构造 `displayedLayer`，投影没有另读 pending nightLayer。由当前实际显示层决定图例的责任保持一致，不会把刷新中另一幅影像的图例提前标到旧图上。
- `MapLayerSheet` 直接导入 `map-layer-selector.scss`；编译 `pages/map/index.js` 实含新 projection 与 heading/items 渲染。编译 WXSS 有日间 heading 的 12Px/20Px/4Px 与原图例 gap12Px；原 flex-wrap、nowrap、色点及字号未改，没有用缩字、隐藏条目或固定裁高解决布局。
- 共享 `night-light-fixed-scale.ts` / `.json` 与修前私有副本逐字节一致，SHA 分别为 `712d15baad45edd878ae503c6225a0135bd9796bef36510e2347eccbb573655e`、`dcdba2b3b082d8c026778ac219a7dd828c7163f2d3e56e91f897dfc5aec1fb17`。现有 gen32 manifest 仍为 `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`，没有倒绑本批源码到冻结候选。

## Unverified

本批没有新普通手机包或对应实际画面，不能确认实际行数、高度、内容完整可读、与采用稿的当前视觉符合，也不能关闭修前 P2。后续沿 Root 已有设备/预览 owner，对新包的同一 LIGHT 固定色标实际结果复核即可；不因此重开 UI 选稿或全矩阵验证。

本批不认证其他主题、整页 UI、完整按压曲线、原生覆盖配准、叠层性能/内存、Sky 六字段或整个 Goal。源码与编译消费通过不能替代这些目标结果。

## Invalidated

采用示意三项不代替实际五档合同；旧 gen14 截图仅是修前证据，不是新源码渲染结果。当前 service/proof 源码一致不被表述为新在线 HTTP 或手机验收。Root 既有单次隔离 build 与冻结 gen32 保各自身份，未重建或改写历史证据。

## Cleanup

本代理只新增本报告；未修改任何已有文件，未重跑测试/build 或启动服务/collector，仅执行上述单 proof 的有限只读消费核对。未操作手机、IDE、推送、账号、N05、已交付 R6、冻结构建、私有原件或 VPN，没有生成/删除设计稿、提交或上传。已有采用读回临时目录与所有私有证据仍留给 Root。无在途子任务或外部操作，完成后交 Root 关闭。
