# Acrux 版本化候选（2026-09-24）

现有 BSC5P v2 的 HR:4730（`Alp1Cru`、V=1.33）`properName=null`；独立 HR:4731（`Alp2Cru`）也未命名。现行 IAU WGSN 表对 Acrux 给出 HIP 60718 / α Cru，但未在该行区分 BSC 双分量；同一已归档 IAU 名称表明确给出 `Acrux → HR 4730`。不能按亮度、近邻或共享 HIP 猜测。原始网页是已获取的固定快照，SHA 与 BSC v2 manifest 的两个来源字段一致。

新增 `data-pipelines/star-catalog/publish_bsc5p_acrux.py`，从不可变 v2 资产和 manifest、两份与 manifest 完全哈希一致的 IAU 网页生成 v3 候选；校验当前表的同名 HIP/Bayer、历史表的 HR、BSC 两分量身份，然后只给 HR:4730 填 `Acrux`。新 manifest 记录 v2 基底哈希及字段差异，不导入历史星位/测光。命令：

```powershell
python data-pipelines/star-catalog/publish_bsc5p_acrux.py --base packages/astronomy-core/data/bsc5p-bright-stars.v2.json --manifest packages/astronomy-core/data/bsc5p-bright-stars.v2.manifest.json --active-names E:/Dev/Starward/output/provider-selection-and-repair/adoption-2026-09-14/iau-names.html --archived-names E:/Dev/Starward/output/provider-selection-and-repair/adoption-2026-09-14/sky-expansion-trial/iau-name-identities.html --output-dir artifacts/miniapp/cloud-sky-native/acrux-candidate-20260924
```

实际输出：`bsc5p-bright-stars.v3`，8404 行，命名 467→468 行，新 SHA `ba9bef4144d4cfb4c706a5d1d8a0958d8303854e7bfabe780005b63e0c904c2c`；对 v2 逐行比较，唯一行字段差异是 `HR:4730.properName null→Acrux`，HR:4731 不变。新资产还改 `catalogVersion`。`python -m unittest discover -s data-pipelines/star-catalog -p test_publish_bsc5p_acrux.py -v` 1/1；测试含错误原始哈希与错误 HR 归属拒绝。`python -m py_compile` 成功；`git diff --check` 返回 0（仅既有已跟踪文件的换行告警；本轮新增文件尚未跟踪，故不由该命令覆盖）。

**当前只是一份 ignored 候选，生产仍使用 v2，用户现在还看不到 Acrux 名称。** SAO v1 完整源包在 `E:/Dev/Starward/output/provider-selection-and-repair/adoption-2026-09-14/sky-expansion-trial/sao-source/generated/`，它绑定旧 BSC v2 hash；826 分片和 index 当前由 `data-pipelines/star-catalog/publish_sao.mts` 生成。后续需将 BSC v3 资产/加载器、SAO 源包及分片新版本、BFF 服务/缓存/详情/别名、miniapp-contracts、Mini 加载/旧缓存及受影响测试一起迁移；检查新旧客户端/滚动发布兼容，不能仅替换服务端名称或在旧 hash 下改文件。再做真实 HTTP→客户端星图/搜索/资料验证，并考虑高影响独立审查。

独立 WeChatIDE 诊断：旧隔离 `s4`、新 compiled-root `s5`、新 source-shaped `s6` 项目分别运行 `simulator_open_page pages/map/index` 返回成功，但每次截图仍是 DevTools 欢迎页；`s5` 还试过导入和刷新，仍相同。`s6` 图为 `evidence/source-shape-open-2026-09-24.png`，其它 `evidence/standalone-after-open-2026-09-24.png`、`evidence/standalone-imported-refreshed-2026-09-24.png`。`compile_wxml`/`automation_runtime_info` 在欢迎页长时间无结果，调用被限时终止。三个隔离窗口均已关闭；两个新隔离项目目录在 ignored `artifacts/miniapp/cloud-sky-native/`，项目列表中仍可见。不再重复相同开窗尝试；这些命令成功不构成微信页面渲染或新 Canvas 像素证据。未动用户源项目窗口、Android、无线调试、二维码、共享 8787。

## 同日续行：运行时双版本接入与本地验证

版本化正式资产：`packages/astronomy-core/data/bsc5p-bright-stars.v3.{json,manifest.json}`；`workers/miniapp-api/assets/sao-v2/` 有 829 文件（源包、index、publication、826 片），源包 SHA-256 `c3aabc21b952719aac71d767e69f1ea501599dc3003b8816a92ca6e62ae29f25`；`workers/miniapp-api/assets/celestial-names-v2/chinese-bright-star-aliases.v2.json` SHA-256 `7607c378c79c438e1b5f56c15fc4e7153471e68360848c9cff8b214fc84c4fce`。旧资产未覆盖。SAO index 版本对基底执行 v1→BSCv2、v2→BSCv3 配对检查，瓦片亦跟随 index 校验。BSC 静态接口支持显式 v3；旧 SAO HTTP 与新增 `/v2/sky/supplements/sao/v2` 并行。操作清单含新旧路由，当前 Mini SDK 只调用新版。

SkyReport、位置、搜索、详情新增可选 `catalogVersion` 查询，缺省 v2 为旧客户端保留；当前 Mini 对报告、搜索、详情显式带 v3，位置带所选报告版本。`AstronomyService` 用目录版本分别建计算缓存和帧；搜索索引、资料缓存和 SAO/中文别名加载按同一基底版本分开。HR:4730 在 v3 搜索/详情为 Acrux，v2 仍为 HR 4730。直接服务测试和 HTTP 测试核对结果、来源及无效版本 400。Dockerfile 的发布镜像末段增加 v3 BSC、SAO v2、中文别名 v2 文件存在断言。

检查：`sky-scene-catalog.test.ts` 6/6；搜索/详情 16/16；SAO/别名组合 22/22；路由 manifest 1/1。最初 API 全量因旧 SAO 路由未列入操作 manifest 失败 1 项，修复并重新生成 SDK 后再跑 API 全量 364 通过/11 跳过/0 失败；Mini 全量 823/823。`npm run build:miniapp:release`、`npm run check:miniapp:sdk`、API/契约/Mini typecheck、`MINIAPP_ISOLATED_CHECK_BUILD=1 npm run build:weapp --workspace @starward/wechat-miniapp`、`npm run context:validate` 与 `git diff --check` 均退出 0。隔离构建仍有既有 CSS 顺序和 JS 大包/webpack 性能 warning（`sky/detail/index.js` 278 KiB、`common.js` 319 KiB）。production 条件的实际 JS 加载 `loadBsc5pStarCatalog(v3)`、Acrux 资料/搜索及 SAO v2 index 通过。双版顺次建立搜索索引后，单进程 Node24 强制 GC 样本 heap/RSS 从初始 16/85 MiB，到仅旧 108/299 MiB，再到新旧共存 192/388 MiB；没有建立容器并发上限或真机内存结论。旧客户端 HTTP→应用及新 Mini 正式 HTTP→Canvas/资料 UI、云部署/滚动发布和目标内存仍开放。未接触用户 IDE、手机、共享8787，未部署。

HTTP 定向补证：`celestial-object-position.test.ts` 的本地 Nest/Fastify 路由使用同一 Observation Context 请求 BSC v3 SkyReport，精确 HR 位置响应通过 Mini 客户端当前版本/哈希、时间与上下文绑定验证；非法版本返回 400，7/7。`docker build -f infrastructure/deployment/miniapp-api.Dockerfile -t starward-miniapp-api:acrux-local .` 退出0，镜像 ID `sha256:99e7814bdb3c0bf2b06c070f3fce1220f733fd7e8a574c526506cad1a882eb70`，Docker Size 144,827,674B；`docker run --rm --network none --entrypoint node` 的生产条件下实际从镜像读取 BSC v3、Acrux 资料/搜索及 SAO v2 index，并与 v3 hash 比对通过。没有开启 HTTP 服务、映射端口或部署。容器内 HTTP 与真机组合仍未验证。

另加跨边界组合回归：固定深圳正式点/2026-09-04 的 v3 SkyReport，Mini `attachSkyCatalog` 接真实 BSC v3 出版物；SAO v2 的实际分片 `00-09-10-0` 经同一精确帧投影得4个地平线上星点，旧 SAO v1 index 与该 scene 组合显式拒绝，`sky-scene-catalog.test.ts` 7/7。它验证实际数据和 Mini 投影逻辑，不宣称 Canvas 已画出。

同镜像在 `--network none --memory 512m --memory-swap 512m` 下顺次建立旧新两版搜索索引，强制 GC 后 heap/RSS 191/348 MiB，退出0；这里只采单进程索引，不是 API 业务并发。另以短命 `LOCAL/MEMORY_TEST` 容器把 8787 仅映射至本机 `127.0.0.1:18794`，真实 HTTP 获得：旧 SAO index=`sao-visual-supplement.v1`，新版 route index=`sao-visual-supplement.v2`，v3 搜索 `Acrux` 首项 `HR:4730`，v3 详情名 `Acrux`，v3 静态目录8404行且哈希为 `ba9bef41...904c2c`。容器 `--rm` 停止后已核实 18794 无监听、没有该镜像运行容器。无云发布、用户8787或手机干扰；未覆盖正式云环境容量与滚动切换。

再次以完整本地 API 容器而非只跑搜索类试验：任务脚本 `dual-catalog-http-burst.mjs`，发布镜像512MiB cgroup、LOCAL/MEMORY_TEST，18795本机端口；先分别建立旧/新索引，再同时执行40旧+40新版共80个HTTP搜索。全部200/FRESH且SAO来源版本匹配，样本 wall 572.3ms、p95 539.9ms，cgroup峰值349,794,304B、OOM=false；[原始结果](acrux-dual-search-burst-2026-09-24.json)。已停止并自动移除容器，18795无监听。此样本不能外推到生产DB/天气、不同负载/副本或目标设备；代码/数据未修改。

## 同日续行：SAO 与中文别名候选（历史原始记录）

发现 SAO 原始源包与正式 `assets/sao/catalog.json` 的旧哈希一致（`9d5066df5accfb64a9144701083d566ae892d5aacdd6d59405e8a5c6960e92f8`）。新增 `data-pipelines/star-catalog/rebase_sao_for_bsc5p_acrux.mjs`：同时检验旧 SAO 源包及清单、BSC v2/v3 原始字节和新清单，并证明 BSC 除 HR:4730 名称/版本外没有其它差异后，才将同一 SAO 行群重绑定为 v2。`publish_sao.mts` 现在接受显式 v1/v2 配对，默认仍是旧 v1；新 v2 只接受 BSC v3。旧 v1 用同一出版器重新生成的 publication hash 为 `1149eee4e94a1d7f9212681171a05452faa21fa00a4510bf09cb2903bce1bd35`，与正式资产逐字节身份一致，证明默认旧路径未变。

ignored 候选目录 `artifacts/miniapp/cloud-sky-native/acrux-candidate-20260924/` 下现有 `sao-source` 与 `sao-spatial`：v2 源包 246,280 行、20,240,090 B、SHA `c3aabc21b952719aac71d767e69f1ea501599dc3003b8816a92ca6e62ae29f25`；空间出版物 826 片、总瓦片 35,314,828 B、索引 281,063 B、publication hash `97d581f282df7c627304980d14ac4a7a0f53754f5945b1d6ef6658b4712f2b10`。任务脚本 `verify-sao-acrux-rebase.mjs` 逐片核对新旧 826 片 SHA/身份并比较所有行，246,280 条科学/几何/测光行完全相同，新索引基底精确等于 BSC v3；实际执行退出 0。

新增 `rebase_wikidata_chinese_aliases.mjs` 同样要求原 CC0 标签包、清单和 BSC v2/v3 的严格身份与唯一名称差异；输出 ignored `chinese-aliases/` v2，3,149 条 HR/中文别名逐行与旧版一致，新资产 SHA `7607c378c79c438e1b5f56c15fc4e7153471e68360848c9cff8b214fc84c4fce`，基底 BSC v3 SHA。没有重新请求 Wikidata，也没有新许可假设。

**此检查点的 SAO/别名仍是未接入运行时的隔离候选。** 现有 SAO 索引 URL 不带版本，旧 Mini 客户端只接受 SAO v1 和 BSC v1/v2；若直接切默认 SkyReport 和 SAO 为 v3/v2，旧客户端可能丢失星层。后续必须在正式服务/契约/Mini 同步迁移时明确版本协商或有边界的发布切换，保留旧静态目录读取与失败恢复；中文别名 loader、搜索/资料、静态绘制/标签/点选也都要实际检查。普通默认发布资产、Context 和共享 8787 均未切换；后续静态 v3 显式读取见下节。

## 同日续行：BSC v3 静态可读，默认仍为 v2

将已校验 BSC v3 JSON/manifest 加入 `packages/astronomy-core/data`，`bsc5p-catalog.ts` 允许显式装载 v3，保持 `loadBsc5pBrightStarCatalog()` 默认 v2。`miniapp-contracts` 的静态 publication reference 与场景容量校验也识别 v3。`StellarCatalogPublicationService` 无需另一数据 owner，原有 `/v2/sky/catalogs/:version/:hash` 即可按确切 v3 hash 服务；旧 v1/v2 和错误 hash 仍按原约束。HTTP 回归实际取得 v3 200、HR:4730 名称 Acrux、HR:4731 未命名、与 v2 不同 ETag；错误版本/hash 404。该测试 3/3，BSC core 测试 6/6。

astronomy-core、miniapp-contracts、miniapp-api、wechat-miniapp typecheck 均退出 0。astronomy-core release build 退出 0；TypeScript 输出 JSON 会重新格式化（v3 源 2,568,178 B，dist 2,870,739 B，原始字节 SHA 不同），但解析后标准 `JSON.stringify` 的 SHA 均为上述 v3 catalog hash。真实 `node --conditions=production` 引入已构建包并显式读 v3，得到 Acrux/v3 hash；默认仍返回 v2。第一次从仓库根目录直接运行 Nest HTTP 测试因 `tsx` 未拾取 worker 的 `experimentalDecorators` 配置而失败；改从 `workers/miniapp-api` 工作目录按该包配置运行，3/3 通过，此为测试启动方式而非产品断言失败。

此时 **静态 v3 能读取，不代表动态 SkyReport、SAO、中文别名或正式 Mini 已切换**。无需手机的后续工作仍是明确旧客户端/滚动发布边界后接入这些实际消费者；候选分片、别名仍在 ignored 目录。目标微信页面和真机验证仍未取得。
