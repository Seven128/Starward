# Search 资源失败反馈：独立审阅

2026-10-25。独立于实现者，仅审阅本批 `search-page.tsx` 的13行删除及受影响状态/恢复消费者；只新增本记录。没有操作设备、IDE、共享服务、构建、网络或Git状态，没有改App、实现、PLAN或HANDOFF。

## 结论

**未发现本批 must-fix，可由Root继续当前候选的手机对照。** 这是源码/局部行为审阅，不证明修复后手机画面、正常API或完整Search验收。

- `DESIGN.md:774` 明确Search等局部状态已经是反馈，不另弹floating notification。删除的effect只重复报告通用“搜索数据异常”，没有维护查询、资源、选择、重试或导航状态，也不承载唯一恢复动作。
- `search-page.tsx:312/321` 的过期/错误/权限分类保持。`useResourceQuery` 有数据时将刷新失败保为`refreshError`，无数据时产生`isError`；两者仍分别进入本页过期提示或错误面板。
- `search-page.tsx:661` 的本页反馈容器保持：过期资料明确区分“保留上次结果”与“无可保留结果”，提供“重新获取”；终态错误保详情及“重试搜索”。私有Context的403/404仍引导返回Map，普通权限失败仍走既有账号/Map恢复；未将权限问题改为自动索取定位权限。
- `search-page.tsx:339` 的统一恢复仍只重试当前失败/过期资源，并保页面、选择版本、账号、地图reset和Context资格。查询与有效独立结果没有因删除effect被清空或重置；未确认/失败响应不能冒“没有匹配结果”。
- `search-page.tsx:388/459/485` 的“暂时无法返回地图”“地点未切换”“地点未选择”等具体操作失败通知保持，故没有丢掉Context未提交、原查询/地点保留或原生选点失败的语义。取消/迟到/被替换任务判断未改。
- 没有新增布局、改样式/主题/采用资源或扩大其它通知范围。Root提供的修前手机网络失败画面与本页错误卡、重试及重复通用浮层的源码对应；本审阅不将那张修前画面当作修后证明。

## 独立执行的检查

在Mini Program workspace执行：

`node ../../tools/run-node.cjs --import tsx --test src/pages/map/search-feedback.test.ts src/pages/map/search-retry-all.test.ts src/pages/map/search-context-recovery-routing.test.ts`

结果 **17/17 pass，0 skipped**。覆盖空值/过期资料语义、保查询、权限/私有Context恢复、独立资源重试和有效旧数据保留；这些现有检查的源码提取/隔离执行不能代替WEAPP渲染或真实API。

限定 `git diff --check` 退出0。未重复Root已报告的67项或全量typecheck，没有添加镜像实现的测试。

审阅输入：`apps/wechat-miniapp/src/pages/map/search-page.tsx` SHA-256 `4b2dff67571fc0abb014585bba2c80aa7496e0eb0027938d22143925cf9c8cdc`。后续若相关输入改变，按实际差异重新判断本结论。

## 未验边界

Root仍需完成当前源码→完整WEAPP→普通手机候选的实际失败态对照，确认通用浮层不再遮筛选且本页错误/重试/查询仍可用。真实API恢复、成功选择/Context提交、身份与其它完整P1/H5结果仍归原Goal，不由这处局部修复关闭。
