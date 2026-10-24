# R20 远端接力复核：Sky 帧、资源、时间与独立云量

2026-10-24，独立审阅者 `review_remote_sky`。范围为 `266df53ea48a65013b9a358cfc2ffeb28c274fcf..f9798d794d09332be6eac6ef8651ce50865e2d0b` 中 WEAPP Sky 具名输入/accepted 消费者、资源家族、F09 时间查询和 F10 云量交付。仅审查、读源和聚焦本地验证；没有修改生产代码、总 PLAN 或 HANDOFF。

## 结论与已完成职责

本次检查的生产交界**未发现新的必须修复 P1/P2**。这不是全仓无问题、完整 UI/原生验收或 OOM 已解决。下列实现应作为现有基础复用，不应在 PLAN 中再次列为从零开发的任务：

| 已实现责任 | 本轮核查的实际边界 |
| --- | --- |
| 具名帧输入与 accepted 身份 | `sky-scene-frame.ts` 的 observation/view/Canvas 身份复制小型可变视图记录，保原数据所有者；`drawSkyScene(surface,input,ports)` 的 painted/completed/failure 携同一身份。页面仍由 successful-copy writer 发布，拾取/名称/来源和触摸读取同一 accepted pair。没有增加第二 renderer 或 writer。 |
| 资源家族协调 | `sky-scene-resources.ts` 统一 queued admission、Scene 输入、完成 join、比较及 live 投影；IR 保原 scope/Canvas guard，HiPS 只在有效 generation 使用 late getter。光学/Prepared 的 bitmap、asset、publication 由实际 completion 对本次输入核对，Body/银河/HiPS 等各保原贡献含义。独立 bitmap 退休不改写历史 accepted 记录或抹掉其他家族。 |
| F09 共同连续编辑与 settled-target 查询 | fields/ruler 各自持编辑来源，编辑代次覆盖 Context 替换、ABA、取消、hide 和显式 Play；旧 timer/cleanup 不获得新上下文。中间精确预览保留，最后释放才取得目标补充。Sky/Sources 共用同 query key 和 inactive 保留规则，最后 reader 负责取消；页面隐藏不会取消仍有 Sources reader 的同键请求。 |
| F10 独立地理云量 | `GET /v2/map/cloud` 和 Map cloud query 不等待 marker/decision Scene；旧 combined Scene 保兼容。地点面板的天文/天气轴仍属 Scene，云轴按实际 UTC 时刻关联；来源、保留覆盖、过期与云重试有独立 owner。controller/service 的取消结束消费者和后续批次，不取消另一 reader 仍需要的共享 QWeather 源。 |

这些结论来自主要生产 diff、现行 callers 和对应回归的组合，不只来自先前审阅报告。已读项目规则、global Context、开发 skill/performance 方法、交互 skill，核对 Mini Program DESIGN profile 与 Spot/Sky 对同一精确时刻、缺失/已绘区分和采用范围的要求。此次不做外观采用、图片加工、地图原生重建或实际性能归因。

## 本轮实际检查

root 完成锁定依赖同步后才运行检查，未将依赖错配当产品失败。

在 `apps/wechat-miniapp`：

```text
node ../../tools/run-node.cjs --import tsx --test --test-concurrency=2
  src/features/sky/sky-scene-frame.test.ts
  src/features/sky/sky-scene-resources.test.ts
  src/features/sky/sky-optical-source-credit.test.ts
  src/features/sky/sky-page-navigation-ownership.test.ts
  src/features/sky/sky-time-query.test.ts
  src/pages/map/cloud-map-consumer.test.ts
  src/pages/map/time-context-race.test.ts
```

实际 **59/59，0 fail/cancel/skip，exit0**。覆盖持有原 accepted 结果时的新准备/拒绝、错配身份、live 退休、Context/权限/ABA、精确最终时刻、同键 Sources 交接、独立云 ready/Scene pending、双时间轴和原时刻失败重试。日志：`tmp/r20-remote-sky-review-20261024.log`。

在 `workers/miniapp-api`：

```text
node ../../tools/run-node.cjs --import tsx --test src/map-cloud-delivery-http.test.ts
```

实际 **3/3，0 fail/cancel/skip，exit0**。真实 Nest/HTTP 层证明独立云响应在决策屏障前完成、一个断连不取消另一消费者的共用源，以及旧 Scene 取消后不启动下一批 decision。测试用合成供给和自有随机 loopback listener，退出时关闭；不是实际供应商/目标手机结果。日志：`tmp/r20-remote-cloud-http-review-20261024.log`。

本轮没有重复整个 Sky/全仓测试、科学图像处理或 440 帧等价试验。现 renderer/frame 文件与 `8fdf9b6b` 后保持无差异，SHA 也与原 [具名帧等价记录](R20-SKY-FRAME-INPUTS-20261024.md) 一致；该旧证据继续限定于其科学输入/输出，不覆盖新资源的物理呈现或整机内存。

## 仍保留的实际完成义务

- 已采用 UI 的目标 WEAPP 对照、真实触摸/方向转场与受影响正常恢复，不能由 Node/VM 控件端口证明。
- Map session 故障重建与永久 pending/native 退休尚在原责任；本轮资源协调不能作为已完成 Map 故障重建的证据。
- 真实 H4 云供给/许可与时间覆盖、三层持续拖缩和加载中接管、当前候选在同条件手机上的等待与最终覆盖仍需实际结果。
- 六字段/时间轴的实际流畅度、完整正常 Play/Pause/drain/退出、原生/GPU物理释放和 V8 OOM 原因/修复仍未验。没有据结构整理推断强持有者、降低星数、改科学精度或引入新的固定性能门槛。
- 主用真机调试路线已采用，后续复用它回答具体待决问题；此次不重新做网络/逐项 profiler 准入，也未激活或重建 R28/gen34。

若后续出现与已完成实现相关的新反例，沿其 owner 修复并补受影响检查；在没有新代码/输入/失败时，不因为本次总复核而重做已完成 F09/F10 和帧/资源接线。

## 复核源码身份

- `sky-scene-frame.ts`: `9c9e13f0a60f7952995c6156ab8be1264d4df7ae7566b703266545597dc55591`
- `sky-scene-render.ts`: `8c8aefa31c1b040291f9f0b9e67bb37e50d67ac83a42c378c9e29d40863d37bc`
- `sky-scene-resources.ts`: `34c300459e703f03ed9a693719471d37d8247fac33579751291b287985e12d0a`
- `sky-time-target-query.ts`: `07ce07ebf449cac4d05ca2fb393b4df8e9a16089334465e91d5d2b1e42d6b06c`

没有设备、IDE、ADB、共享 PG/API/桥/队列、VPN/网络规则、构建/refresh 或原件上传操作。所有本代理命令均已返回，未留下运行进程；此报告和本地日志交回 root 整合。
