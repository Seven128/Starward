# 观星计划关联事件修订 · 2026-09-13

[完整计划编辑与单选](../revisions/three-requirements-2026-09-13/preview/index.html?view=edit&id=p1) · [统一审阅](../../shared/astronomical-event-modal/review.html)

本次局部需求替换计划内独立事件列表/详情导航及多选关联：编辑入口打开共享大modal，卡片主体进入同壳详情、右侧圆形radio独立单选；确认回填计划草稿，保存计划才持久化，关闭取消本轮临时选择。地点、时段、出发和未保存备注均保留。只读计划中的事件打开browse，改选属于编辑操作。旧多关联记录不得因编辑别的字段静默丢失，迁移要求由技术owner维护。

设计资源直接消费[共享Modal模块](../../shared/astronomical-event-modal/modal.mjs)与[共享样式](../../shared/astronomical-event-modal/modal.css)，没有第二份单选弹窗实现。生产由`components/astronomical-event-modal.tsx|scss`承接同一责任，计划编辑/只读及旧事件深链共同复用；原计划完整编辑、行程冲突、提醒清单、列表/详情与保存返回保持不变。之前范围受限的简化宿主已退出当前入口。

[单选视觉](../../shared/astronomical-event-modal/reference/plan-single.png) · [来源、验证与限制](../../shared/astronomical-event-modal/README.md)
