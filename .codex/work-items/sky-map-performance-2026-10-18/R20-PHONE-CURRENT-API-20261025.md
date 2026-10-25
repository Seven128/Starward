# 当前源码普通手机 API 与原生交互

## Candidate identity

仅 WEAPP，`development_feedback`，不是固定候选验收。后端启动源码基线为 `a37b3db`；本批层叠视觉窄修及最终提交见[层叠记录](R19-LAYER-PRESENTATION-20261025.md)与[HANDOFF](HANDOFF.md)。普通完整包当前为 `1576576c36c7628332f9c9b03e62cbbc840d3cbe78b1a7efde5d5c2ebce9390d`，339件/5,038,377B，主包2,027,585B；`szzwZq/gen3 NUlAjG`，当前嵌套设备session为`tEShJz`。编译AppID未变、普通API和Sky素材地址均归8808现用owner，无preview credential；独立手机字节和运行AppID仍未验。

私有入口为 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/miniapp-entry-20261025/phone-current-api-selection.private.json`。以下私有相对文件均位于其`root`，不复制IP、设备身份、凭据、坐标或账户业务行进仓库。

## Invocation result

- 复用现有`backend-data start` owner，使用原普通手机8806任务库及原session secret，仅调整选定物理LAN host/8808/cache prefix；没有重启8806或8807，没有使用8807旧数据库副本代替手机任务库。迁移、worker和提醒投递均关闭。启动前清除临时shell继承的后端配置项，不修改VPN、代理或系统环境。
- 启动目录原有catalog激活分支经只读事务和现有纯校验函数核准：1个active publication合法、不是退役内置catalog，`wouldMigrate=false`、数据库修改0。启动核1544公开文件/234,624,578B及固定r6，任务库26条迁移已登记，`mutation=false`。不重复迁移、导入或R6投递。
- 8808仅绑定当前选定手机侧物理IPv4；监听子进程与启动owner按CIM出生时间及祖先链绑定，host `/health/ready=200`。旧8806原库、8807独立PG/内存Context均保留。当前配置仍POSTGRES/LOCAL_TEST/media DISABLED，只是开发反馈，不升级正式资格。
- gen2 `xu8Zot/77b8`官方自动推送成功后，一次已审阅Map刷新触发手机对8808的3条SYN-SENT，旧8806为0；观察仅限自有host两个端口。先前独立TCP探针失败，未取得业务HTTP。该证据支持实际新origin，不证明连接成功。没有借用loopback/adb reverse。
- 本批gen3重新完整编译并沿同feedback owner自动推送，官方terminal success、taskId=null。Root在独立诊断session实际观察修后的下移退出后才bind；未新建QR或要求扫码。当前`tEShJz`已重新fresh capture；旧session/input许可不继承。

## Observed product behavior

gen2普通手机上，Search显示原有公开测试查询和内联网络失败。实际打开微信原生`chooseLocation`选点器，沿允许的Back取消，返回Search后查询保留、键盘收起；没有确认地点、改全局权限、写Context或改草稿。原图分别为`screen-dc8fc7a4…`、`screen-29ae6604…`、`screen-556f1a4e…`，完整原件在gen2归档内。

Map↔My实录显示左入左出；Search实录显示右入右出。返回后地图地标及竖排工具仍在，无底部主导航。正常My资料/计划未加载，不能用错误态对齐完整采用图。独立方向审阅和本批层叠前后差异见[层叠记录](R19-LAYER-PRESENTATION-20261025.md)。

## Verified

- 现有启动owner、原手机任务库/session secret保全、host ready、CIM监听/启动链、限定物理网络及公开文件/数据库publication核验。
- 新普通包的主/分包预算、编译地址角色、AppID连续性及无preview credential；官方推送及Root观察后的当前generation绑定。
- 原生选点器的本次取消/返回/原查询连续性；本次普通预览的已观察导航方向。仅限这些动作和条件。
- 防火墙脚本仍为已独审8808变体，SHA `cc808d7b5067411596a924a0fe0a6611250e943b5487712852a36a45992ea983`。`firewall/prepared.private.json`现已重绑gen3，SHA `a33803942962d8da27127e54326257cf99fdd17e4177a0ba7cc6242dda548247`。Root重新只读核10个pins、CIM祖先、接口和完整7条Node规则，策略修改0；实际manifest的注入检查10/10，ParserErrors0、设备操作0、策略修改0，当前结构化stdout回执为`firewall/layer-motion-checks.private.json`。旧`checks.private.json`仍是模板历史；独审发现它未被脚本自动写回后，才单独捕获当前回执。注入检查不证明真实管理员preflight。

## Unverified

实际`-Mode Read`此前在首个NetSecurity规则查询失败：`netsecurity_read_unavailable`；单一计划rule ID的直接只读核查为`PermissionDenied / Windows System Error 5`。当前Windows token仍未提升。没有Apply attempt、receipt或策略修改；本批未重复RunAs、同条件NetSecurity Read或手机TCP失败。

用户可交互的OS条件具备时，Root先从管理员入口Read，必须解析`Status=prepared_not_applied`、`OwnedRules=0`、`CurrentHostBoundary=true`、`SystemWrites=0`，不能只看exit0（`partial_requires_review`也可能exit0）。其后仍由原受控Apply逐项核实时手机/进程/规则/pins；保完整NativeError，实际手机HTTP成功后再推进正常业务。旧8806 packet和gen2绑定不可重放。此为已有任务授权内的Windows操作，用户仅需不可自动的OS交互，不要求手工运行命令。

正常业务HTTP、正式身份/媒体目标资格、定位允许/拒绝/成功恢复、选点提交、账户/N05连续性、真实数据与完整P1/P2/P3/P5、运行AppID及手机字节均未验。旧8807数据和当前LOCAL_TEST不能替代这些结果。性能/OOM仍后置，OOM未解决。

## Invalidated

gen1 `413a`、gen2 `77b8/REwX2Q`及旧`4VEyDu/58dc/GDWVeL`均不是当前gen3输入许可；其成果原样保全。当前canonical已恢复为手机1576576c，IDE使用单独完整编译的8807对应包，详见层叠记录。首次私有只读manifest核对脚本因漏导入AddressKey、随后JSON对象类型不符而停止；修正为原owner同一AST依赖及AsHashtable后才完成核对，无防火墙写入，不计产品失败或管理员preflight通过。

## Cleanup

旧canonical `0acc`、`77b8`、当前手机1576576c、旧隔离5e及各代feedback均保留在原owner/private归档；gen2 feedback全部392文件逐件SHA一致后才refresh。旧独立投递诊断`h4CqJf`的5文件逐件SHA一致归档后已由原stop owner移除，手机数据未改。gen3投递诊断原件和解码帧均由本轮私有owner保留；临时诊断session的最终退休状态以HANDOFF为准。原服务、数据库、当前IDE、N05和R6保全，不上传原件。
