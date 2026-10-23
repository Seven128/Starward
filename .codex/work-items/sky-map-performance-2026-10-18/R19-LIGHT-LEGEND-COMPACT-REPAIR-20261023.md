# LIGHT 五档图例紧凑排版修复

2026-10-23。沿同一R19采用范围，修复[实际UI独审](R19-ADOPTED-UI-CAPTURE-REVIEW-20261023.md)确认的P2：普通gen14的夜光图例五项重复年度属性和单位，逐项换行拉高面板。Root已实看Map/My/Cloud/LIGHT四组参考与原手机输出。**最终DAY-only源码、15相关检查/typecheck0、完整正常WEAPP编译与[新独审](R19-LIGHT-LEGEND-DAY-FINAL-REVIEW-20261023.md)均通过；[普通gen15已自动送达/实看](R19-GEN15-LIGHT-COMPACT-PHONE-20261023.md)，两行完整五档与来源/关闭返回获[独立实看](R19-GEN15-LIGHT-COMPACT-PHONE-REVIEW-20261023.md)，本限定P2已闭合。** 其余UI与Goal未通过；手机最新所有权及原生双指后置时机只见HANDOFF。

## 变更与语义

原Map图例owner新增窄展示投影 `map-layer-legend.ts`。仅DAY模式下、LIGHT固定栅格的method/style/unit、五项数量，以及每项按序label/color/完整range全部匹配当前共享policy时，把共同“年度夜光 · nW/cm²/sr”展示一次。Map复用原有唯一mode，NIGHT/OBSERVATION保留原完整五条。五个短标签配原阈值，颜色及数值均来自原policy；不缩字、不删档、不改变边界包含关系，不把图例变成Bortle/SQM或现场天空实测。

未知版本或任一内容差异保完整原词和单位，不盲切字符串；历史无raster相对夜光与云量保持原展示规则。原LIGHT五项/其他四项上限继续由原消费者约束。年度年份、时间不变说明、EOG署名、PARTIAL缺测说明、来源页及native acknowledged数据责任均未改变。

Map仅增加导入、对当前 `displayedLayer` 的投影和原图例渲染接线；SCSS只新增共同标题，字号12Px/行高20Px/上距4Px。采用源的原图例gap12、flex-wrap、色点及其他布局保留。共享科学policy、后端和数据锁未改。

## 已执行检查与输出

三个相关检查文件共 **14/14通过**，覆盖完整五档/单位、未知和旧数据回退、实际Map图层/返回/异步已呈现责任；正式小程序typecheck exit0。首轮测试fixture误断言不完整MapLayerData，产生三个TS2352，随后将展示输入明确收窄为实际消费字段的Pick，去掉断言；没有as unknown、运行时validator放宽或skip。修后相关检查及正式类型均通过，没有重跑无关全量。

首轮已有isolated-check机制完整构建到 `apps/wechat-miniapp/dist/weapp-check-r19-light-legend-20261023`，目标原先不存在。webpack exit0，29.297秒、10项既有顺序/size提示；该check使用loopback8798的API/resource，只验证本机编译，不是最终DAY包、手机准入或release。该历史check完整身份：

| 项目 | 实际结果 |
| --- | --- |
| bundle | `ed16d3cf9b3ecc2daf480298b0a22bc90eb9743f6894fd08e84b8e868398b8fd` |
| 件数/字节 | 345 / 5,023,791 B；maps0 |
| main | 2,035,428 B；距2MiB余61,724 B |
| content / spot / sky | 1,041,539 / 612,072 / 1,334,752 B |
| 预算/production guard | 全部通过 |
| 编译地址owner | 用实际bundle的纯地址owner核8798 API/resource和无预览凭证，全部角色通过 |
| CSS/消费 | 编译JS已使用新heading/items，实际Map WXSS保留12Px/20Px/4Px及原gap/wrap |
| 双读回 | 两次完整文件/字节/SHA列表相同 |

[独立审查](R19-LIGHT-LEGEND-COMPACT-REVIEW-20261023.md)无新增P1/P2，并沿当前服务/proof的严格准入链确认投影可达。它另读当前r6目录首个inventory声明proof，核真实hash/policy/method/style/unit并送入生产投影，五项全部保留；不冒live HTTP或手机验收。

## 原件、首错和版本边界

私有owner：`r19-ui-20261022/light-legend-compact-repair-20261023`。修改前5件/652,243 B包含原Map/SCSS、两个科学policy文件与冻结gen32 manifest；修改后4份生产/检查源码逐件复制及hash读回，构建log、完整 `build-manifest.private.json` 与有限检查脚本同处。首轮未加DAY门的Map SHA `49ad22a7e45d7995db9505907ea9300d4a2963bd17267c730a7b70dbb4a77219`、投影 `8f295e26cc6cfdc3b87bda0ee54b724fc41c171b1d5b537e233d6c4bba615830`保作历史，最终身份见after-final及下文。

构建后首个本地inspection脚本误按小写px检实际保留的Px，已保 `inspect-attempt-1.mjs`；直接读实际WXSS后修正单位大小写比较。第二次又把prepared项目根误作bundle根，哈希95157…不能与原包指纹比较；已保 `inspect-attempt-2.mjs`，沿真实project.config解析后改为gen14 `project/dist/weapp`、gen32 `project/weapp`。另一次只读PowerShell foreach管道语法错误在执行前失败。三项均没有修改产品或旧输出；最终对正确根的完整指纹再次核得原gen14 `0f76b93f…`/345/5,021,505 B、原gen32 `3bb55a21…`/344/5,126,615 B，两个policy和gen32 manifest也与修前相同。错误比较不被用作文件已变或保护通过证据。

**冻结gen32属于本次LIGHT合修前的UI源码。** 原目录名/current-ui标志保留其冻结身份，不能据此称它包含本补丁；不修改或重建已冻结代。后续R27必要目标窗口前核当时源码差异与观察适用性，保持原样本/协议及优先级，不因局部UI修复重开工具资格或复制压力轮次。

## 尚待目标结果

最终按采用说明补DAY门后15项通过；首次范围修改误增已有mode，TS2451和一次独立day-check build失败原件/log均已保留，随后删除重复并复用原owner，正式typecheck exit0才正常build。最终正常包为 `63893429b0f47be8284a944d08a34f9230ffa4b87315de1d361ff361a25087d3`/345/5,023,790 B，main2,035,427 B；webpack28.210秒、10既有warnings，budget/guard/compiled地址与双读回均过。`normal-final-manifest.private.json`、`normal-final-build.log`、`after-final.private.json`保最终字节；Map源3f480ba6…、投影ee5b7487…。首个ed16…check及scope失败输出各自保留，未覆盖或冒最新包。

用户随后再次要求严格按已采用UI继续。Root已说明先完成必要UI推送/实看，再重备地图等原生双指时机；这不是用户已可双指的答复。普通gen15真实自动推送、先实看再bind及4次必要USB输入已经取得两行五档/来源/关闭返回，本P2由Root及独立目标复核闭合；不再将该局部记为待手机。完整天文/九格气象仍在同普通包继续；其他UI输入依赖、叠层正确覆盖/性能/内存、Sky六字段/Play和完整Goal全部保留。

临时已采用资源读回仍只用于本次比较，源长期仍在Stitch；未重新选择、生成、上传或删除远端，不误删仍有依赖的旧路径。全部dirty、原Harness/冻结/私有原件保留，PLAN未改，无账号/N05/R6/数据库/服务/VPN操作，无提交或外传。
