# B2 土星 OPAL 历史云带：来源、加工、消费与验证

## 用户结果及实际边界

普通模式放大土星时，既有相位/扁球/环几何可叠加一份历史纬度云带色彩；低倍率、红光模式、坏环极轴、资源失败时仍显示有效位置、相位和普通盘面。图不主张实时天气、经度特征或当前环影。资源与清单披露 CC BY 4.0 来源、加工和局限；Android/iOS 原生像素及整页性能未验。

## 权利、源与加工

- [MAST OPAL](https://archive.stsci.edu/hlsp/opal) 标注 HLSP CC BY 4.0；[Cycle 32 土星](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32)含 2025a 全图，DOI 10.17909/T9G593。[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)按具体产品许可处理。页面及机器清单保留署名、许可链接、改变说明；此判断不扩展到 DSS。
- 官方 RGB TIFF `saturn-opal-2025a-source.tif` 4,885,052 B，SHA-256 `c34a13a8253a39bcc1f8376b24c077b89f05ce0b5202706f535ded20314440d7`；官方 `saturn-opal-2025-readme.txt` 记录 2025-08-29 观测、行星图纬度、三滤镜任意缩放及历史环/卫星影。原图预览 `saturn-opal-2025a-source-preview.png` 已查看，环遮挡形成不应当作云层的黑带。
- 加工器 `data-pipelines/planet-textures/opal_latitude_profile.py` 与 `publish_opal_saturn_bands.py` 固定源 SHA、1800×900 RGB，纬度逐行取有效经度 RGB 中位数，覆盖低于 90% 即透明；有效 822/900 行。重复运行得到 8×512 PNG 1003 B、SHA-256 `68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c`，与正式发布资源逐字节哈希一致。放大预览 `saturn-opal-2025a-bands-preview.png` 已查看；透明行使用基础盘面。木星旧脚本仅改为委托相同处理 owner，未改正式木星 PNG；原木星源 TIFF 不在本任务，未宣称其重算字节已验证。
- 成品 alpha 检查：462 行全不透明、38 行全透明、12 行边界半透明；低于半透明的 y 段为 0–23、244–253、502–511，其中赤道附近 244–253 段对应源图环遮挡，没有把黑带画成云带。

## 代码责任与开发证据

- `SaturnBandsPublicationService` 借固定图 owner 发布哈希清单与不变 PNG；BFF 固定源/许可/投影/成品哈希，错误版本或文件 404。合同 SDK 增加两条路由；部署镜像要求清单和成品。Mini 共用 OPAL 清单验证与 `useSkyOpalBands` 的高倍率资格、请求/解码/保留旧图/重试/Canvas 代次路径，Saturn 与 Jupiter 各自固定源。`ringPoleEnu` 提供纬度朝向，条带无经度声明；shader 从扁球 owner 取得 1-bar 54364/60268 极赤轴比采样行星图纬度，透明区退回普通盘面，环和点选仍用报告同刻几何。页面新增来源、加载及刷新失败提示和重试；BFF 资料与来源页的土星静态资料也披露新条带/许可并删去“球面无纹理”的旧说法，资料版本升级。没有借影像构造新的观测时刻/位置。
- BFF 包目录执行 `node ../../tools/run-node.cjs --import tsx --test src/saturn-bands-publication.test.ts src/jupiter-bands-publication.test.ts`：2/2 通过，HTTP 清单/实际 PNG/哈希/404；加土星资料来源后连同 `celestial-object-information.test.ts` 复核 9/9。首次从根目录跑因 `tsx` 未读取 BFF 包 decorator tsconfig 而失败；改为包 cwd 后通过，非代码缺陷。
- Mini 首轮定向 32/32 通过（`sky-canvas-time`、`sky-native-image-chain`、`sky-planet-disc`、木星/土星清单）；增加土星极轴/场景图专属消费者回归及把 shader 的 1-bar 轴比交给已有扁球 owner 后，`sky-planet-disc` 14/14 再通过。三包类型检查、合同 SDK 生成、contracts/BFF release build 通过。专属 `dist/weapp-check-sky-b2-saturn-0924` 最终正式 WEAPP 构建 exit 0，Webpack 3 个既有 CSS/性能建议 warning；原始包体 main 2,069,861 B、sky 901,667 B、spot 423,617 B、content 1,012,055 B。这个字节计量不等于微信压缩包或设备峰值。`npm run context:validate` 通过，只证结构链接。

## 未验证及后继

没有占用用户 Android、现用微信 IDE、共享 8787 或活动 WEAPP 目录。土星纬度方向、透明处、环/盘合成、重试可见性和设备峰值需目标微信原生像素/性能验证；B2 的环投影阴影、其它行星适用外观仍按 PLAN 评估。高影响共享改动仍缺独立审查 P5。本证据不等于 B2 或 Goal 完成。
