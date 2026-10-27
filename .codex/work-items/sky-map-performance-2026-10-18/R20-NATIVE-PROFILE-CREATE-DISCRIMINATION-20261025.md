# Native 新建完整预设身份判别（2026-10-25）

结论：此前静态线索已由一条实际组件→生产 SQLite 旅程证实为 **F06 新建入口 P2**。“新建完整预设”保存沿用当前 A 的 identity，修改 A 而未创建另一套预设。严格正确期望 **1 failed、exit1**，没有把预期失败改为通过。产品源码和现场均未改；本判别不否定此前跨视图确认的已通过范围，也不阻断 Root 当前仅只读 r2 的手机回归，但扩大实际新建写入前须由原 F06 owner处理。

## 真实任务含义与输入

已核当前 PLAN Native F06／quick/full责任、global/default、Native Screen core journeys、Source `mobile-shell-and-preferences`、当前 interaction Skill／Native mapping及 Native DESIGN适用边界。Source `REQ preference-profiles` 明确多套命名预设；`preference-wizard` trigger区分新建与编辑；`profile-switcher` input包含新建入口。实际按钮亦明确写“新建完整预设”。因此本例的“保留原 A，创建不同 identity 的 B”来自真实产品合同及入口含义，不是按回调函数名推测。

绑定 `tmp/native-cross-view-profile-confirmation-repair-20261025/source-freeze.json`，28项，SHA256：

`b7fbf6c562163418e1f0ac86cef7bdd88e291295ac4ab63a222e053c0b0417ca`

开始和结束均逐件核长度／SHA一致。没有修改该28项、permission module、Root PLAN／HANDOFF／Context／Goal或 Git；没有借 Root提供的 CI／编译／手机状态充本结果。

## 单一实际旅程与读回

证据在 `tmp/native-profile-create-discrimination-20261025/`。复用既有语义独审中 **首条测试之前**的 Native primitive／React／生产 SQLite 接线脚手架，新增一个独立案例。真实 RuntimeRoot、MobileShellScreen、PreferenceWizard、共享 editor／attempt、store／domain和生产 Expo SQLite adapter均未替换；仅 RN primitives渲染为 jsdom、Expo crypto使用Node原语、Native SQLite primitive使用真实Node文件SQLite。

1. 沿原 runtime保存合成 A：`id=create-original-a`、name“原始预设A”、revision4。装载实际 Screen后，新建独立 SQLite连接确认 canonical projection只有A且A为current，完整值与输入一致。
2. 点击实际“档案切换器，当前 原始预设A”→“新建完整预设”；在实际独立 Wizard填“新增预设B”和驾车距离12.75km，点击“保存并设为当前预设”。
3. 重新打开独立 SQLite连接读 canonical：profile count **1→1**；唯一对象仍为 `create-original-a`，revision **4→5**，name变为“新增预设B”、驾车距离变为12.75。current仍同一id；Wizard已关闭，实际数据库写次数 **1→2**。
4. 正确期望“新B identity必须不同”首先失败。预先记录的所有结果亦显示 `previousPresetUnchanged=false / distinctNewPresetCreated=false / countIncreasedByOne=false`；不是仅UI名称或 facade投影错误。

`actual-effects.json`保留合成完整前后 profiles、canonical原始字节及结果，SHA256：

`388b4bead9e98f1245f92b5c973bc6df2de8ca543b20f52e9088bdab182fb47b`

`create-profile.test.tsx` SHA256为 `928487478a042f366469772d50ae6de17ebf982b0437167dfb1029c74d407ea7`；`strict-counter.log`保留实际失败。没有重复该同条件案例或扩新组合；所有数据均为本轮合成资料，未读取手机／真实用户数据库。

## 原 owner 与最小修复边界

`MobileShellScreen.tsx` 当前 `onCreate`仅切到 independent Wizard；该 Wizard仍传 `initial={activeProfile}`。`useProfileEditor`以这个完整初始对象建立原草稿／target id，原 save-attempt保留该 identity；生产 CAS因此正确执行了旧 A 的更新。首个错误边界是**新建任务没有建立独立的新预设草稿身份**，不是存储 CAS写错对象。

修复应在现有 Screen／profile创建与编辑 owner区分“创建另一套”与“编辑当前套”，新任务身份只创建一次并沿原共享 draft／attempt保留到明确保存、重试或取消。不能每次保存／未知重试重造id、改CAS、借改文案隐藏入口语义，或把已修 Quick→完整的同次编辑拆成第二套草稿。初始值仍按原产品合同处理，不能引入未确认的示例默认。本轮不实施或证明上述修复，也不追加其恢复矩阵。

## 收尾与保留资格

运行命令：

```text
node tools/run-node.cjs --bin vitest vitest run --root D:/dev/Starward/.codex/work-items/sky-map-performance-2026-10-18/tmp/native-profile-create-discrimination-20261025 create-profile.test.tsx --reporter=verbose
```

执行为 **1条严格失败**，通过真实保存后才失败；不是选择器／路径／环境准备失败。React root卸载、全部SQLite句柄及独立读回连接关闭，测试 worker／父进程均已退出，末查存活0；fetch防外联守卫调用0，没有listener。`start-pins.json`／`end-pins.json`／`completion.json`及脚手架来源另存。

仅写本报告及自有ignored tmp；没有设备／ADB／APK／IDE／provider／服务／网络主机／Secret／VPN／防火墙操作。此处没有 Native像素、Expo真机SQLite、键盘／Back／生命周期、定位、iOS或完整family资格。新建P2归F06队列，由Root决定下一实施次序；性能两类仍后置、OOM与完整Goal保持未完成。
