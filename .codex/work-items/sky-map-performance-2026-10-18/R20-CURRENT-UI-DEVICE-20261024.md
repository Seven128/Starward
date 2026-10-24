# 当前普通 UI 构建与 USB 推送（2026-10-24）

本轮沿用户最新“USB 连接、自动推送、人类介入后置”的明确指令准备 `development_feedback`。完整 Goal 未完成，实际当前行动由 HANDOFF 拥有。

**当前为EfkxhB generation2／367a703a…**：Map session源码修复独审后普通完整build339件/5,028,121B，自动preview success并实际手机Map→My→地图返回；当前USB session gEFXaw，最后留Map。正常资料/图层仍不可用，没有触发fault，不认证native销毁/资源/正常UI完成。完整本代身份、四图/输入/检查/保全见[Map整合证据](R20-MAP-FAULT-SESSION-20261024.md#root-整合与普通手机反馈)。以下gen1和V87各段均保留历史，不作当前session资格。

## 当前开发候选 EfkxhB（后续实际结果）

- 首次V87XzN的正式2MiB拒包仍成立。一次facade移位候选仅减46B，已独审拒绝、完整保全并撤回；canonical恢复HEAD63ee13b源码后重编，bundle重新与E9 **339件/5,025,700B**完全一致，见[负向包体结果](R20-CURRENT-PACKAGE-BUDGET-20261024.md)。没有重建/刷新任何冻结代。
- 复用既有 `LAN-DEBUG-PACKAGE-AUDIT-20261023.md` 已核官方开发选项，只对新feedback副本的 `project.private.config.json` 合并 `setting.bigPackageSizeSupport=true`。真实officialDriver仍执行原autoPreview；公共project.config、AppID、compiler与bundle未改，不是mock receipt。任务脚本 `tmp/r20-start-development-large-preview.mjs`，构建/推送原件见task tmp同日log。该选项只支持开发preview/true-debug，**正式2MiB问题未关闭**。
- 新feedback `%TEMP%/starward-device-feedback-EfkxhB`，generation1 `generation-000001-u3Qsw8/project`；官方进程exit0，原结构化status success。一次推送后USB实际看见Starward Map，root实看新鲜截图才使用既有bind确认，不要求用户重复批准。
- 当前device session `%TEMP%/starward-device-feedback-EfkxhB/starward-device-test-zVWpAs`，transport USB、scope development_feedback。runtimeAppIdVerified=false、手机源字节unverified仍保留；实际送达不升级settled-candidate或目标全部通过。
- 私有预绑定图 `root-usb-20261024/preview-prebind-20261024T060858925Z.png`；绑定后Map `screen-8d6be956-c926-4fc8-ba35-9b132046b652.png` 实看后才点My（normalized0.1/0.127）。My加载图 `screen-c41ec117-a688-4f1c-9d31-6ec579288e49.png`，请求结束图 `screen-ee04d445-ffa3-47b6-9c8a-327f76c2c4b2.png`（06:16:19.407Z，SHA `7b80fdd5d71c5d273466644dcc5a5b5ab4d4ebb1addd69fcfce64a84210a7e77`）均由root实际查看。梯度/单计划卡/回顾和贡献行/地图返回入口可见；最终明确“资料暂不可用／账户资料暂未取得”，**正常My和合法Picker尚未通过**。手机留在My，旧截图不能作下一输入资格。
- 原shell探测No route to host之后，真实My也未成功，但普通preview不提供当前phone Network/Console，尚无WeChat失败码。范围化邻居读回：Windows对phone为Stale，phone对host为FAILED，先修拓扑。WinRT只读热点Off/clients0、已配置/capability Enabled；当前ICS COM读回与防火墙读取需提升，尚未申请UAC或改网络。既有VPN/TUN保持，未重复点重试、未登录/换号/造账号或接触N05。
- 必要API8806/PG55441继续由原owner运行。旧失败feedback、canonical备份、负向候选源码和build、当前反馈与截图完整保留。正式预算、正常UI资料、真实H4、Map资源/Sky/OOM等义务继续保留；根下一步归HANDOFF。

以下为初次 V87XzN 的原始失败记录，相关“本代/尚无画面/未bind”只指该初代，不覆盖上述新代。

## Candidate identity

- canonical 当前源码完整普通 WEAPP 构建：**339 件／5,025,700 B／`e9e540552df10842784eb21bb44e924b989a48f2894321b50af5dc1dd0153de6`**。build-time origin 已验证是完整的当前手机侧物理 LAN API8806；没有 loopback、fixture-mode 或新诊断注入。
- 改动前 canonical 普通包339件／5,017,634B／`bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5` 已在 private owner 完整复制并逐文件指纹比对后才清理生成根重编。原 gen18、gen34、其他冻结代、Harness 和原件未被重建/refresh。
- 新 feedback：`%TEMP%/starward-device-feedback-V87XzN`，generation1，prepared project 位于 `generation-000001-XncFQK/project`。此包保留，不原位重写成新候选。

## Invocation result

- 官方 Skill 0.3.14、当前 CLI 登录/版本入口沿已核 session 复用。通过现有 `device-feedback start --delivery auto` 发起一次官方 `auto_preview`，不是二维码或 true-debug 冒充推送。
- 原诊断 stdout 是完整结构化 `ok:false`、tool=`auto_preview`、code=`10`，明确 **main package source size 2051KB exceed max limit 2048KB**。因此本次未送达，不绑定，不把一次命令 exit0 的外层 wrapper 当成业务成功。
- 外层规范化 receipt 仍保 `error/status:unknown/taskId:null`；原 stdout/base64/process metadata 完整保留。root 只从该原件读回具体官方拒包结果，没有伪造 success、重复调用或猜测一个不存在的 taskId。它不是超时后不明送达，也不能直接重发同一超限包。
- 本地构建 exit0，webpack 10项 warning（含已有 CSS order／asset recommendation）；不以 webpack 建议阈值替代微信官方包限制。相对旧339件普通输出，仅5个JS变更：main common +1180B、Map +164B、Sky detail +6105B等。本地文件和官方编译计量口径不同。

## Observed product behavior

本代尚无手机画面或输入，不能作正常 My／Picker／叠层／Sky 结果。root 已实际查看并读取当前采用 My 原图及局部适配源，未重选或重画。

## Verified

- 唯一 USB transport 的 bounded shell 已执行成功；当时 Awake、interactive=true、keyguardShowing=false。USB 就绪不证明候选送达或当前账号关联。
- 原库保22、任务副本26且原业务指纹不变；新 API8806 的 host/listener/进程归属和 ready=true 已成立，见 [副本 owner](R20-CURRENT-PHONE-API-20261024.md)。无 worker/reminder/admin 能力扩张。
- 选定 host 接口与手机当前 WLAN 范围匹配，接口 Up、对应路由 Alive。没有更改 VPN/TUN、路由、网络类别或防火墙。

## Unverified

- ADB shell 对新 host/8806 的只读 HTTP probe 返回 `nc: connect: No route to host`。已保留实际错误并停止重复探测；这不等于实际 WeChat 请求失败或已经证明防火墙原因。当前 shell token 未提升，防火墙读取为权限不可用；尚未申请 UAC 或改规则。
- 当前自动推送收件账号/手机关联、WeChat API 可达性与原 session/账户，均需一个准入成功的新候选实际确认。真实 QWeather／WeChat凭据仍缺；媒体关闭，正常 My、合法只读 Picker、真实 H4 等保其各自条件。
- 官方主包超限是已确认交付失败，按原 R6/包体 owner 修复后才新建当前候选。不能用桌面、本地字节、开发大包开关或旧成功认定本包已准入。

## Invalidated

旧 gen18 的截图/输入资格不能用于此新代；本代未 bind、没有可用的新 device session。冻结 gen34 的代码/字节和旧失败继续保留。

## Cleanup

普通构建已结束，官方进程已终止；新失败 feedback 和诊断保留，不移除原窗口或旧未知 handle。必要 API8806／PG55441 保留运行，其 stop owner 分别归当前副本与前置数据 lane。private 原件位于 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/root-usb-20261024/`；没有数据上传、账号/草稿清理或 R6 重发。
