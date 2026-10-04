# 共享来源可读性修复与 v26 原生观察

Goal active、无预算、未完成。上一 Goal turn 属于 progress：完成授权的单窗口恢复、一次独立审查、两项共享修复及组合证据与方案更新。本次按同一方案继续，没有恢复手机、外部预览/上传、部署或 Git 提交/推送。

## 确定差距与共享修复

实际 v25 月球来源页的 USGS/Clementine 长署名及网址横向裁切：[本次修前原图](experience-v25-native-source-wrap-before-current-2026-09-29.png)。原生 WXML 确认 SourceAttribution 按钮是三段直接文本，没有受限宽度的子 Text；按钮344.8000×53.6000逻辑像素。能读完整字段不证明用户能看全。

仅修改共享 SourceAttribution 的 TSX/SCSS，将完整名称、分隔符、原始网址放入独立 Text，在按钮剩余宽度自然换行、左对齐。复用原 SoftButton、归因去重、URL校验、复制与状态反馈；不缩字号、不改声明或网址、不为月球另建组件。Provenance、天气/预警、Map、搜索及计划沿同一 owner 生效，Map动作栏预留保持；全部消费者组合不由此认证。

## 固定候选与实际效果

[v26冻结绑定](experience-combined-clean-v26-candidate-2026-09-29.json)：SHA510d269337407b659cd764d7bdcbbb6e1479872e83e3a54bfa99ad10ef485421、257文件/4,485,078 rawB；main2,089,891/content1,012,055/sky959,515/spot423,617B。较v25 raw/main+353B，其余分包不变；不是官方上传包体或性能。91继承源码与九份原Sky测试未改，本次含共享owner/消费者共99源码绑定；v25/v24原指纹保持。无诊断、夹具、代次、vConsole/maps，接口仅本机8791。

关闭v25后只开v26，winId s3、主窗口PID25916、标题Starward-Sky-Combined-Clean-V26-0929。从公开Map搜索示例点→云观星→手动，新Context为2026-09-29/21:00/revision1；不声称继承v25的21:30/revision2，旧Context/证据保原条件。

- 公开搜索月球→资料→来源，实际完整署名、网址末尾global_mosaic_118m、加工说明、许可及缺测解释已看：[滚动后的原图](experience-v26-native-source-wrap-after-scrolled-2026-09-29.png)。按钮同宽344.8000、高93.6000，Text宽323.2000、高80、字号14px，未缩字号。修前原图488×1057、修后479×1035，捕获缩放不同，不做跨代像素质量等同。
- 公开点击复制，Clipboard仅比较预期公开USGS URL，结果true；页面显示“来源链接已复制，可在浏览器中查看。”没有记录其它剪贴板内容或声称打开网页。
- 公开Back保同一45°/21:00/revision1天空与月球选择；ContextId SHA288b2b66e46a0f753062cda41d587626417b21eb8edbca7b67e5f18555a940a1、fingerprint d2b0a20b22f8bc92dfc1191d75a9f2d0d78c0f0356f08752a5bc7e4b4f19b34d保持。关闭月球信息后最后为手动45°、4039亮星/3目标，无跟踪/弹层。缺v26来源回程前的星场截图，不编造0像素差；v25对应证据保原范围。

既有原文/复制、来源route部分失败/非法出版绑定四项行为检查通过；正确入口Mini类型检查和一次production构建exit0，三个原警告保留。首次run-node把tsc当包名的解析错误保原日志，随后使用项目真实TypeScript入口完成，不计为代码类型错误。低风险布局没有新增镜像CSS测试，效果用实际原生输出证明。

## 合成核查及剩余边界

SDK普通控件的显隐、z-index、布局和操作正常；v26星空截图仍缺普通控件/名称/弹层合成，[回程原图](experience-v26-native-source-back-current-sky-2026-09-29.png)，Map/独立来源页可显示普通UI。有界检查安装包官方完整项目绑定及BrowserWindow截图/冻结/模拟器准备恢复路径，没有证实生产CSS缺陷或截图缺层原因。官方Canvas文档端点不可读，社区搜索不作平台事实/选型依据。不扩大层级、不迁移全部cover-view或另建渲染器；此缺口保持未验，不重复同样研究充验收。

初次新窗口等Map selector失败后没有重开，实际currentPage/原图确认Map再走公开入口。月球身份守卫误用SOLAR:MOON字串，实际“月球 · SOLAR MOON”；旧按钮直接子Text查询失败揭示其直接文本，均保工具/脚本边界。详[事件](experience-composition-sources-native-2026-09-29.jsonl)。

服务未替换：8791转公开controller54424及原8789内存Context，信息模块SHA3ae1fcda98d31ec91469e7c2e92aa1d8d314b8e4203dadb24359c5483ce67cd9；context/resource pass、PUT1、held/active0，共享8787/8788未动。原33项义务、商业范围及完整理由保留。手机/姿态/校准/后台、完整合成与模式/大字/消费者组合、整体源质量/覆盖、资源峰值/首屏/官方包体/费用及最终必要审查仍开放。唯一下一依赖见PLAN，继续模式/图层/加载故障/可读性与B3/C实际差距；不重做月面下载/已闭合研究，不以旧手机验收新版。

[收尾核验](experience-source-wrap-validation-2026-09-29.json)重算v26/v25/v24包指纹、99源码及本次/保留测试绑定，核四张原PNG、实际复制和来源回程、当前文档/33项义务与相关Git diff检查。Context校验只证明声明/路径；Goal工具仍为active、无预算。
