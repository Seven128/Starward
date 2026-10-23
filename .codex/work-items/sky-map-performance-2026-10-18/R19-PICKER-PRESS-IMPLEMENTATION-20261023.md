# R19 原生选择器触发面统一按压（2026-10-23）

## 修复范围

R19 要求所有按钮统一反馈。原 raw Button 搜索只证明 Button 已集中，未覆盖原生 Picker 内承担操作入口的 View。对全部生产 TSX 的有界 AST 清单发现 5 个文件中的 8 处 Picker 声明仍直接使用普通 View；其中贡献日期、计划结束/出发日期时刻为复用声明，不能把声明数当运行时实例总数。

这些入口共同依赖原生 Picker 的选择/取消/禁用语义，和普通按钮使用相同的轻按压反馈。没有重新选稿或生成资源；沿 [原采用按压责任与资源](R19-SHARED-PRESS-IMPLEMENTATION-20261022.md) 实施，未改其他内容、颜色、图标、数据或页面方向。

## 唯一实现与消费者

`components/shared-button-press.tsx` 的内部 `pressFeedback` 统一原生 hover class、0/0 生命周期、反馈类与 surface/icon/none、self/child/before 选择。原 SharedButton 的禁用/loading/busy 合并、点击拦截和 touch/long-press/platform handlers 不变。

新增窄适配 `PickerTrigger` 只输出一个 native View，替代 Picker 内原 View；文本、className、style、children、native touch ports 保留。它没有点击命令、hooks、计时器、测量或新状态。禁用时从该 View 撤下反馈类与 hover，父 Picker 的 disabled 继续负责阻止打开。

批量迁移只改导入及触发面的 tag/对应 disabled，不改 Picker 的 mode/range/value、aria 文案、onChange 或表单持久化：

- 计划编辑、结束/出发时间共用行、出发交通方式。
- 贡献表单共用日期字段。
- 计划回顾年份。

原生 Button/Picker 的手势与点击职责没有合并；无需把 Picker 的触发面改为额外 Button。

## 已执行检查

公共 facade 既有 3 项保持，新增一个行为检查实际输出 native View、同一原内容及 touch port、公共 hover，以及禁用后撤下旧按压样式。共用 `shared-button-test-support` 仅按真实 facade 展开 Button/PickerTrigger，各原生宿主和其他 hook 边界保持。

公共按钮、SoftButton、共享适配实际消费者以及原计划/贡献相关检查 11 个文件共 **26/26 通过**，约 1,985.0663 ms；小程序 TypeScript exit 0。随后当前源码一次完整 Mini Program 集成 exit 0，2,758 项中 **2,757 通过、0 失败、1 既有输入条件跳过**，约 79,930.0197 ms；未再改被测生产源码。[独立审查](R19-PICKER-PRESS-REVIEW-20261023.md) 未发现新增 P1/P2，8/8 声明接入及 native disabled owner 保留，最小实际 facade 检查 4/4 通过；没有补丁前 TSX 快照，不冒称严格前后字节差分。root 也实际查看同一采用 `press.png`，未把它当 native 输出。

本机私有根 `r19-ui-20261022` 保留 scoped、typecheck、`ui-picker-press-miniapp-suite-20261023.log`；全量 SHA-256 为 `7363866f2438a2036babd6216ff34f1978261ab96d952cec03531d2276bbef07`，类型日志 `1e7137e434d0121bb69677a53d7a32442466d7dde41d1b63d2e7fd29cbb361e7`。唯一跳过仍为未提供 `CLOUD_SKY_SCIENCE_PUBLICATION_PATH` 的既有 science-source 输入条件，未新增 skip。

使用项目已有 isolated-check 输出机制完整编译到 `apps/wechat-miniapp/dist/weapp-check-r19-picker-20261023`，首次目标不存在才写入，未覆盖旧产物；Taro/webpack exit0、31.541秒，命令总耗37.768秒，10项既有CSS顺序/size advisories。350件/5,019,292B，fingerprint `d6dfcea30045b5a2b94c75602f927bdd4653bad063ffc87d6b8974fe77aeb8b6`；main2,030,951、content1,041,523、spot612,068、sky1,334,750 B，现有每包/总体预算通过，maps0。当前普通输出 `dist/weapp`、gen8 prepared、config语义及原QR未改；实际 `assertGenerationCurrent` 再核gen8仍为原hash/350件/5,018,782B。

该 check 构建明确使用本机 loopback 8798 的API/sky-resource origin，关闭 fixture/diagnostic/operator token，仅验证完整编译及包预算；不是 phone-qualified 或 release candidate，未运行或声称手机origin准入。日志 `ui-picker-press-build-20261023.log` SHA `d17182399c33a0fd050f809ddb2147b49deede40e4d7af8912408c3e277f3a19`，完整文件清单 `ui-picker-press-build-manifest-20261023.private.json` SHA `5a1bbbc49d821b40b97a7b5fc551631a64e93ba6bd893fecae78518b71265553`。清单后处理首次命令有 PowerShell 管道语法错误，整段未执行；修正后一次读回/预算/清单保存成功，没有重复构建或覆盖清单。diff check无空白错误，原PLAN哈希未变。

## 候选与证据边界

本批新源码已完整本机 check 构建，尚未进入正常手机候选或送达手机，不能借 gen8 的二维码或旧按压录像记目标通过。gen8 冻结 prepared/dist 继续保留，只含先前来源/正文及公共导航修复，等待已有实际扫码问题的答复；不重发同包预览，不用旧手机 session 操作。

真实 Picker 打开/取消、禁用切换、滑出/滚动接管及显示效果需在纳入本批源码的后续正常候选核对。Node 测试不模拟 native Picker 或认证 80/140 ms 动画。完整 R19、叠层和 Sky 义务未完成；原 PLAN 未改。
