# R19 微信只读选点：当前手机开发反馈

## Candidate identity

模式为 **development_feedback**。沿HGyEOG/gen1 AKYc0l、G2HMxB同一设备绑定和未改变的WEAPP339件/5,037,760B，SHA `ef6eeee2bb44ef2af5c3ddde69961faa2650a7ce9c27ff6392a6ff39fd9c3cd1`。本批Native源码不在这个微信产物内；未运行新Taro build或任何冻结代。实际运行AppID和手机源字节独立证明仍未取得，不作settled-candidate验收。

## Invocation result

用户后置两类性能后，Root为正常UI检查从新截图展开、结束本次自有真机调试浮层并确认结束；随后普通capture按预期拒绝非MiniProgram前台，没有读取其它微信内容。沿既有feedback锁、完整generation校验及official driver，对同一未改generation新派发一次普通auto_preview重新打开，shared/private大包flag均false。新单次journal在private network-topology-recovery owner；官方终态success/exit0、generation首尾不变，旧feedback与原官方结果未手改。新diagnostic `.official-process-c7d69c41-f382-42e5-b525-758384f20758.json`保留。

每次输入前都取得、实看同会话fresh单次图，使用原尺寸归一坐标。普通Map→搜索由可见搜索按钮进入；从搜索页可见“在微信地图选地点”进入真实微信原生Picker。普通capture拒绝该原生页后，使用既有capture-location-picker，原guard核设备/活动/同user-task返回owner/焦点；此scope仅Back，未点击“完成”或选择地图点。Back后普通capture重建MiniProgram输入资格，再用搜索页返回入口回Map。

## Observed product behavior

- 2026-10-24T18:29:15.963Z普通Map已实看，原调试浮层消失。
- 18:29:37.284Z真实搜索页可见，原查询仍在；业务资料仍显示查找中，不把它当正常真实资料。
- 18:30:36.281Z真实原生选点器可见，含地图、取消/完成和地点搜索；SHA `96def4730ea795f34edb43ce32b9f382e0ff61b242189ea8ed7b6bb847de7821`。
- 18:31:08.127Z Back取消回到搜索，原查询保留，没有“地点未选择”错误提示；SHA `d082f58459936284463806cd79dab531f28b7ae2ad3adaeaafb5f37d930657ec`。
- 18:31:43.488Z经可见返回入口回到原Map区域；SHA `3c3e19df79d067c54d73d649dcc843fa49ffb9dc2c3f85b8488bcb87d1dfa6bf`。当帧有地形加载状态，未等待或测试后置的叠层性能，也未取得最终叠层显示资格。

## Verified

当前已声明getLocation/chooseLocation的开发候选，其真实产品搜索入口能打开系统选点器，并通过限定Back取消回到搜索/Map。chooseMapLocation源码仅在非null选择后调用moveMapReference；依标准取消语义，该分支应不执行，本次未按完成或选择新地点。手机HTTP调用事件、服务端零写和Context序列化身份没有独立读回；不可从本组画面声称已取得这些取证。

## Unverified

正常账号/My真实资料、当前手机→业务API、正式运行AppID/手机源字节、成功选点与正确WGS84/Context提交、真实GPS/精度及权限流程、完整H4/生命周期、视觉资源全量对齐和最终验收仍保留。搜索/地形资料的加载态不能替代这些结果。没有新的性能profile/Heap/OOM结论。

## Invalidated

此前WAN真机调试的运行条件已结束，旧连接/消息/VM信息均只属历史，不再要求保活或作为当前runtime读回；原结果和所有截图保留。新普通预览没有新generation或代码重建，旧截图的输入grant仍按60秒/单次规则失效，不可复用。

## Cleanup

原图、私有meta、单次重新打开journal及verdict已逐件归档到既有private device-resume/r19-picker-readonly-20261025/，未上传；图内地点信息仅本机。当前手机回普通Map，G2HMxB/原generation仍保留。未动N05、R6、共享服务/VPN/防火墙或原PG；当前任务没有新的采集进程。结束后核15份微信源pin及canonical ef6不变，官方仅关闭自有RTtHkV项目及其关联debug窗口，实读只余项目列表；未全局quit/kill或删除任何副本。旧OS设置窗口的精确清理仍欠。
