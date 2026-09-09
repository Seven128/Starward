# 第三轮审查修订（2026-09-09）

范围仍为 Context 与待审候选，不改生产、ADOPTED 或部署。延续 design-resource 技能；不重跑旧 build 脚本。前两轮细节见 INDEX / FEEDBACK-02 / PROGRESS。

用户四项要求全部执行：
1. 驾车范围不再使用笨重的蓝框三层卡片；保留时间/路线公里切换、独立参数、确认取消。
2. 我的「进行中」和结束时间中心对齐；浅雾灰绿，小幅增加内边距，保留玻璃卡/SUV/已修正三圆点。
3. 云观星点选天体应打开居中的暗色介绍弹窗，不用底部抽屉；补全大量星体的身份、点选、按需资料、缓存、无资料和失败边界。当前生产 canvas/target rows 没有完整介绍能力；当前候选只少量 targets。不得将新描述称为已实现。缩放真实深空影像仍沿第二轮研究，不能声称已有。
4. 无顶部图片的观星点信息组件在大档也保留两个上圆角；圆角外地图像素不能关闭大档面板。保留小档下拖硬止点、上拖中档、中档文档滚动，以及准备完成后替换 iframe 防闪烁。

截图路径：C:/Users/777/AppData/Local/Temp/codex-clipboard-{a64d9361-196c-46ba-8598-3667ee95dd5c,29977b79-513e-4ccf-8986-0c33a497aeab,a8928508-a523-41da-9561-63881fa8c4e4}.png。

Stitch 已完成并导出原始 srcdoc 至各候选 stitch-feedback-03/index.html：
- Search 项目 5585184579244766246，输出 98442abefddc40eabdcf3c590b9f6024。两行轻量控制。
- My 项目 11944978164995734673，输出 e9db9aabb64f41908354d73cc272d34f。中心对齐、略增内距。
- Sky 项目 13823253487989500123，输出 7747b7b6e8e740a9b7ee815ade7f7d10。中央石墨暗色弹窗；原稿自行增加的视星等/依巴谷来源没有被资料链证明，不直接继承。

当前进度：原稿已存。待完成本地候选整合、Context、视觉与交互验证、审查页记录。

技术入口：apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx（绘制与标签/目标列表）；packages/miniapp-contracts/src/types.ts（SkyTarget/SkySceneCatalogEntry/sourceId/string 与 catalogIndex）；project_context/architecture/runtime-and-domain.md；spot-and-sky.md / surfaces-and-controls.md。

研究来源：[SIMBAD](https://simbad.cds.unistra.fr/simbad/)、[identifier query](https://simbad.cds.unistra.fr/Pages/guide/sim-fid.htx)、[data scope](https://simbad.cds.unistra.fr/Pages/guide/ch02.htx)。适合作为太阳系外天体基础资料/交叉标识候选，不能推定中文介绍、全星表覆盖、客户端直连许可或部署可达性。

本地候选与 Context 已修改，四宽度/新增交互检查通过。织女星介绍为 NASA Night Sky Network 页面简短转述，非自动全星表百科。完整验证与交付以 PROGRESS 最新记录为准。
