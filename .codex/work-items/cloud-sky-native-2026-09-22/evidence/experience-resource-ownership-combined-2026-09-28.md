# 共享图片释放、粗层恢复与当前合并候选

## 模块结果与边界

按唯一 PLAN 的 D 依赖核查图片、Canvas 与恢复，发现并修复两处旧解码对象滞留：共享图片 Hook 退出后，其内部状态仍持有旧 Canvas 和图片 Map；注册深空切图为了恢复粗层，把文件信息与旧 Canvas 图片一并保留。页面返回空图片、临时文件已删除或旧 generation 不绘制，均不能单独证明引用已退出。

本轮复用既有加载/请求、GPU 和 Canvas owner。共享 Hook 清掉所属 owner 的状态；深空切图分别持有请求文件、最后成功解码的文件元数据和当前原生图片。隐藏/Canvas 释放撤原生图片及回调，粗层文件穿过节点重建空档；新代重新解码，细层失败仍保粗层，迟到粗层不替换成功细层。不逐天体另建加载器、时钟或渲染路线，也不改科学位置、图像/WCS/相位/缺测语义。

这些实现与本地恢复证据不等于实际 GC、GPU/native 峰值、手机帧耗时或完整交付通过。B3 完整场景构成、其它组合/配准、目标平台、独立审查及费用义务继续。新月面/修复仍未推手机，旧 D 不升级；无新云部署、发布、采购、提交或推送。

## 修前失败与实际消费者

[源码身份](experience-resource-source-identities-2026-09-28.json)绑定本轮前后文件。前置快照完整保留已有修改，未回滚无关工作。

- [共享 Hook 修前](experience-image-owner-retention-before-2026-09-28.log)：旧检查通过，新隐藏/无 Canvas/无 publication、空新代的引用回收检查失败。修后当前 owner 状态退出；复用实际生产 Hook、原加载器/请求，补隐藏/恢复及迟到取消消费者。
- [深空页面修前](experience-deep-sky-retention-before-2026-09-28.log)：隐藏后仍持有旧 bitmap，新增消费者失败；文件与 bitmap 分开后，节点空档及细层失败的粗层恢复、新代/迟到隔离、文件替换释放和实际 Canvas release port 均验证。
- [本轮受影响检查](experience-resource-ownership-affected-2026-09-28.log)和[最终类型检查](experience-resource-ownership-typecheck-r2-2026-09-28.log)通过。范围包括实际 Hook/页面 effects、请求写入/取消、原 W3/固定天体文件链、Moon coverage-v2/OPAL/光学消费者、Canvas 时间/全天写入和生命周期。74 项只表示这些检查，不表示整体完成比例或所有天体已在本代设备验证。

任务检查自身曾有 getter 跨状态的 TypeScript 窄化、退休回调签名及节点 gap fixture 先推进构造 revision 的问题；已改为动态读取/正确签名/真实依赖顺序，失败日志保留。这些不是产品缺陷修复。旧测试中的“隐藏时保留旧 bitmap”期望撤销，保留的是可恢复文件；新检查同时要求新代实际粗层解码，避免只把期望改成空图。

## 同一候选的原生往返与文件证据

无诊断 `weapp-check-sky-combined-clean-v4-0928`、官方 CLI 实际 SDK9437、独立 API8789。公开 Map 搜索“示例观星点”→正式卡片→云观星→手动→公共时间 00:00，随后真实月球/M31 搜索资料定位。不是私有 setData、mock 或工具合成位置。

[月面三次设置往返](experience-resource-clean-v4-moon-2026-09-28.json)：UTC16:00、1°手动月球，新 PNG 实际加载/绘制。每次本候选新增 4 个图片文件/1719966B，隐藏后全部清理，返回再加载同量新 generation；同页、时刻、倍率、对象和实际 Canvas390.4×844 保持。1595187B coverage-v2 PNG 是已处理资源的正常小程序加载，不是重下4.25GB原始数据。

[M31 三次往返](experience-resource-clean-v4-m31-2026-09-28.json)：UTC16:00、3°手动“M 31”，AllWISE W3 图与实际署名恢复。隐藏后共享图片文件清理；43918B 请求/粗层恢复文件仍由当前 metadata owner 持有，返回重新解码。首轮 5 个共享文件降至当前视角所需 2 个，后两轮稳定 2 个/63127B；不把文件数下降当内存预算通过。

原有调试目录基线是161个天空 owner 文件/15802757B，可能属于其它候选或历史缓存，不能全部归因本候选泄漏。上述六轮均读回原161文件仍在；没有手工清理它们。只统计新候选相对基线的新增/释放。编码文件字节不等于解码/GPU 内存；原16MiB保留预算不自动保证峰值。

M31 资料的独立来源页展示 OpenNGC 与 AllWISE 许可、数据边界及显示处理，Back→关闭资料后，同一星图/时间/倍率/对象及实际影像署名恢复。前后公开状态、完整来源文本和本代截图在[原生捕获](experience-resource-clean-v4-native-captures-2026-09-28.json)。月面与 M31 的实际纹理均已查看；Canvas 覆盖普通 WXML 的既有 DevTools 合成差异仍在，不能证明手机控件组合/物理输入或 OS 后台。

## 画面与取证纠正

197×423是工具截图尺寸，Canvas 实际为390.3999938964844×844；系统 windowHeight762 不是 Canvas 高度。[真实系统边界](experience-resource-native-capture-bounds-2026-09-28.json)读回胶囊 bottom83。首轮比较 y=40 错把胶囊边缘包含进“星图区域”，所得 M31 79px/max37 的记录保留，不能解释为星图内部差异。

[修正比较](experience-resource-native-pixels-bounds-2026-09-28.json)以实际胶囊边界及4px系统阴影余量得 y=46，并排除屏边/底部系统手势区。月面前后区域0px差；M31 设置恢复、来源Back及稳定图各1px、最大1灰阶差。完整 PNG 有系统时钟/胶囊变化，不声称整屏相同或实际定位精度已通过。

部分任务断言曾不适用：Moon 来源未出现在 image-status-group；M31 的实际名称为“M 31”、影像署名为“AllWISE W3”而非含对象名；Map/search 的猜测 selector 不存在；SDK navigateTo 接受字符串而非 wx options 对象；一次 shell 使用错任务目录。按实际输出和现有 SDK 修正取证，原错误保留，不记为产品故障。首次 SDK 错误只返回原生对象错误，修正 URL 形态后完整运行成立。

## 当前候选与下一依赖

[候选指纹](experience-combined-clean-v4-candidate-2026-09-28.json)为 `9f62a19285905e7d08aac5fe8551f9d5a6c63514aee4e40815e4511ac4d8f62c`，257原始文件/4450063B；main2073919/content1012055/spot423617/sky940472B。对 v3 新增473B，仅 Sky；无 sourceMap、诊断、vConsole 或 mock。构建通过，原 CSS 顺序/webpack 体积与建议三类 warning 保留。原始字节不是官方包体。

[实际服务读回](experience-combined-clean-v4-service-readback-2026-09-28.json)为 LOCAL/MEMORY_TEST/LOCAL_TEST fixture：当前 Context16:00Z、Asia/Shanghai、观测夜09/28（民用09/29 00:00）；W3 v2/51条覆盖未知和月面coverage-v2哈希/1595187B正确。257原文件在实际往返后未变，后续来源/截图未修改产品字节。保持8789 exec49882和原8787共享内存、8788 pass；不重启旧服务。

[最终逐文件核验](experience-resource-ownership-final-identity-2026-09-28.json)在最后来源Back和截图后再次确认257原文件及4,450,063B未变，当前任务引用66项可达。受影响源码/检查/Context的`git diff --check`通过；[Context结构校验](experience-resource-ownership-context-2026-09-28.log)通过，仅核manifest路径和明确控制源声明，不证明产品事实或普通Markdown链接。引用回收职责已更新原runtime-and-domain owner；自审不充当独立审查。

最终当前页：普通DAY、00:00/16Z、3°手动 M 31、AllWISE W3处理后影像、无跟踪，地景/星座开、广角W3关，资料/列表/时间面板关。v3 的环境与 v2 的完整旅程保其旧条件，不认证v4手机。

下一依赖继续唯一PLAN的 D：沿完整浏览/切换测真实工作集与热路径、失败/资源恢复，并集中固定候选目标组合。目标首屏/帧时/GC/native峰值/流量/官方包体、Android/iOS、真实姿态/完整校准/OS后台、B3完整质量、独立审查和实际费用继续未验；等待设备时继续独立实缺口。自审不是独立审查，无新授权不 spawn。
