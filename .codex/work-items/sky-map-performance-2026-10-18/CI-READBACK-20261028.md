# 当前提交 CI 的实际执行范围

2026-10-28按唯一PLAN P6只读复核，绑定提交 `1fd25800fb624d39fd98248f1aa3ac1da33c7de2`、仓库 `Seven128/Starward`。本轮通过已连接GitHub工具读取固定HEAD的run集合、原8个run的latest-attempt jobs及Product分类步骤的已有日志；没有fetch、提交、推送、重跑workflow、部署、SSH、容器操作或Secret/variable修改。本机dirty源码没有上传，这些CI结果不覆盖当前工作树。

GitHub REST集合按 `head_sha` 过滤、`per_page=100`，返回 `total_count=8` 且实际8项；8项均为main、上述完整HEAD、attempt 1、completed。专用jobs工具返回9个job，与该提交的四份workflow定义相符。工具外层文本仅为 `Action completed.`；下表依据 `structuredContent.jobs` 及结构化REST正文，不把外层成功当作CI通过。诊断内容复用已保存的[STAGING-READONLY](STAGING-READONLY-20261028.md)，本轮不重复访问远端主机或扩大诊断预算。

## Run、job与实际步骤

| Run（创建时间为北京时间） | 实际job | 观察结果与适用范围 |
| --- | --- | --- |
| [Product CI 40508961666](https://github.com/Seven128/Starward/actions/runs/40508961666)，10-27 21:05:06，push | `product` / `122205499150` / success | checkout、Node设置和 `tools/ci/affected-checks.mjs` 实际success。原日志2026-10-27T13:05:25.6683590Z输出 `{"product":false,"context":true,"consumers":false}`。下列16个产品步骤全部skipped，不能解释为产品测试、WEAPP构建或OCI通过。 |
| [Context structure 40508961638](https://github.com/Seven128/Starward/actions/runs/40508961638)，10-27 21:05:06，push | `context` / `122205498010` / success | 分类后实际执行锁定Context workspace安装、`npm run context:validate`，以及 `node --test tools/run-node.test.mjs tools/ci/*.test.mjs tools/miniapp/project-skills.test.mjs tools/miniapp/workflow-conformance.test.mjs`；三项均success。这是该提交Context结构和相关工具行为证据，非完整产品正确性。 |
| [Backend staging release 40509024612](https://github.com/Seven128/Starward/actions/runs/40509024612)，10-27 21:05:32，workflow_run | `qualify` / `122205707338` / success；`publish-and-deploy` / `122205748329` / skipped | 资格判断脚本实际执行；发布部署job未执行、无步骤列表。该提交workflow要求前序Product的 `Construct production OCI image` 步骤实际success才能资格化自动部署；此次该步骤skipped。不能从workflow外层success推已发布镜像、已部署或服务已健康。 |
| [Backend bounded diagnostics 40604451833](https://github.com/Seven128/Starward/actions/runs/40604451833)，10-28 07:46:58，workflow_dispatch | `inspect` / `122540355998` / success | `Run selected bounded check using existing Environment credentials` 实际success；既有模式为host-storage。只证明该次有界汇总成功，不证明磁盘符合部署前置条件或任何清理可执行。 |
| [Backend bounded diagnostics 40604671659](https://github.com/Seven128/Starward/actions/runs/40604671659)，10-28 07:48:55，workflow_dispatch | `inspect` / `122541081001` / failure | 上述selected-check步骤实际failure；既有host模式失败为 `host_preflight_disk_below_10_gib`。 |
| [Backend bounded diagnostics 40604777288](https://github.com/Seven128/Starward/actions/runs/40604777288)，10-28 07:49:53，workflow_dispatch | `inspect` / `122541439154` / failure | selected-check实际failure；既有runtime模式为 `runtime_diagnostic_container_ambiguous`，其原因按下方独立identity解释，不推测多个运行容器。 |
| [Backend bounded diagnostics 40604933393](https://github.com/Seven128/Starward/actions/runs/40604933393)，10-28 07:51:16，workflow_dispatch | `inspect` / `122541959244` / failure | selected-check实际failure；既有identity结果是一个匹配API、零running、状态exited，观察成立不等于健康判定通过。 |
| [Backend bounded diagnostics 40605206089](https://github.com/Seven128/Starward/actions/runs/40605206089)，10-28 07:53:47，workflow_dispatch | `inspect` / `122542878824` / failure | selected-check实际failure；既有release-reference中历史成功指针链可读，但失败回执集合为 `UNKNOWN/budget_exceeded`，完整引用未核定。 |

五个diagnostic job均已执行checkout和Node设置；四个失败job的selected-check失败后，Node post步骤skipped、checkout post和Complete job仍success。这些收尾成功不改变job失败结论。

## Product中确实跳过的16步

以下原步骤5–20均为 `status=completed, conclusion=skipped`：

1. Restore LFS object cache
2. Prepare current resource versions
3. Install locked dependencies
4. Verify commit-bound public backend data
5. Audit Mini Program API production dependencies
6. Test resource preparation
7. Test deployment owners
8. Validate release transport shell
9. Check release code
10. Check native App API and admin consumers
11. Build backend release packages
12. Test WEAPP release bundle owner
13. Build nondeployable WEAPP CI bundle
14. Inspect built WEAPP candidate
15. Run isolated infrastructure checks
16. Construct production OCI image

实际跳过与该提交 `product-ci.yml` / `tools/ci/affected-checks.mjs` 的分类合同一致，且这两个路径本轮读取时无工作树修改。没有为得到绿灯重跑、放宽检查或改分类器；本记录也不将未执行项标为通过。

## 仍未建立的结果

本轮完成了这8次已知run的执行/跳过核对，未产生新的产品测试或部署证据。当前dirty候选的CI、正式云量/光害供给与OSS/CDN、目标端结果及完整Goal仍各归其原owner。staging原磁盘不足、停止API与引用集合不完整保持失败/未知：9.64GiB可用低于既有10GiB前置条件；历史成功指针revision与exited容器revision不同；不能据此选择镜像恢复、清理或宣布已部署。详细边界和受限读回位置沿STAGING-READONLY，不复制连接信息、秘密或原始日志。
