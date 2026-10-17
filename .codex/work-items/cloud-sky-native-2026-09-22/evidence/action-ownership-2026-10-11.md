# 公共时间与选择／定位／跟踪的页面所有权（2026-10-11）

本轮修复真实`SpotSkyPage`的排队回调缺口：时间预览／播放可在隐藏或提交中改变意图，播放和应用读取旧render值；定位／跟踪可消费旧Context或旧时刻，资料关闭后仍可移动相机。仅检查当前可见也不足以隔离隐藏后返回的旧回调。修前源码从上一校准绑定继续，SHA256 `27522091a5aa09c52d6db6ecf2dc0eed7fa0680efc3051b5f93201e2c4146efb`，没有重开图像或前期。

页面复用原Context session的即时可见代次、地点／版本及同步提交锁，原公共时间意图绑定、选择身份与跟踪owner仍持有各自状态。播放／暂停和明确应用读取live intent，合法连续预览不等待React；定位／跟踪还核实际当前时刻。日历打开、资料关闭的原setter同步更新其命令边界。旧timer不推进或暂停新绑定，重复hide幂等；原ruler的首次hide可撤回活动拖动，返回后旧取消不能影响新预览。提交中允许当前日历关闭并保已有请求，旧关闭不能撤回返回后的新日历。修复没有新Context／时钟／相机／传感器库，也未增加缓存或图像加工。

验证基于实际page声明、公开Button／日期／ruler／timer接线及真实Context、公共时间、选择、跟踪和投影owner。React调度、API回复、姿态边界与原生渲染端口受控。修前最终21项均断言失败，没有ReferenceError／SyntaxError；修后27个真实测试文件203／203，覆盖即时隐藏／返回、地点和Context切换、同步锁、校准、旧时刻／绑定、披露关闭、连续操作、地平下定位及当前提交失败／有反馈／释放锁／真实参数重试。既有位置预览fixture改用真实身份与owner；其他隔离fixture补新边界依赖，未撤回原行为断言。早期计时器选错effect、VM重复声明、旧fixture缺依赖与TS品牌字段失败日志均保留，不计为产品反例；当前修前证据只取`regression-before-final-r2.log`。

App TS5.9.3通过。实际CLI第二份候选为`artifacts/miniapp/release/cloud-sky-action-ownership-ci-20261011-r2.manifest.json`，独占`f3995a4d-8bd2-4b09-b28e-ea41d10fffb0`目录，274文件／4646902B、SHA256 `e9502946c7eabca7beea6fd9df4168f75ff8bed8163e3cb2b6308af15f8adb0c`；主包2096426B，原2MiB预算余726B。包消费者3／3，编译纯origin owner五角色和静态检查通过；Sky JS改变且含当前接线，212资源／WXML／WXSS与上一候选逐字节相同。旧开发、两份普通、三份F候选、上一校准及本轮r1共八目录保原完整fingerprint，源配置及冻结v8／r17／F控制不改。首份r1已保留，最终代码以r2绑定。编译仍有原三项CSS顺序／体积建议警告。

精确源码、回执、控制与八旧输出由[本轮检查脚本](../scripts/check-action-ownership-2026-10-11.mjs)及[当前绑定](../../../../output/cloud-sky-action-ownership-2026-10-11-r1/current-binding.json)持有；所有失败和中间成果均留在该output目录。首次绑定检查把既有汇总fingerprint当作全文件列表、首次新文件whitespace检查误判Git差异退出码，两个脚本失败保留；最终按原汇总sha／文件数／字节重新核完整旧bundle，再从已核文件映射逐项比较资源，并单独检查新文件行末空白。Context仅核manifest与controlling-source，不认证普通Markdown链接或事实；diff及Goal回执随当前绑定保存。本轮为自查，独审MISSING。

这不是实际WEAPP合成或设备旅程验收；dirty本地CI类不可部署，不是protected CI。正常Canvas控件FAILED保原，真实网络／权限／Android-iOS／物理校准与资源峰、OSS／ESA／OCI／旧版／回滚／off-host／联合容量未验。没有平台外发、云写、采购或图像新增／像素加工。全部33项及延后图像义务留原账，Goal无预算active；下一入口只由CONTINUE控制，继续其余来源／Back／手势／App后台的实际页面所有权。
