# B2 月面覆盖率版：出版、消费者与恢复

本轮建立完整源→固定PNG/清单→真实HTTP→Mini请求/原生解码owner→现有球面shader→资料/来源的本地链。源和实际GPU像素的前置证据见[源质量](b2-moon-source-quality-2026-09-28.md)。没有再次下载原图；没有把本地结果提升为微信手机验收。

## 责任和版本

- `MoonTexturePublicationService`继续持有旧JPEG与其元数据修正前图片地址；新增独立`coverageManifest/coverageImage`复用固定出版器，不建第二个网络/缓存owner。
- 新合同`MoonCoverageManifestData`、共享`moon-coverage-publication.ts`绑定具体原图/PNG的SHA、投影、NoData=0、45×45有效面积及缺测语义。两个边界复用同一审定规则；源/成品/局限任意不匹配均拒绝。新数据从`/v2/sky/moon/coverage/manifest`取，旧`/v2/sky/moon/manifest`保持JPEG。
- Mini请求显式选新路径，query key与image id带coverage-v2，只按PNG解码，沿用现有Canvas/出版代次隔离、迟到释放、失败重试和已解码可用图保留。不把旧JPEG retained image当新PNG。
- 月球资料请求显式`moonTextureVersion=coverage-v2`，BFF和Mini缓存都隔离，旧客户端不加参数仍取旧来源。源暂不可用时仅来源降PARTIAL，独立天体事实保留，恢复后重新取真实清单。页面来源显示缺测灰色示意及新清单地址。
- 发布顺序应先支持双版本的后端，再上新Mini；新Mini面对尚无新接口的服务会走已有无图盘面/可重试错误，不偷偷显示旧JPEG。旧服务/旧Mini不是新版成功证据。

## 开发与交付包证据

14项BFF定向组合通过（Moon HTTP/损坏恢复、日月新旧资料缓存/部分失败恢复、其它资料消费者），最后PNG修复恢复断言再跑Moon3项通过；不是17个独立场景。Mini12项请求/信号/损坏合同/实际hook/原生资源owner/资料边界通过；前轮月球/行星23项及GPU像素证据沿用，没有声称本轮重复或完整手机验收。三工作区类型检查、SDK同步、Context校验、git diff --check通过。

隔离Mini构建`dist/weapp-check-sky-moon-integrated-0928`通过（19.510秒，3项既有警告）；日志`b2-moon-integrated-build-2026-09-28.log`。这是默认loopback API的本地检查包，不能直接推到手机。未刷新当前feedback generation4/旧P1BATCH28D。

实际Docker发布镜像`starward-miniapp-api:sky-moon-0928`构建成功，digest `sha256:fe4898ad22dbf39de614295fddeeabff8a7cb63893911f2c68c7f7eddbbbfc2d`。Dockerfile显式检查新清单/PNG在运行层；本次新增4.25GB原图/虚拟环境通过`.dockerignore`的`output/moon-source-cache`排除，不作为发布输入。现有Caddy固定图类别覆盖`/v2/sky/moon/*`，新路径仍在该类别；本轮未重新宣称边缘实测。

专属--rm容器512MiB/128PID绑定127.0.0.1:18928，LOCAL/MEMORY_TEST/LOCAL_TEST，fixture关闭，执行真正production exports和编译JS。首次HTTP恰在启动期间socket关闭；检查同一容器仍running且启动完成后重试同一服务成功，未重启。`moon-coverage-release-probe.mjs`真实取回两清单/图片、校验长度/SHA/Content-Type/immutable、新旧资料版本、错hash404后恢复，以及原始旧manifest图片URL。结果`b2-moon-release-http-2026-09-28.json`：新版清单2113 B、图片1,595,187 B；旧版1903 B/372399 B。新PNG相对旧图多1,222,788响应体字节；均为一次冷取样，不是人均用量或月费。RGBA理论解码仍8MiB，手机峰值未知。

容器单次stats102.6MiB/512MiB、11PID，OOM=false，不是峰值/生产容量。专属容器已stop并确认同名为空；原P1 API session15053、共享Postgres/Redis及其它项目未动。正式云部署/账单和独立审查仍未取得。

## 当前后续

03:32附近无线doctor仍0设备，无待答手势。本轮B2月面非手机数据/消费者链已闭合到上述证据层；不继续重复取源/细调或称B2全模块完成。下次先按已有授权设备恢复流程核连接，再刷新本任务API与同一feedback run的合并新候选，明确可见版本及fingerprint后集中核M51来源离屏/恢复、新月面约1°缺测/资料返回，以及其余模块组合。当前D代保留金星已验事实，不能当作已含覆盖率版月面；loopback构建也不能直接当手机交付包。若手机仍不可用，回PLAN的其余独立义务/真实外部输入审计，不制造无风险补丁。P2/P3/P4/P5、iOS及完整目标范围均保持。
