# 观星点反馈与远端多草稿 · 已采用

[交互评审](review.html)为唯一当前设计入口。2026-09-08 用户采用。可编辑 HTML/CSS/JS、reference 截图和 source 原稿随包保存。Stitch 原稿提供构图，本地交互与用户修订为当前还原依据，不把原稿中的虚构数值作为产品事实。

覆盖新增空表单、远端多草稿保存/回填、完整字段反馈差异与冻结审核快照、地图草稿和审核中提案组件。用本目录 server.py 启动 4284 服务（SQLite 仅本机请求持久化演示，无真实认证）；正式服务数据库、审核合并和小程序尚未迁移。测试：python test_service.py；node --test preview/diff.test.mjs。
