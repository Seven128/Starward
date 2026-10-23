# R27 gen32 实际预览拒包与终态恢复

## Candidate identity

冻结gen32仍为source `3808382a6b7fc8dee945b1bfe42e563fa6793182d80dd6a99253c58f4aa88c3c`、bundle `3bb55a21a8845b9367d0445113620be94cea95f42bc930070806d0014d7c3aa6` /344件/5,126,615 B，未重建或修改。新feedback `starward-device-feedback-oqGaEc`、prepared `generation-000001-TUe7SW/project` 是该冻结包的稳定副本，feedback代1不是新的buildGeneration。未bind诊断session，没有R27目标运行身份。

## Invocation result

原Stable一次 `start --delivery auto` 于UTC04:20:43.985→04:21:31.503结束，exit1。原诊断 `.official-process-2b20f997-12f3-4635-9ede-e022a8307e97.json` 完整保留2246B stdout+stderr、未截断。实际业务outer `ok:false / MCP_TOOL_ERROR / source:mcp_business / code:10 / tool:auto_preview`，inner `rawResult.success:false / code:10` 明确 **main package source size 2081KB exceed max limit 2048KB**。原包装层记录error/unknown/null taskId，不是已送达或待用户扫码。

Root沿原owner原件保护和[本次独立终态/包图归因](R27-ACTUAL-PACKAGING-BOUNDARY-20261023.md)，在 `withFeedbackRun` 锁内严格比对generation、bundle、全部official前态、原feedback/诊断/解码stdout/独审SHA及 `assertGenerationCurrent` 后，追加一次task-local forensic resolution，仅将disposition记failed、boundary为main_package_source_limit。保留原 `result.status:unknown / success:null / taskId:null`、原诊断和originalOfficial；没有放宽公共parser/防重放守卫或制造新API回执。

私有 `r27-packaging-recovery-20261023/gen32-failed-preview-terminal-resolution.private.json` SHA `22b7bf58f3632c8109b332b4d3675ee43bf1a94898edda969220eabe6de40a22`。此处是同调用真实保留的业务失败，不能泛用到别的unknown/timeout；不授权绑定或同包重发。

## Observed product behavior

Root随后仅公共USB只读capture普通B6W0lu：`2c9bc447-91bf-4425-9f37-d89d4b730bef`（UTC04:26:36.871）已实际查看，仍为原完整Map、terrain/LIGHT、同地标/工具，没有可见R27 marker。没有发送任何手机输入或切换/重新绑定，不能凭画面证明手机完整字节/runtime AppID，但也没有以失败的auto_preview当新包实际运行。

3件手机原件与只读观察记录已复制/hash读回，私有 `r27-packaging-recovery-20261023/phone-after-failed-preview.private.json` SHA `55c249e6be4f1fb949c17097b7388cde365327110958dcc02372b9601127266e`。此前普通gen16整个feedback383件/22,584,876 B已先保全，manifest `45de8d9cd49875d0d95bf27789c0e677e2cbb7f7e18f0019d56e71cc29a0c8b3`，本次新capture作为后续独立增量保留。

## Verified

失败feedback全部 **347件/5,132,974 B** 在终态metadata写入前另存并逐件读回；manifest `8a47d4360c05e83021e0046c5cb2cadfaef241faae59475647aa8169a1101ad9`。原gen32及private frozen originals继续有效。

静态main2,073,782 B/余23,370 B仍准确描述本地文件统计，实际微信拒包已否定“可推送”准入；没有改大预算。独审实际common.js.map确认共享Query hook反向依赖Sky adapter，将8个R25–R27任务模块带入主包；26,521 B映射区间不是可以直接扣除的官方收益。

## Unverified

没有新baseline、active-5、metrics、Pause、drain或end；真实R27 WeakRef/Query关联、非空BSC/loaded SAO及OOM根仍未验证。官方2081KB与本地字节统计的转换/额外成本未知；仅迁移观察器不能保证新包准入。UI/叠层/人类双指和完整Goal缺口不变。

## Invalidated

gen32的原语义/源码适用性独审仍有效，但原“构建就绪”不能当实际平台可送达。该包本次实际失败，不重试其二维码/自动推送、不bind，也不在冻结树缩减代码。它不构成微信网络/VPN或手机连接失败证据。

## Cleanup

无预览、输入、录像、Play或watcher在途；诊断feedback和失败原件保留待同owner后续精确退休。当前唯一工作为新的 `r27_sky_package_recovery_impl`：在新的未来gen33有限恢复路由修正任务依赖方向，并不注入这次Sky问题不需要的Map任务钩子，完整保留生产/UI/星/样本及15/20/90语义。尚未prepare/build/发送gen33；不修改任何旧冻结代。

bridge56520继续运行、原19数据保留；账号/N05/R6/VPN、PLAN与当前生产源未动。无部署、提交、推送或数据上传。
