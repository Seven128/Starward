# R19 旧底栏图标打包退休

2026-10-23。新官方证据确认普通gen17主包2,094,369 B，仅余2,783 B；本轮依[独立资产审计](R19-POST-TAB-ASSET-BUDGET-AUDIT-20261023.md)处理去TabBar后已无真实消费者的六个旧资源。沿原UI/包体责任，没有改采用稿、现用图像/尺寸/材质、未改区域、路由或账户数据；物理源图和设计/历史原件保留，不按tabbar目录名删除。

## 最小共同责任变更

- `navigation/primary-navigation.ts` 以 `primaryMapIconPath(mode)` 替代旧Tab-only `primaryNavigationIconPath(icon,mode,selected)` 视觉API；保留 `PRIMARY_NAVIGATION_ITEMS`、主目的地类型及路由/布局业务。当前唯一生产调用原本固定primary-map/mode/false，因此现用三主题输出逐字保持。
- `components/semantic-asset.tsx` 与真实测试加载器迁入同一函数；账户 `adoptedBIconPath` 的 default/selected、DAY声明、native loader及其它语义图标状态均未改。
- `config/index.ts` 只移出复制表的 `tab-map-selected-night.png`、`tab-map-selected-observation.png` 及 `tab-my-{night,observation,selected-night,selected-observation}.png` 六项，共5,833 B。源PNG继续存在且hash与旧包同；Map返回的DAY及两主题非selected图、My/Map账户图仍打包。
- 现有semantic renderer检查增加三主题Map原路径/可访问名及主包账户default/selected输出，覆盖此次误删风险；不新增与实现同形的测试文件。

## 检查及实际构建

23个既有semantic/primary-controller/primary-page行为检查通过；补齐账户输出后最终semantic3项再次通过（与23重叠，不相加）。生产typecheck exit0。5文件定向diff check通过。未重跑无关全量或重做设计/手势矩阵。

普通完整Taro build exit0、webpack29.853秒/10项既有warnings；API与Sky源沿既有USB runtime在内存传入，先核旧包同origin，移除任务/fixture/release flags；未动VPN、环境服务、AppID或账户。新bundle：

| 项目 | 旧普通包 | 新普通包 |
| --- | ---: | ---: |
| 文件数 | 345 | 339 |
| 文件和B | 5,023,816 | 5,017,634 |
| 本地主包B | 2,035,453 | 2,029,271 |
| content B | 1,041,539 | 1,041,539 |
| spot B | 612,072 | 612,072 |
| sky B | 1,334,752 | 1,334,752 |

旧bundle `51c72f197afab132827019bc07ae36ddb556466b0a7c4c888d3581115899dae3`，新bundle `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`。移除项严格仅六PNG，无新增文件，唯一变化的保留文件为common.js（减少349 B）；全部其它文件——包括全部WXML/WXSS、保留图片、分包与配置——逐件SHA相同。总本地减少6,182 B，不能直接从旧官方数字相减宣称新官方收益。

完整新fingerprint/预算、11项production guard、physical bundle guard、编译API/Sky/AppID owner核对通过；maps0。没有刷新或重建已冻结gen31/32/33，没有把生成内容反写源码。

## 原件与当前目标状态

私有owner `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/post-tab-package-retirement-20261023`：

- 修改前5源及完整普通canonical345件/5,023,816 B：`before.private.json` SHA `22fee09844e3246a2f5a17aba63c8d3f95e8fe0ed7c659ffc0c4c6342da1171f`，source-before/ordinary-before逐件读回。
- 新构建完整fingerprint及前后差异：`build-result.private.json` SHA `9eb103292a150e8115c5c2eb4d1b89e6b802b7958c72c21004c5dd0b28b6778f`；5源source-after完整复制/读回，清单SHA `be4a08cfec7903e49c96ead50f80f2d55914ce27ee6436b1b84e786d3483b5db`；正常build原log另存。
- refresh前普通gen17全feedback361件/12,291,651 B先保，清单SHA `5cfa497ebfb4aaf890f46d86e5c503921e982b330de3d432c5f0e1331039b20e`。旧输入资格不得沿用新一代。

原Stable同feedback唯一auto refresh（tool session18777）已exit0、official success、无taskId。新普通gen18 prepared `generation-000018-4Kvksw/project/dist/weapp`；公共USB实看正常Map后bind `starward-device-test-mBiLUn`，不沿用gen17输入资格。

官方原件 `.official-process-959121f9-e984-41a5-9aba-28fedfc7f33a.json` SHA `60da46435a4847a6e4e0873667d47f3697128987b2453011e3f59d6ac5faf4ca`，schema `starward-miniapp-official-process-diagnostic-v1`，base64 stdout实际 `ok:true/result.success:true`。官方main **2,088,195 B**，相对旧gen17 **减少6,174 B**，余量 **8,957 B**；官方TOTAL5,010,117 B，content990,324/sky1,317,135/spot614,463 B均未变。与本地文件和不同口径，分别记录，不将新余量当充裕或未来准入保证。

Root逐次实际查看新原始capture：

- `4ca801a2-8209-4d3d-8518-20abd9d21c0b`（UTC05:56:31.245）完整Map/terrain/LIGHT，原我的入口可见；据此下一调用tap该入口。
- `d5f1ce9f-6198-4511-ac41-e30e00ff7a0e`（05:57:10.909）My实际打开，左上原地图图标/文字、默认头像、原渐变及卡片可见；账户资料仍为原匿名不可用状态，未点击重试、编辑或计划入口。此图不认证正常账户完整排版。随后据该fresh图下一调用tap地图返回。
- `79041b5b-d220-457c-9574-97eefe6c97b7`（05:57:49.616）恢复完整Map/terrain/LIGHT。仅两个必要输入，无录像/新转场时序或全主题手机验收声称；原已验证转场复用，现用三主题返回路径另有行为/字节检查。

本批新普通feedback355件/12,395,929 B完整复制并逐件读回，`gen18-ordinary-result-originals.private.json` SHA `eab20f416579bcc94514912f34f56b1d9ec3a21d72020cfc069483ef6aa9de88`；包含官方、prepared与实际phone原件。当前普通feedback保持有效，未stop。[R19本批独立审查](R19-POST-TAB-ASSET-RETIREMENT-REVIEW-20261023.md)已完成，SHA `135d1d3b1ee14de77dce02f440dbd3a3df2a30d635bed7ee0609f40f9f3c6275`，独核5源、345/339整包、339 prepared、原官方stdout及采用Map/My与3张phone图，未发现P1/P2；代理已结束。普通预览不是正式上传/发布；完整UI/性能及Goal剩余义务不因本次包体退休取消。
