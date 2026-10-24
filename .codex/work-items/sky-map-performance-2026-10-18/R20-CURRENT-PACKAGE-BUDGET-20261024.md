# 当前普通主包边界收口（2026-10-24）

**Root最终判定：候选拒绝，未采用。** 完整构建仅总计减46B/common减29B，独审确认旧factory正文早已被编译剔除；下文原“factory仍可见”的定位被实际AST反证，保作过程证据。全部本候选源码/patch/manifest和完整负向bundle28ec887b…已保存在私有 `root-usb-20261024/rejected-facade-candidate-20261024/` 与 `rejected-facade-build/`。root只还原自己本轮改动，WEAPP恢复HEAD63ee13b，原用户变更未动。当前canonical重新完整生成E9。相关测试通过不能关闭包体问题，不继续相同facade移位扫描。

后续EfkxhB采用已核的开发期大包private flag获官方自动推送成功，见[手机证据](R20-CURRENT-UI-DEVICE-20261024.md)；正式2MiB缺口仍保留。本文件下文是被拒候选的原实现说明，不再是生产现状。

本子任务仅修改当前 WEAPP 源码的 transport/package 边界。root 独占完整构建、官方准入、IDE、手机及服务；本作者没有构建或刷新任何普通/冻结代，没有推送、部署、Git 写入、原件上传或删除素材。完整 Goal 和唯一 PLAN 不变。

## 实际问题与边界

root 当前普通候选 339件／5,025,700B，bundle `e9e540552df10842784eb21bb44e924b989a48f2894321b50af5dc1dd0153de6`，官方 `auto_preview` code10 明确 main source **2051KB > 2048KB**，未送达。原失败候选及 stdout 归 root 的 `V87XzN` feedback。旧普通 `bee4293e…` 与当前生成物逐件比较只有五份 JS 变化；main 的 common.js 增1,180B、Map增164B。官方与本地计量不同，不能由本地差额保证准入。

复用旧 PACKAGE-AUDIT 与已完成六个 Tab-only PNG 退休，不重做它们或 R27 诊断包边界。旧审计已经排除有用的 PNG 无损重编码收益，本次没有改图像像素、字节、尺寸或许可。

当前真实调用扫描表明，profile links 和 post import 的九个业务方法只由 `content/profile/links`、`content/import` 两个现有 Surface 消费。两页目前不在主包/当前 app.config 路由注册内，不能为包装优化新增路由或删去这些保留实现。当前 common.js 中未用的 HTTP 方法正文已被剔除，但 `profile-link`／`import-save` 的模块级恢复写者创建仍可见。主传输持有这两个 factory 的原因是顶层实例化；账户清理需要的实际责任只有它们的存储 key/predicates。

## 最小变更

- 新 `services/profile-link-client.ts` 和 `services/post-import-client.ts` 分别承接原有 Surface 的 HTTP facade 与唯一模块级 retry instances。原九个函数逐一与 HEAD 的 TypeScript AST 正文读回比较，**全部相同**；未改 auth、owner、idempotency、完整输入、读回、取消或 invalidation 行为。
- 两个现有 content Surface 调用迁入对应 client，不新增路由、按钮或业务。主 `api-client` 不再反向导入这两个 client/recovery factory；它继续独占原 `ensureSession` 和 `invalidateAfter`，仅把这两个既有共享 owner 导出供 facade 复用。没有第二 session/cache writer、重复实例或循环依赖。
- `profileSaveStorageKey/profileSaveBelongsTo` 与 `importSaveStorageKey/importSaveBelongsTo` 移至已有 `local-draft-keys` owner。精确 prefix 和 JSON owner identity 未变；账户删除仅依赖窄 predicates，未知持久恢复记录仍被原恢复 owner 保留。原 retry 模块兼容 re-export predicates，现存调用无需改其数据合同。
- 原两个 mutation 行为测试跟随负责 client 读取源，断言未削弱、未改为源码形状通过。没有调整全局 minifier、WeChat 预算、bigPackage 选项、BSC/SAO、科学精度、星数、UI/样式、生产图像或未改区域。

## 本作者实际检查

- 6个现有文件：账户认证/导出/删除，profile/import 原持久 retry、跨账号及本地 key，**41/41，通过，无skip**。
- WEAPP workspace `typecheck` **exit0**。
- `check:miniapp:sdk` **exit0**；限定 `git diff --check` 通过（仅既有 CRLF 提示）。
- 原9个 facade 函数完整 AST 文本比较相同；所有真实 profile/import 生产调用已迁入两新 client，主API不兼容 re-export它们，避免把依赖重新带回主包。

这些证明代码职责/接口及受影响行为，**没有新的构建字节、官方包体或手机结果**。实际节省及2051KB问题是否关闭，仍须 root 从当前源一次完整构建、官方结果及必要新独审判断。旧失败、冻结代、原私有输入与全部 UI/叠层/Sky/内存/OOM义务均保留。
