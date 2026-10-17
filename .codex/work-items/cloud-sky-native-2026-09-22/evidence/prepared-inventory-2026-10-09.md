# C模块：现有批次与采用库存读回

范围是只读内容关联和计数，不是图像加工、采用或完整C模块验收。实现入口为`data-pipelines/deep-sky/prepared_inventory.mts`，真实registry由`PreparedOpticalImageryService.registeredPublications()`提供；新增批次字段向后兼容原v1回执。唯一PLAN未修改。

## 实际输入与结果

固定输入见`output/cloud-sky-inventory-2026-10-09/input-r2.json`，绑定现有SXT、PS组合和派生区域三个批次、现有区域标准静态封存索引，以及四项已有Scene失败决定。最终只读结果`inventory-r4.json`：9条加工/复核记录、4个出版候选（1对象、3区域），12个LOD图片4,749,960B、4个支持文件2,564,504B、4个公共metadata响应95,814B；20个独立payload合计7,410,278B。不是全库、物理盘或全年流量。

普通registry和合格可分发均为0；文件通过不关闭Scene、配准、权益、采用或分发。两个区域在所供静态索引中完整，其余两候选部分缺路由。四项旧Scene决定原状态FAILED保留，因其所绑定实现已变化，当前适用状态STALE；不是修复通过。未决定配准/权益仍UNVERIFIED，待修和失败行继续留队列。声明输入范围读回无exception。

原`inventory-r1.json`因误将PNG/XML provenance按JSON读取而失败，原样保留；修正adapter后r2/r3/r4分别保存，未覆盖旧成果。hash关联验证不能重新认证过去的图像看审或名义TAN独立配准，也不重新计算Python加工key；原精确加工/复核/决定/输出关联与当前bytes已核，历史执行身份和当前准入分开。

## 有限验证

- `tests-3.log`：7项库存行为及2项原标准静态出口检查，9通过。覆盖实际角色计数/去重、无自动采用、异常队列、错复核/manifest/孤立或重复决定、Scene实现失效、标准bundle损坏及恢复、坏候选不抹掉独立有效结果。
- `api-types-3.log`：API与其导入的MTS类型检查exit0。
- `python-checks-r2.log`：现native批次失败隔离/新增命名回执与derived批次预检隔离共3项通过。复用`output/image-tool-benchmark-2026-10-08/.venv`，没有安装依赖或模型推理。首次调用工作目录导致runtime路径错误保留，后用绝对路径修正。
- README与资源流程owner记录耐久入口/合同；运行进度只在本证据和当前交接。独立审查仍MISSING；C/D共同的真实质量、权益、配准、合格采用、全引用和容量义务仍未完成，33项整体验收不升级。

## 原生独立路径

官方wechatide Skill0.3.11/readiness读回equal、登录未过期、CLI无需token。最初CLI截图调用完成回执未保存，当前画面UNKNOWN；随后官方MCP无等待截图明确返回目标项目窗口未打开。已向官方initializer发出打开同一项目窗口请求，仍沿其原调用收结果，不重复开窗、清缓存或修改项目设置。目标为`apps/wechat-miniapp`；尚无当前原生控件/Canvas输出证据。
