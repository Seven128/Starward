# R27 gen33 实际完整构建与包图

2026-10-23 Root沿[恢复实施](R27-SKY-PACKAGE-RECOVERY-IMPLEMENTATION-20261023.md)和[独立源码审阅](R27-SKY-PACKAGE-RECOVERY-REVIEW-20261023.md)，仅对新的固定Sky任务包恢复代prepare/build/inspect成功。**此时未预览/绑定/Play；静态预算与包图不是微信实际准入或内存修复。** 旧gen32拒包原件及普通gen16保持。

## 身份与构建结果

| 项目 | 实际值 |
| --- | --- |
| 固定trial / generation | `tmp/r17-normal-a1-review-r27-usb-sky-package` /33 |
| source / manifest SHA | `ca679bcc8c924e01855b0e3ba956716401499595125c3351f7a0d2d60777c5dc` / `5607f9a3c9ad66e4d95dda38d33262a962563bd1f8e10cd57945cc1c39f99c29` |
| source snapshot SHA | `02f59f62ff9e95196b9af6cffb46dde0dc51bfa3316ad3f21da719e806676409` |
| bundle / files / bytes | `42db0d73b829e3fc611ad081dbf7ded7f84e90eeef2afac1e9d4135b1dfbae0d` /344 /5,117,627 B |
| main / content / spot / sky | 2,036,467 /1,041,536 /612,077 /1,427,547 B |
| 本地main静态余量 | 60,685 B；不是官方打包安全余量 |
| 包外source maps | 30件/7,585,636 B；两手机包均maps0 |
| 完整编译 | exit0，webpack34.023秒/10项既有warnings |

实际prepare为1616件；原30项正常事实全true。实际磁盘准备源码的生产/准备/新增类型诊断均0；完整build、两份bundle hash、预算/static/physical guard、编译origin读回及inspect通过，R17当前准备元数据仅由Root inspect指向gen33未激活。修改前gen32元数据原件SHA `ba943e7d1f674c5561374cc8b60d160fed11663922d7040930de66bcfdcbc608` 已先另存。

## 实际编译归属

Root读取全部包外maps的真实生成mapping：R25 lifetime/stellar/adapter、R26 aggregate/fiber/owner、R27 callback observer/links共8模块均映射到 `sky/detail/index.js.map`，没有在main生成段。窄ports只映射到 `common.js.map`，实际全部JS中冲突保护定义仅一处、在 `common.js`。adapter注册原固定方法的真实生成调用已按原第14行映射到Sky代码核对；不是仅在未编译模板搜字符串。

包图证据 `gen33-actual-package-graph.private.json` SHA `7a25d91dd68d5fa2a1c85ab17ad75a35471054f78b37c775f53273401e3da2fc`；实际注册调用证据 `gen33-compiled-registration-call.private.json` SHA `7a7a1578a8c05cb918a002f7630967fafb3e574998334998041bf172b02cbccc`。这建立磁盘模块归属和生成调用，目标单实例/实际注册与有用8样本仍待真实观察。

首个inspection脚本错误假设source-map文件名使用斜杠basename，误报R27 source missing并在任何写入/后续动作前退出。实际Taro将路径转为 `._src_features_sky_…`；Root先读取实际raw/mapped名称，再用准确已发现格式核验通过，没有改构建或产品。该工具失败及修正保在上述证据，不视为模块曾被删除。

## 保护与冻结

Root新构建后完整读回普通gen16仍 `51c72f19…`、旧gen32仍 `3bb55a21…`；私有完整文件证据 `gen33-build-protected-bundles.private.json` SHA `1d7fddd8b3b2dd39a510ea454398e699724abf4c5f7ae027b9a67b7ba71da502`。PLAN仍原hash，生产源码没有被本批改写。

新gen33完整owned trial/双包/maps、全部50模板、builder/当前准备元数据/审阅及实际包图证据，合 **2397件/33,762,384 B** 逐件复制/hash读回，另记录2个依赖junction引用、不复制其目标。私有 `r27-packaging-recovery-20261023/gen33-frozen-originals/manifest.private.json` SHA `fa11a3ab4f31c1a47fda0973f74d44a7a86276029571dadff04ea1cfc578b142`。**gen33现已冻结，不再prepare/refresh/build这一代。** 不能因旧gen32失败回去修改原件，也不创建压缩/删样本候选链。

## 下一实际边界

仅沿原Stable和同账户自动预览做一次新gen33实际平台准入；先读官方终态/实际画面后才bind。原gen32反馈已记failed且保原unknown，不再重发。成功后才允许原同一正式点/Context、全天空/地景、非空BSC+实际加载SAO下的有限R27采集；第一真实baseline的source/generation/run和active-5/首次drain关联仍须验证。

手机当前仍普通Map，未有新输入、Play、录像或watcher。UI/叠层/双指、完整正常Sky/六字段/SAO、持有根与OOM义务不由本机构建关闭。实际接下来状态只见HANDOFF；未部署/提交/推送/上传数据。
