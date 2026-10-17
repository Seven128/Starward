# 图像工具测评：唯一当前计划与压缩恢复索引

工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，既有分支 `codex/remote-main-20260908`。**本次独立测评完成；云观星主Goal继续暂停。**五方案实际对照、必要边界读回、[最终五方案报告](image-tool-final-results-2026-10-09.md)及[PS独审](image-tool-ps-independent-review-2026-10-09.md)全部保存。当前没有待执行的本次测评工作；到此停下，不自动开始后续配方改进或恢复主目标。

## 当前范围、用户要求与授权

- 目的：找出可高质高效加工大量云观星图像的工具/能力，**质量是门槛，过关才看总时间**。不能以“合格成品复用”排除目前未加工或不合格素材，不能停在纸面调研。
- 原始五方案：PS自身、PS＋StarXTerminator、StarNet2、nox、Siril＋去星工具。原样/Photutils/背景拟合是辅助对照，不顶替任何一条。代表后冻结规则、再三保留小批；输入/过程/输出、真实消费者、色彩/几何、代码/失败恢复和许可都要有证据。
- **最新收窄（2026-10-09）：先不用测PS RC插件速度，只看质量。**PS＋SXT已经实际处理2代表＋3保留，实际分层保护和Scene已检查；不追加热身、重复模型推理或插件速度排名。已有日志中的偶然时间只为追溯，不当新增速度测评。非PS已完成效率记录保留。
- 用户已自行安装PS并完成SXT许可对话框。新PS实际可编辑且插件实际测通，不能再以旧C盘查看受限或旧付款/激活弹窗阻断。用户把RC CLI装到E盘，不能重复请求整套安装。
- 先前用户授权官方个人月付7天试用、US$34.99/mo无年约、测后立即取消。agent未提交/开通PS订阅；2026-10-09已实际读取当前登录官方Adobe计划页，显示“您没有已付款的计划”，没有列出试用或可取消计划。仅支持当前账号页面状态，不推断其他账号或用户所装软件授权来源。无实际开始的带续费试用可取消；不冒称取消成功。
- 不找/用破解，不伪造地区或账单，不额外购买年约/Stock；不外联、不上传素材在线加工、不全库生产、不改默认注册/budget/产品源码、不提交推送/发布部署/切换分支或新建worktree。测评完成不恢复主Goal，须等明确授权。
- 已登录本机账号和既有授权可使用；密码、激活码、完整邮箱、支付字段、cookie/token不得写入日志/Context/代码/回复。RC随机密码只保留已有DPAPI密文；位置由历史持有，不再抄录明文。
- 回复标注1涉及“PS官方安装及授权、SXT官方试用领取”，最终回复须 `:codex-annotation{index="1"}`，如实说明实际已安装/已测/试用而非再次请求操作。

## 控制来源与历史（仅索引，不重新调度）

完整合同已读：[启动文件](../IMAGE-TOOLS-BENCHMARK-START-2026-10-08.md)、[原问题](../IMAGE-PIPELINE-PROBLEM-2026-10-08.md)。用户最新指令优先。引用Codex聊天已实际read_thread：local/`01a11996-b324-7382-85d5-c29273f4ebd7`；Chrome参考对话已读：https://chatgpt.com/g/g-p-6a58948368b881919bf7b4a9bcdd4571-jin-wan-qu-guan-xing/c/6ac75e1a-cda4-83e9-8a45-512787fadb75 。聊天建议是背景，不是授权或当前事实。

AGENTS批量优先及独立审查适用；项目默认Context及相关owner已读，真实manifest是 `project_context/context.toml`。本轮不改产品Context/主PLAN。旧局部[benchmark](image-tool-benchmark-2026-10-08.md)保留；其原样/Photutils/Siril背景不是五方案比较。

所有旧参数、来源、安装、授权、失败与阶段过程保留：
- [非PS收尾前历史](image-tool-full-comparison-history-2026-10-08-before-nonps-close.md)。
- [本次PS收尾前完整计划快照](image-tool-full-comparison-history-2026-10-09-before-ps-close.md)，包含所有非PS运行索引/时间/完整11项保护命令及PS安装录制过程。
- 上述历史中的“当前/下一步/PS未测/插件未载入/暂停PS”均已作废，只查证据，不能恢复为待办。

非PS阶段Goal此前complete，累计12502秒；本轮独立PS补测Goal工具objective指向本文件，工具不能编辑objective，**最新用户要求和本文件现行范围控制恢复**，不重复非PS推理或另开Goal。

## 当前结果与选择

|责任|实际完成证据|质量/边界|
|---|---|---|
|非PS代表及保留小批|nox/StarNet/Siril/SXT默认、2x、有界overlap；原生SXT三图GPU批|机器/格式合同通过；真实结构误删/亮星残环，未得自动合格成品|
|PS自身|冻结高光选择＋Minimum＋可编辑保护，NGC253/M8代表、NGC5128/M81/M8邻片小批|保留目标结构较多但密星/光晕残留；这条有限配方不能独立完成分星|
|PS＋SXT|当前27.10/插件2.6.9/ML11真实保存动作，2＋3同输入|5份raw与CLI默认完整RGB max0；插件不解决模型结构误删；8px保护恢复目标也恢复前景星|
|可编辑PSD|10份实际PS重开导出；NGC253保护层opacity0→100实际改动42704pixels并还原|composite=final，关闭保护=raw，源PSD未变；独立解析10PSD各层/蒙版/ICC也PASS|
|真实Scene|M8 HiPS original/PS-only/PS-SXT×DPR1/2；NGC253/5128 Prepared wide/detail|当前ICC严格准入r2已真实运行；HiPS只替换2/10片，边缘/星密度断层仍FAIL；非真机/全M8|
|格式/恢复/缓存|当前final代码无改动2代表RGB/ICC往返、经完整键/hash的复用；9条真实CLI拒绝、2条真实PS已有文档/动作冲突拒绝|只有任务文档关闭/任务动作撤除，displayDialogs/active doc恢复；未改用户输入/用户剪贴板|
|独审/收尾|非PS独审完成；PS新边界/Scene/缓存及最终报告/命令/链接全部独审保存|完成；当前无未关闭P1/P2代码/报告问题，成品FAIL/UNVERIFIED仍保留|

**选择：SXT CLI GPU多文件分星作为有条件的批量候选；PS作为可编辑保护/局部修补宿主；nox为MIT备选。StarNet及Siril/StarNet当前包输出用途许可不允许产品软件资产，不能进入产品路径。**这不是无条件生产配方：本次没有自动路线通过全部质量门槛。PS有用，但冻结椭圆并未解决目标结点与前景星分类；SXT插件的输出质量没有比同参数CLI更高。不能把技术PASS、数值保护PASS或运行速度替代成品PASS。

未做逐项手工修补（0次/0秒）；人工review/编排未可靠计时=UNKNOWN。没有合格成品数/小时分母；全部弱结构/科学光度颜色/绝对天文配准/手机原生/星团成品/全M8仍UNVERIFIED。正常成功时同时存在其他非任务dirty文档/非任务动作、插件挂起或外部退出恢复未做原生现场验证；本次拒绝守卫通过不等于全部生命周期通过，具体限度由PS独审持有。强结构误删、残环、边缘/密度断层属于已知FAIL，不能改成未验证。

## 样本、工具与共享责任

[固定manifest](../scripts/image-tool-full-comparison-samples.json)：6429B，sha `10c8c3cd66ec408a2c94ff7d5cbb86faf43c3679c8c9bfe77026cb37764dad62`，原文件未改。原始bytes/hash、metadata、权利、methods、保护椭圆、geometry都由它及receipts持有。
- 代表：NGC253 ESO eso0902c，8285×7510→1024×928；M8真实order6原512² Npix28891。
- 保留：NGC5128 ESO eso1221a，4000×3912→1024×1001；M81/M82 NOIRLab noao-m81m82，8315×4642→1024×572；M8邻片28892。
- 全图处理后才裁ROI诊断，无裁切后推理/重投影。ESO/NOIRLab图CCBY4、Rubin图CCBY4/HiPSODbL1；不带ICC且全不透明Rubin网页PNG显式解释sRGB，不是科学校准。cluster通用去星先拒绝，未做星团成品。

硬件i5-11400F6核12线程、32GiB、RTX3060 12GiB/driver610.60。nox当前CPU，SXT/StarNet当前DirectML；不是等算力算法排行。Python `output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe`3.12.14，[requirements](../scripts/image-tool-benchmark-requirements.txt)；Node `C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe`。Scene可复跑E2E用已装esbuild/sharp/Playwright，网页登录用Chrome插件。

PS `E:/photoshop2026/Adobe Photoshop 2026/Photoshop.exe`27.10.0，COM注册/真实调用一致；RC `E:/RC-Astro-Photoshop/RC-Astro.8bf`2.6.9，DirectML DLL验签/绑定；ML11 ONNX `C:/Users/777/AppData/Roaming/RC-Astro/StarXTerminator.11.onnx`66478084B、sha d15b0ea04e7b41d179b68316511a5bd08d2faaa459789baf3379d9a678076821。CLI `E:/CLI/rc-astro.exe`2.6.9build727ga2033f5b。工具hash不人工重复维护，由[PS recipe](../scripts/image-tool-photoshop-recipes.json)/manifest/receipt统一持有。

- [tool runner](../scripts/benchmark-image-tools.py)：政策、normalization、streaming binding、guard_mask、推理/native/ICC/有界重试；13条已有回归。
- [protection replay](../scripts/benchmark-image-protection.py)：已测结果11项回拷，无模型；7条已有实际CLI拒绝。
- [PS driver](../scripts/benchmark-image-photoshop.py)＋[host](../scripts/benchmark-image-photoshop-host.ps1)＋[JSX](../scripts/benchmark-image-photoshop.jsx)：1–5输入全准入后stage，pinned app/plugin/model/action及配方；真正PS DOM/Action，raw/final/PSD；fresh exclusive输出，失败保留，完整identity/hash才复用，不关闭预先打开文档，不占剪贴板。
- [PS边界检查](../scripts/test-image-photoshop.py)：9条实际CLI拒绝，不跑插件；native dirty doc/action冲突另有真实COM证据。
- [Scene runner](../scripts/benchmark-image-scene.mjs)：复用真实产品消费者，仅任务适配PS准入及严格finalICC，StarNet派生在像素加载前拒绝。

PS-only配方：ColorRange Highlights fuzziness40/min170/max255，expand1px/feather1px，Minimum radius1px，RGB component channels；保留可编辑高光alpha。PS-SXT动作ML11/default overlap0.2；原source椭圆保护Gaussian8px，M8没有合格云蒙版。PSD保留Original/Processed/可选Original protection(layer mask)。removed-diagnostic只是clipped RGB source-raw，不是SXT原生unscreen star层/科学线性重建。导出vendor raw保留，final受控嵌入原绑定sRGB ICC并重读验证RGB没变；M8原生PS ICC字节被重写不能冒称raw字节保持。

## 实测证据索引

根 `output/image-tool-full-comparison-2026-10-08/`（下称full），Scene根 `output/image-tool-benchmark-2026-10-08/`。**result/receipt持有具体路径、hash、参数和过程，目录存在不是成功。**

非PS完整数据/运行/时间/失败/命令：[非PS阶段报告](image-tool-nonps-results-2026-10-08.md)和[独审](image-tool-nonps-independent-review-2026-10-09.md)，不改写历史PS未测状态为本轮结果。关键full索引：representative-review-r1、nox-upsample-review-r1、validation-batch-r1、paired-siril-comparison-r1、sxt-representative-r1、sxt-overlap-representative-r1、sxt-upsample-representative-r1、sxt-validation-batch-r1、sxt-upsample-validation-r1、sxt-native-validation-r3、sxt-structure-roi-comparison-r1、protection-replay-r1/result.json。native3图工具7.616s/staging0.224s，与逐张工具17.227s是同工具边界，不能与24.932s完整逐张流程混排。13＋7回归PASS，旧失败保留，当前StarNet许可第5节禁止软件资产/fixtures/reference，即便改图/非商业也在范围内。

PS本轮：
- `ps-sxt-action-r1/SkyBenchmarkSXT-20261009-r1.atn`227B、sha e4ddb0eacdf5bfc2faf4e7fa8df93e40e65c227e9dc19665a2add054b44719ef，真实保存1个SXT步骤；`ps-sxt-action-replay-r1/result.json`在last-filter已改GaussianBlur后仍重放SXT成功。旧UUID裸descriptor失败不能推断UUID失效，因为新动作同UUID；支持的是app.doAction的保存动作。
- `ps-only-representative-r3/result.json`2代表、`ps-only-validation-r1/result.json`3保留；`ps-sxt-quality-representative-r1/result.json`2代表、`ps-sxt-quality-validation-r1/result.json`3保留。全部实际PS处理、raw/final/PSD/receipt；技术COMPLETED_NOT_QUALITY_ACCEPTANCE，ordinaryAdoption=false。
- `ps-quality-diagnostics-r1/result.json`及NGC5128两个ROI/M81ROI：5插件raw=CLI默认RGBmax0；细丝/红结点raw被误删、保护恢复也恢复恒星；亮星PS缩芯但halo残留、SXT留黄色弧。
- `ps-native-psd-audit-r1/native-result.json`、`pixel-readback.json`10PSD实际重开，复合图RGBmax0，opacity0→100真实改变42704pixels、还原max0、sourcePSDhash全不变。
- `ps-only-no-clipboard-r2/result.json`当前channel.duplicate保护导入实际2代表，RGB/ICC=旧同配方，独审各PSD通道/层/蒙版均PASS。随后JSX只加errorStage诊断，旧运行绑定旧代码代次，当前没有copy/paste。
- `ps-roundtrip-final-r1/result.json`当前最终driver2代表实际RGBmax0、finalICC=bound original；`ps-roundtrip-verified-reuse-r1/result.json`完整键/所有output hash核验，freshPhotoshopExecution=false，无PS调用。
- `ps-admission-tests-r2.txt`9CLI检查PASS，实际拒绝证据 `ps-admission-be3459d287bf/`，新非法输入不stage、已有run hash不变；`ps-native-admission-r1/result.json`实际dirty文档拒绝保留内容/history/active/doc/dialog；已载入同名动作拒绝且保留动作，0新导出，最后只清理测试所创对象。`pixel-readback.json`实际dirty-before/after全RGB/ICC相等，sentinel确有修改、sourcehash不变；当前roundtrip/cache输出绑定已读回。
- `scene-ps-quality-input-r1.json`绑定4组PS成功源run；Scene `scene-ps-hips-quality-r2/`6处理/原图主帧＋catalogoff，两DPR原始RGBA=冻结baseline、2/10tile替换、10draw/目录2/8404/GL0/资源0；`scene-ps-prepared-quality-r2/`8PS主帧＋4off，共12。r2在当前严格ICC准入下实跑；root及reviewer已看r1真实图，独审`closing-readback.json`确认全部18主/Prepared帧全RGBA=r1、HiPS205/parsed109/Prepared110绑定匹配current runner。当前任务runner变更不改产品源。
- `ps-independent-audit-r1/`独立PSD解析/108bindings/5raw=CLI/whole/ROI/Scene读回、no-clipboard32bindings及`closing-readback.json`新native/cache/Scene r2；[PS独审](image-tool-ps-independent-review-2026-10-09.md)全部完成保存。主帧/Prepared18＋catalog-off1共19帧全RGBA=r1。`report-links-readback.json`核28报告本地链接、3绝对图片、18命令路径及当时18计划链接；本计划随后仅状态收口，不冒称仍等于该次hash。reviewer已结束，已调用interrupt且不再复用。
- 官方Adobe计划页当前观察已保存 `adobe-plan-readback-2026-10-09.json`，仅无计划公共字段，不保存邮箱/个人/支付内容。

保留失败：ps-native-roundtrip-r3原生成功后driver错误encoding“utf8-sig”FAILED（已修utf-8-sig）；ps-only代表r1 selection histogram受selection限制误拒绝；r2 Minimum误作用alpha使全RGB无变化，实际no-pixel-effect检查拒绝（已显式选RGB channels修复）；no-clipboard-r1 channel.rename activeDoc错导致API8100（r2修复成功）；边界tests-r1唯一FAIL是测试期待错误名，实际损坏缓存已拒绝（修断言后r2 PASS）。旧录制COM不入动作0步骤/裸UUID失败留存，不冒称成功。没有清理原始/旧失败/历史基准。

## 完成记录与停止规则

1. **完成**：native dirty-before/after全RGB读回及source不变、当前final roundtrip/reuse读回；Scene r2输入/帧/current code代次核验，无新SXT推理。
2. **完成**：最终五方案报告 `image-tool-final-results-2026-10-09.md`已保存，含明确条件选择/质量FAIL、实际PS配方/可编辑证据、无PS插件速度排行、完整可复跑命令和非PS效率索引。
3. **完成**：新独立reviewer `/root/ps_quality_completion_review`已核最终report/链接/命令/代码/实际新边界并保存独审，无未关闭P1/P2；reviewer已结束，已调用interrupt，不复用。
4. **完成**：本文件已按当前交付状态收口，独立测评Goal可以complete并报告。测评到此停下，**主云观星Goal保持暂停**。任何后续改配方/手工修补生产/主目标恢复须用户明确授权。

复跑命令以最终报告/非PS报告为权威说明，每次新小写run，不覆写。当前代码epoch改变时旧产物仍可审，但cache拒绝旧key，不伪称当前script已在历史run用过。任何新源/metadata/参数/工具/model/权利变化先重验质量，不将本轮未通过配方偷偷设为生产默认。
