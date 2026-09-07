# Stitch试验接续

用户于本轮恢复工作，只做限定Stitch试验，不重启整个设计项目。brief.md包含偏好来源和范围；prompt-initial.txt为实际拟提交提示词；inputs/三张必要参考原字节拷贝，SHA和用途在run.json。

必须在两个真实初稿与旧图并排展示后等待用户一句反馈，不擅自继续修订。最大2首稿＋1选中修订＋明显有价值时1张我的。既有独立评分、旧版失败与局部认可都保持历史，不转成整体采用。不要调用旧summarize/finalize脚本覆盖本次记录。

当前停在网页参考图上传：prompt-initial.txt已预填，生成次数0；SUBMIT.md给出人工备用步骤。Stitch当前Balanced底层模型未知；今日额度读取0/400。尚未有Stitch产出，不可进入审美去留结论，也未请求用户设计偏好。

用户明确要求由Agent继续操作，已通过浏览器PNG图片粘贴成功上传3张参考，prompt-submitted.txt实际提交一次生成（要求两张），不再等待用户上传。run.json为最新状态。扩展设置页被URL策略阻止，未绕过访问；使用普通图片粘贴无需更改扩展权限。

## 当前停止点：用户首稿选择
技术重试已成功，官方项目587088532668047776。已取得两个初稿的原HTML/PNG/ZIP，全部保存outputs；对比页http://127.0.0.1:4277/stitch/index.html按390×844显示原HTML。生成请求2次（含首次失败），有效首稿2，视觉修订0，延伸0，用户操作0。初步实物问题见initial-review.md和outputs/render-inspection.json。不得擅自修稿：先等用户一句话选方向及最主要问题。未发起新的goal或整套Skill重写。

## 最新状态：用户选中 B，默认生成路线已改为 Stitch

2026-09-07 用户明确选择 Stitch B · 连贯底抽屉，并要求 Skill 改用 Stitch。完整原话、边界及结论见 user-decision.md；run.json 已更新。旧等待首稿选择和未采用描述仅为历史。活跃 Skill 入口为 ../../../../../.agents/skills/starward-design-resource/SKILL.md，Stitch 细则见其 references/stitch-route.md。Codex 继承调用模型/档位，Stitch 模型单记。本轮无新生成，未请求具体修稿、未延伸我的、未改 DESIGN.md 或生产；现存初稿及冻结资料不覆盖。后续延续 B，不重新抽卡。
