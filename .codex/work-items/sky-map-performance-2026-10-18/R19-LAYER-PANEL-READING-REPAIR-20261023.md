# 层叠返回地点正文：同一位置 owner 修复

2026-10-23。沿原 PLAN 的 R19 恢复责任，不改采用视觉、原生 Picker、账户、草稿、图层数据或地图相机。普通构建已自动送达为 gen14，修后手机结果待本批原入口观察；不能把 gen13 历史像素称为本修复通过。

## 实际问题及实现

[gen13 手机批](R19-GEN13-SHARED-PRESS-LAYER-PHONE-20261023.md)只执行 large→Back→medium、一次层叠按压打开及一次 Back 关闭。Root 实看 `148cf9f3` 的中档开放/设施正文、原录像及 `701e6bf4` 关闭后标题，确认档位保留、正文阅读位置丢失。实际编码录像为 3.744611 秒；有限帧有按压变化，不认证精确 80/140ms、物理 FPS 或完整释放曲线。

当前 Map 将 spot-panel 与 layer-sheet 互斥挂载；旧 `extentBeforeLayer` 只保存档位/选点，通用 presentation setter 清掉恢复位置。现在同一挂起记录保存既有位置 owner 的两轴/anchor，Back 与再次点层叠复用同一 close 入口；setter 仅为显式恢复 spot-panel 交回位置，其余目的地清除旧命令。替换选点不重开原面板。位置是已记录的小标量快照，不保留查询、照片、原生节点或正文数据。

[首次独审](R19-LAYER-PANEL-RETURN-REVIEW-20261023.md)另外复现：旧 hook 卸载后仍能经滚动回调回写 0/0。已在 `usePanelReturnPosition` 增加唯一 mount lifetime，外写/来源准备/原生查询和结果均拒绝卸载 owner；原 visible/epoch 规则及可取消查询继续复用，不在 visible effect cleanup 改写新 show 的资格。该生命周期修复独审与普通手机验证保留为必要下一步。

## 本机验证与保护

- 两种层叠关闭的实际 Map AST 回归，修前均得到 null 而非挂起两轴/anchor；修后均通过。旧挂载实际 hook 回归，修前 record(0) 返回 true；修后拒绝并保最近 740/250 与取消未完成来源准备。
- 合批后相关 47 项通过，覆盖既有位置、选点竞争、日期 Back、编辑退出、私有转正式及照片交接；正式生产 typecheck exit 0。首次旧 spot-context fixture 缺新读入的 `panelPosition` 导致 ReferenceError，已补真实空输入，不归为产品失败。
- gen13 refresh 前完整 feedback 原件 525 件、63,439,573 B 已逐件复制/哈希读回，manifest SHA `f5a9a4ccfaf1be80fc998d29bcc14e3c421a57a58028918e540966abd1e50724`；原 run 仍在。目录在既有私有 owner 的 `gen13-before-layer-return-repair-originals-20261023`，未上传。

最终[独立复核](R19-LAYER-PANEL-LIFETIME-REPAIR-REVIEW-20261023.md)未发现新增 P1/P2；其19项检查通过，覆盖异步原生读取等待中卸载的结果拒绝。首次从仓库根执行缺失 @/ 别名属于 harness CWD/tsconfig，包原入口通过，不归产品失败。

## 普通构建与实际推送

普通 build exit 0，54.626 秒、10项既有 warnings。bundle `0f76b93f5b8164baab27e34e2e34d61a0c390849601adfb586a2e2ad570cc1ee`，345 件/5,021,505 B；main 2,033,142 B、content 1,041,539 B、spot 612,072 B、sky 1,334,752 B，maps 0。production guard、预算、实际 compiled 地址 owner 及 `R19P` 缺席通过，正常产物/私有副本完整文件指纹一致。初次临时脚本误读不存在的 `bundleSha256` 属性，那个聚合比较结论废弃；后按真实 `sha256` 的64位形状及全部 file records 重新核对，原 manifest、当前输出与私有副本三方完全相同，不把 undefined==undefined 当成功。

源 Map SHA `fb5a3d70b2ade5d8017d840ce595d386e05f79ffe9b1be415946c9515a7dfe98`，位置 hook SHA `05c0d4e4471cd06eca82244cb94f383561e2a5a0e343d8514338c8786bdcff35`。原 Stable 一次公共 refresh/auto_preview 已 success/no task，prepared `generation-000014-hKkGNE/project`，diag `.official-process-55bff91d-760d-4d9e-9023-e71225f76504.json`。Root公共USB select/screenshot完成 foreground/recheck，实看正常 Map 后才 bind `starward-device-test-3agABg`；未读手机整包字节/AppID。新图层反馈 owner 已独占输入，等待原入口两种关闭的真实位置结果；始终为 development_feedback。

全部编译/指纹/源副本/预绑定图沿既有私有 `layer-panel-return-20261023`。旧 r22 列表移除 confirmation 仍 pending，和本次成功 auto_preview 分别判断，不重发或冒称已移除。不扩大到重新选择 UI、旧 native-region/onUpdated 资格或 Sky 压力。

## 修后普通手机结果

[gen14原入口反馈](R19-GEN14-LAYER-READING-PHONE-20261023.md)两种关闭均保留同点中档和非零正文阅读区。Root实际查看before/两after逐行“暂无数据/开放时间/三列状态/设施”位置相同，未再退回身份标题；随后LIGHT来源往返及关闭也保同阅读位置。该代表失败路径已有修前/后目标证据，不再重跑同项。底层native精确offset、完整Context/横向照片/所有变体和完整UI未由本批认证；Picker输入、精确释放曲线及原整体验收义务继续保留。
