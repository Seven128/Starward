# R19 底栏退休后的主包资产审计 — 2026-10-23

## 结论与允许的最小后续变更

当前没有可以不检查其声明、直接从磁盘删除的旧图标。发现一组可在同批退役旧 TabBar 图标 API 后，从构建复制清单精确移出的六张 PNG，共 **5,833 B**。这不涉及更换采用稿、图标像素、显示尺寸、资源地址或数据语义。**本审计没有实施变更、构建、操作手机/DevTools/服务/Git，也没有删除文件。**

建议实施范围：

1. 将 `navigation/primary-navigation.ts` 中旧的 `primaryNavigationIconPath(icon, mode, selected)` 视觉 API 退为实际需要的、只收 `mode` 的 Map 返回图标函数。保留 `PRIMARY_NAVIGATION_ITEMS`、主目的地和路由判断责任。
2. 同批迁移 `components/semantic-asset.tsx` 的唯一生产调用及 `semantic-asset-test-support.ts` 的真实加载适配。保持所有现用返回路径逐字相同。`SemanticIcon` 的 `name="map"` 分支目前已固定传 `("primary-map", mode, false)`，本来就不使用传入的 `state`，因此新函数无需保留已退休 Tab 的 selected/my 参数。
3. 仅从 `config/index.ts` 的 `retainedLegacyIconFiles` 移出下表六项。保留其物理源图、源清单、设计原件与历史证据。保留 `primary-navigation-day-icons.json` 及账户图标 default/selected 的现有合法声明和 `adoptedBIconPath` 状态语义。

仅移出复制条目、仍让旧 API 返回这些资源，不能算完成安全退休。审计没有发现其它必须迁移的真实动态调用；若后续实现前出现新的调用/合同，应重新判断这组六项。

| 仅拟移出主包复制的文件（源目录 `src/assets/icons/`） | 实际 B | SHA-256 |
| --- | ---: | --- |
| `tab-map-selected-night.png` | 863 | `4d0d04f3acee1322cc4a51faa630e8b6daf80d363076f7bd6147dbbee493c976` |
| `tab-map-selected-observation.png` | 853 | `d0a69eaf4390a7451ec10c2307948511aec8d2fa95f38eb7631047b4a5ccc075` |
| `tab-my-night.png` | 1,030 | `cc011cf43e771ed258c143dbb1cf47000aec9232dbf2edc5c01b7c613dc75733` |
| `tab-my-observation.png` | 1,040 | `3abc13f73bd4c4f7f6920474f1e4ec5f7175c53676dc488d464503ab17cf0322` |
| `tab-my-selected-night.png` | 1,023 | `083a2e4d2444f33a8a383bf44498c7a50f801150d399e948c99145dcf51deed6` |
| `tab-my-selected-observation.png` | 1,024 | `b47739d758f481d55ddb8d159bf6cfb9a73a1d2699325c08599f728c1c477b7b` |

六份源文件与当前普通 gen17 的 `assets/icons/` 输出均逐字节相同。5,833 B 是这六张实际 PNG 的文件和，不是官方重新编译后的包体收益保证。

## 当前候选与实际包体口径

只读候选：`C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/generation-000017-t4tyDI/project/dist/weapp`。按该候选 `app.json` 的 `spot/`、`sky/`、`content/` 分包根划分，345 文件 / 5,023,816 B，主包 123 文件 / **2,035,453 B**；主包 `assets/` 为 95 文件 / 655,651 B。没有残留 `custom-tab-bar/` 编译目录；名称含 `weapp-tabbar` 的三个文件都是当前复制声明的资源。

实际官方结果位于同代候选父目录的 `.official-process-5ca1358a-133e-4dbb-a35a-f206018e0b89.json`。只读解码其 base64 stdout：退出 0、`ok:true`、`tool:auto_preview`、`success:true`；main **2,094,369 B**，距 2 MiB **2,783 B**。官方总包 5,016,291 B，content 990,324 B、sky 1,317,135 B、spot 614,463 B。原始 receipt SHA-256 为 `8b7e535cbd4af5143c5c031333a938be816729a9f4eeac679e61b3f7b201aec0`。

本地生成文件和官方编译不是同一计量口径；不能将本地余量当作官方余量，也不能直接从旧官方结果减去源文件差额后宣称新包已经准入。后续实际候选须由原官方路径读回包体结果。

## 真实消费者与不得误删的资源

`src/app.config.ts` 已无 `tabBar` 注册；它保留 Map/My/Auth 主页面与三个普通分包。去掉底栏没有消除下面的返回/账户职责：

| 现用资源 | 实际生产消费者及必须保留的关系 |
| --- | --- |
| `assets/b-icons/weapp-tabbar/map--day--default.png`（25,489 B） | `MyLibraryPage` 使用 `CustomNav backPresentation="map"`；`custom-nav.tsx:83` 渲染 `SemanticIcon name="map"`；该分支调用共享返回图标解析器。DAY 的 default/selected 声明都指向这张原图，不能因目录名含 tabbar 而删。 |
| `assets/icons/tab-map-night.png`（865 B）、`tab-map-observation.png`（857 B） | 同一返回地图控件的 NIGHT/OBSERVATION 输出。必须保留原路径/字节，不能用 DAY 图替代。 |
| `assets/b-icons/weapp-tabbar/account-user--day--default.png`（17,920 B） | Map 的“我的”入口 `pages/map/index.tsx:2641` 与 My 缺省头像 `features/my/my-avatar.tsx:123` 通过 `SemanticIcon name="account-user"` 使用。主包复用该 192px 派生，content 仍使用自己的派生。 |
| `assets/b-icons/weapp-tabbar/account-user--day--selected.png`（19,138 B） | `adoptedBIconPath("account-user", "selected", 主包路由)` 的合法共享状态输出；仍在 DAY 声明与构建清单内。本次不缩减此 API，不能只凭当前 JSX 未显式写 selected 就移出。 |
| `assets/icons/account-user-night.svg`、`account-user-observation.svg` | 账户语义图标的原合法主题输出，由 `SOURCE_ICON_FILE` 和主题动态后缀共同生成。 |

跨 `apps/`、`packages/`、`tools/` 的受控源码检索中，`primaryNavigationIconPath` 的唯一生产调用就是上述固定 Map 返回分支；其余命中是函数声明、导入和测试加载器。`PRIMARY_NAVIGATION_ITEMS` 继续是主页面/路由类型责任，不应随视觉 API 一起删除。

## 共享声明与批量排除结果

- `config/index.ts` 从 `main-b-icon-files.json` 的 31 项复制主包 B 图，并由同一声明控制普通分包去重；两张 96px parking/restroom 主包派生仍独立于分包较大派生。不能把主包图标当作主页面专用：分包 `SemanticIcon` 和分享海报也会读取这些已经驻留的主包资源。
- `FavoriteStar` 用 `favorite-${part}--day--${state}.png` 动态消费星头 default/selected、trail、satellite；Map 四态由正式点、草稿和私有投稿 marker owners 消费。它们不能用单文件 literal 搜索结果判断为闲置。
- `SemanticIcon` 的 `DAY_SOURCE_ICON_FILE`、`SOURCE_ICON_FILE`、`LEGACY_ICON_NAME`、主题后缀和路由前缀共同决定输出；本轮完整读取该解析器，检查实际直接调用、动态名称调用和主包复制声明。其它主题资源、采用稿线性 chevron、来源 glyph、层选中状态均仍有合法职责，没有发现额外可直接移出项。
- `MoonPhase` 按相位索引消费主包 8 张 `assets/moon/phase-*.svg`，红光使用 content 的另一组；`SelectedCardStar` 按主题消费三份 ornaments；night/observation 的 five-point-star 由语义解析器消费。许可证是运行依赖归属，不是视觉闲置资产。
- `spot/native/packaged-icon/index.js` 的 11 个白名单角色继续使用 `/spot/assets/b-icons/${kind}--day--default.png`。Map/My 的正文配图和天气 glyph 使用此原异步 owner；本次不把它们搬回主包，不改白名单/placeholder/尺寸，也不删其 spot 输入。
- 代表性 JPEG 仍受 `PACKAGE-AUDIT.md` 已确认的 catalogue/fixture 动态合同约束；本轮未将这类素材当作候选，也未提出 CDN、重新压图、像素变换或按无 literal 命中删除素材。
- `marker-manifest.json` 的 generated-mode-icons 约束检查的是 `src/assets/icons/` 原文件/哈希；`delivery-carrier.json` 的 `source_snapshot.files` 是历史源快照。保留源文件及清单可维持其含义。检查到的相关验证器没有要求这六个退役 Tab-only 图必须继续出现在新编译主包。历史 carrier 也不能被改写为新候选通过。

## 实施后相称检查

这组变更不需要重做设计选择或全产品矩阵。必要检查应沿受影响责任完成一次：

1. 保留原件，核对 diff 仅涉及返回图标 API/真实消费者与测试适配/精确六项复制退休；检索确认没有旧 API 的未迁调用。源图、DAY 声明、账户状态语义、导航业务和 native loader 不变。
2. 在已有 semantic renderer 测试边界验证 Map 返回在 DAY/NIGHT/OBSERVATION 的原地址，以及账户 default/selected 和现有主/分包派生复用；运行受影响测试和相关 typecheck。按行为核对原值，不能只断言新函数名存在。
3. 下一次合适的普通完整构建，核六项不在主包、仍需资源逐字节保留、无旧目录残留，并读实际 main/分包 bytes。沿原官方预览路径核真实包体与准入，不叠加诊断模块。
4. 复用已验证 UI，只在下一个手机候选的既有 Map→My→Map 核对可见返回图标/入口和现有主题行为；包体变化不成立新视觉稿，也不取代严格采用稿验收。

审计时关键源指纹：`config/index.ts` = `adeea0348d0034154484ac700d22b90b6105f9e4228725a7fdb5b66c49392a9d`；`primary-navigation.ts` = `a124a79b071908c17861cbc6ebbb28d4a1d14d856e4b40c0dcb7a7e63adbdf88`；`semantic-asset.tsx` = `917c5f98134c3089e9e63b66896bd8921fc600155b473eb5457f721b013c772b`；DAY 导航声明 = `554c8883091067305da4de6793d3d5b346b19ff382699e21571345a18d20e89c`；main B 声明 = `f3ba1d2a347d3c8ab862c988c8b28b4f6340c5dd41c135d543b45241baf323bb`。结论限于这些当前源与普通 gen17；没有把静态审计记作产品/手机验收通过。
