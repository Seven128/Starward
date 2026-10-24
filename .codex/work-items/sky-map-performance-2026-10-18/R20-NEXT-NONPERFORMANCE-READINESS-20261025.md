# 非性能下一责任只读准备（2026-10-25）

结论：当前可并行准备 Native 运行条件，并沿已完成的行程持久化 owner 补齐**用户手工阶段编辑**。这不重开已独审的历史恢复、同 owner 观察身份或模型缺测修复，也不改变层叠／Sky Play 性能后置和 OOM 未解决状态。Root 已交付本批 `b4d2654540e203ffa247e31b1cc21db70aeab4e9`；本报告只提供下一动作依据，不证明 Native 或完整 family 通过。

## Native：先补实际准备资格

已读当前 NEXT／INDEX 入口、完整 REQUIREMENTS／INHERITED／PLAN、最新 HANDOFF、适用 AGENTS、default Context、Android／verification owner、当前 native interaction skill及现行实现。F05/F06 定位与根 hydration、偏好 v2／SQLite CAS／Web CAS、F07 Context／同 id 刷新和本批消费者均直接复用；缺口是实际平台许可、定位精度／来源、原生持久重启、导航及输出。

- `tools/long-task/run-native-design-diagnostic.mjs` 是现有入口，调用同一 `verify-native-target.mjs`；它会进入 Release 构建、`install -r`、冷启动和场景操作，不能当只读 preflight。既有 verifier 还含显示／权限／log 操作，Root 须先界定目标与影响，不直接把当前微信手机送入整个设计诊断。
- 此次只读文件／环境检查：未设 `ANDROID_HOME`、`ANDROID_SDK_ROOT`、`JAVA_HOME`，PATH 无 adb/java；默认 SDK、`Program Files/Java` 及 runner 的 Android Studio/jbr fallback 不存在；仓库常规 debug/release APK、android/gradlew 和当前 TEMP 的 `starward-android-build-cache` 不存在。**这没有排除自定义路径，也没有检查手机安装状态。**
- 现有 `tools/miniapp/device-adb.mjs::findAdb` 的 `%LOCALAPPDATA%/StarwardTools/android-platform-tools/platform-tools/adb.exe` 实际存在；Native runner 的解析器尚未使用这个 fallback。Root可先复用该二进制做受控只读设备／安装身份资格，不重复下载 platform-tools。
- App 默认 `apps/mobile/app.json` 为 emulator 的 `10.0.2.2:4318`；`runtime-api-base-url.ts` 可由现有 `EXPO_PUBLIC_API_BASE_URL` 覆盖。Native `apps/api` 与当前手机小程序 API 是不同组合，不能借小程序 8806 ready 或普通微信推送认定 Native 可用。先核当前 API／来源与相应网络路径，不新建 adb reverse、不改 VPN，也不恢复后置性能环境。

Root接续顺序：只读确定现有 JDK／SDK／目标 ABI及包身份 → 核同版 Native API和实际可达入口 → 一次同候选有归属的 Native 会话。当前没有新证据要求用户 UAC／重启；真正系统信任、解锁或许可弹窗无法自动完成时才保留具体现场动作。安装、编译和设备输入均未由本报告执行。

## 可独立继续：手工阶段编辑贯通真实保存

上游依据：`docs/source-plan.md:2334` 的 `REQ versioned-editing` 和 `:2495` 的 `CTRL observation-timeline-editor` 要求排序、增删和调整阶段，失败保草稿／回滚，版本与消费者一致；`project_context/areas/main/screen-contracts/mobile/core-journeys.md:64` 明确 timeline owner、真实 create/edit／冲突／重启责任。整体路线、地点、天文重算和拖拽验收仍保留，不能由下面的手工编辑子路径关闭。

**当前真实缺口：** `ItineraryScreen.tsx:199–211` 的编辑基线和保存只包含 title／inputs；`:241–253` 的生产表单没有 stages 编辑。stages 仅被时间线说明和历史差异读取。相应 API parser／`ItineraryService`／domain 已支持 `patch-draft.patch.stages`、原 owner 限制、baseRevision、receipt 和 SQLite 原子提交，因此无需新端点、第二份草稿／pending 或另一事务平台。

当前可复用语义是：

- `draft-command.ts:36` 只接受用户阶段 `departure / scouting / observation / return`；id 非空且不重复，字段仅 id/kind/startsAt/endsAt。stopId、计算得到的蓝调／无月／目标窗口不在这个已支持输入集合；不能为补表单伪造天文事实或地点资格。
- 现有 `normalizeUtcMoment` 保规范化 UTC 瞬间、秒／毫秒；itinerary timezone 保原 IANA 语义。`validateTimeline` 要求起止合法且不重叠，原 CAS 冲突不默默改 base。日期改变而旧阶段未核对的 `itinerary_stages_require_review` 继续有效。
- 沿同一个用户草稿／明确保存与取消动作提交 stages，保原 inputs、身份、未知 input/key/owner 及旧版本；采用本批已修的精确阶段差异表达。64KiB 限制保留，不能静默裁剪、拆多次效果或在未知状态另发新 key。

建议下一实施动作：在上述现有 editor／domain／client 责任内补这条手工编辑路径，先读 Native 对应采用资源和完整控制合同；用实际 Screen→client→Fastify／SQLite 验证用户修改产生新 revision、取消／非法时间不写、冲突及丢回执保原恢复身份，并复用已有历史查看／引用恢复消费者。相称检查后独审；Native 手感／视觉、真实路线与天文生成、完整 entity family和生产部署仍分别未验。无需等待 JDK／真机／外部供给才能完成这条源码与本地效果责任。

## 本次边界

仅静态文件、环境变量是否存在和命令解析位置检查；未执行 adb/java/Gradle、构建／安装／测试、真实 provider 请求或 UI 操作，没有触及手机、IDE、服务、网络、防火墙、凭据、Git、PLAN／HANDOFF／Context。唯一写入为本任务报告；没有新后台资源。
