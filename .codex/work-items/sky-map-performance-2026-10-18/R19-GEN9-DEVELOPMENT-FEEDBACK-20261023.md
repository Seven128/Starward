# R19 gen9 合并候选开发反馈 — 2026-10-23

**历史候选：已由含My入口级联修复的gen10替代，不能继续扫码/绑定gen9。** 本代实际模拟器首图发现左上My入口不可见；修复/本机证据归[R19 My入口级联修复](R19-MY-ENTRY-CASCADE-REPAIR-20261023.md)，当前状态只以HANDOFF为准。原QR成功与全部原件继续保留，不倒改历史终态。

## Candidate identity

模式为`development_feedback`，不是settled-candidate验收。复用`codex/remote-main-20260908`/HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`及全部dirty成果；当前源含My左入左出/去bar、公共前台/Back/通知、Picker和来源/正文修复。feedback `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm`，prepared `generation-000009-YFKuNJ/project`；bundle SHA-256 `a6daa76cfa7ef274030fbc60db0b6cbea48566976bd78db58a44438c2d73afe5`，345件/5,020,981B。main2,032,618、content1,041,539、spot612,072、sky1,334,752B，maps0。当前普通构建与同源隔离check逐字节相同；手机准入还绑定了原显式USB-reverse配置/映射及正常生成流程，不能仅凭loopback地址的check自行宣称手机已运行。

## Invocation result

官方普通二维码已`qr_ready`，结构化`create_preview_qrcode: success/success:true`，exit0；新诊断`.official-process-5b8bc824-8bab-4a1d-b70e-616566d0a4b9.json`及QR`.official-preview-qr.png`均在本代目录。没有taskId待查询，没有操作在途；deviceSession=null，未bind。二维码文件标签已向当前任务右侧排队（queued不冒已显示）；已向用户请求原测试手机扫码、信任运行并保持前台，替代旧gen8扫码。

首次public refresh误走PATH另一套D安装，30.273秒停于CLI初始化`wait IDE port timeout`，原structured unknown/taskId:null、diag `812fa322…`保持在私有原件。[独审](R19-GEN9-PREVIEW-PREINVOKE-REVIEW-20261023.md)以同安装的正面控制流确认preview业务handler未调用，不以进程退出猜平台业务failed。348件/5,024,718B逐件SHA保全，manifest `f2ae23504a8c2fc0f95541c4225f4ca9bfd79d09d0172cc68694d1400a49451e`。

入口恢复复用原私有Stable实例，实际进程13920自2026-10-21运行。先前仅按D路径筛进程而漏掉它，“全IDE零进程”的推断撤回；有界GUI启动没有解决入口，后一次明确返回已有实例唤起/exit0。没有停止共享IDE或改profile。显式原`r22-stable-control-20261021/stable-app/cli.bat`的官方status为agent_ahead/loginExpired=false/cliTokenRequired=false，legacy doctor login=ready。此后普通命令必须继续显式该CLI，不能再用PATH猜安装。

本次task-local初始化not-invoked receipt绑定原diag/本代bundle/独审，原result未知保持。最初选择的legacy`not_invoked` disposition被普通preview白名单提前拒绝，没有调用driver；仅映射为已有`manual_required`初始化表达后，原owner白名单与generation guard实际通过，再发起一次新的普通preview并成功。两份receipt、初次gate拒绝日志和原unknown均私有保留；未改生产或通用守卫，没有将timeout普遍放行。新success只属于这次显式Stable调用。

## Observed product behavior

尚未确认gen9手机产品画面。本次USB守卫只读截图实际为共同攻略/隔离TEST照片页，不能识别当前generation，未bind或输入。原Stable对本代精确prepared入口打开新窗口s2后，官方不带等待的截图实际显示Map、右侧五个工具和无底栏，但左上My缺失；源码及实际编译CSS确认后部公共map-tool规则覆盖入口的absolute/44px/26px，已作为P2修复到后继gen10。该画面不证明点击、方向、滚动、Back或系统相册返回。初次runtime读取无runtime，开窗后一次读取timeout；应用可见而自动化未就绪，不能写成产品启动失败，未排队更多SDK动作。

## Verified

[生产整合与独审](R19-MAP-MY-INTEGRATION-20261023.md)拥有当前2783项/2782通过/0失败/1既有输入skip、正式类型与完整编译结果。当前正常手机构建30.655秒/10项既有advisory，包预算、双份完整指纹、physical bundle guard及编译纯地址owner五角色全通过。原runtime-usb配置和唯一授权USB的8798反向映射已只读核对；本机API/bridge各200，未改变映射、服务或VPN。独立nc手机HTTP探针空输出仍为unknown，并已停止；不是本项通过事实。

QR ready后再次`loadFeedbackRun`/`assertGenerationCurrent`通过，bundle仍a6daa76c…、deviceSessionBound=false。新state/QR/成功诊断3件/50,724B已私有逐件hash读回，manifest `2434be045b6f154a9214214a0f4e5fc0451eb4b68cecc20f9de6ac0770be5a73`；gen9最初整包原件与新QR原件组合保全，没有上传私有证据。

## Unverified

实际扫码后的可见generation与微信HTTP；先验证Map→My→Map、Map→Search→Map的左/右方向、原生地图合成、单次Back、相同Map/Page、camera/panel/scroll/Context、有效hide。然后完成My原生子页/系统选图、键盘先Back与动画反向的相关恢复；来源媒体完整本站地址/复制成功、原文/图片Back保留；HR8162分隔线以下正文与长滚动/来源返回；Picker开/选/取消及按压/最终资源对照。旧gen7已答范围复用，不重复组合矩阵。UI目标未验收前，叠层及Sky性能/内存义务保持原顺序和缺口。

## Invalidated

旧gen8当前临时generation由反馈owner正常退休，不能继续扫码/绑定；退休前355件/5,070,586B全部私有保全，manifest `a93947b76349b18906f4a3306fb5caccb16353e735fe11933a8990a1fceb667e`。gen8的QR、历史unknown和失败原件继续保历史；gen7/8旧session和截图均不提供本代输入资格。新候选重启可能改变内存态，不能用于原同条件性能对照。

## Cleanup

后续My入口修复前，本代完整反馈350件/5,073,446B逐件大小/SHA读回保全到私有`r19-ui-20261022/gen9-before-entry-repair-originals-20261023`，manifest `ee2878251f387a81bcf86c4aea069330e6e9893cd4cac85757059dab4a3eec69`。仓库最新源码完整编译后，官方`close_project_window`精确关闭本代s2，随后反馈owner创建gen10并正常退休旧临时入口；不再保留gen9窗口或输入资格。现有Stable未重启，未改全局CLI/PATH。R27 gen31、全部Harness、冻结构建、旧私有原件及账户/N05/R6继续保护；没有Git交付、后端部署或数据上传。完整Goal仍active且未完成。
