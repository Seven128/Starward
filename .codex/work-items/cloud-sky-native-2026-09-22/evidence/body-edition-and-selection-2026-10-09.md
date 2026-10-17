# A/B：选定出版、来源身份与解码恢复

沿现有PLAN实施；不改变方案、产品范围或33项验收状态。独审、原生/手机、图质、合格采用和容量仍未完成。以下原输出统一位于`output/cloud-sky-body-editions-2026-10-09`。

## 问题与实现

图片路由原本写死当前文件，现由选定出版owner的`imageAsset(hash,file)`核文件、字节及实际格式，标准出口复用该入口。Moon coverage保独立合同，旧JPEG别名只供图片，不捏造历史metadata。真实HTTP回归又发现精确`/manifest`被逐体`:file`路由截获而404；改成共同body路由后，静态manifest优先级成立，公开URL保持。

`packages/miniapp-contracts/src/sky-source-selection.ts`持有纯来源选择/路径合同，构造、native Sources准入、Prepared caption与HiPS adapter已迁移。对象资料仍允许同对象红外和target-optical两版组合；body/Prepared/HiPS与其他家族互斥。空hash、错领域、混合家族、孤立HiPS sourceIds拒绝，既有有效URL保留。origin、出版准入、权益/采用及文件信任仍由原owner执行。

W3解码复用只比较release函数与Canvas代次，粗/细共享释放函数会误判READY。现另核对象、档位、文件、出版/来源、field、pixel、缺测与display-support身份，真正同已绘资产才复用。检查补齐当前可见性/Canvas依赖后仍实证13失败，生产身份修复后有效断言全部通过；不能把全部失败归harness。

## 有限证据

- `http-checks-3.log`：原六文件共13项HTTP/出版通过。`retained-http-checks.log`保精确metadata路由404修前失败；`retained-http-checks-r2.log`两项通过，含七真实owner图片/metadata与标准出口同bytes/headers、错对象/错版、coverage/旧JPEG别名，以及两本地文件版次。第二版为运输fixture，不冒历史采用；坏旧图片不抹掉独立当前图片。
- `source-contract-checks.log`：2项分支/URL往返和错域/混合拒绝。`source-consumers-1.log`保任意字符串formatter旧断言失败；改为有效双版本和真实负向拒绝后，`source-consumers-2.log`18项来源/Caption/实际页面隔离通过。
- `owner-regressions-1.log`保13失败，含缺Canvas依赖及误复用粗档；`owner-regressions-2.log`44项报告认证/缓存/解码恢复通过，含取消/迟到/hide、新Canvas、细失败保粗。`sky-report-auth/catalog`隔离环境补现extended目录常量，旧投影和认证断言保持。
- `app-types-3.log`、`contract-types-2.log`、`api-types-4.log`exit0。此前命令错误、fixture类型错误和旧失败原样保留。App optional字段undefined问题已按真实可选性修复。

当前base service两版fixture证明运输/路由，不证明真实历史元数据供给、全部具体owner/client准入或已采用产品；不冒完整A/B交付。

## 消费者与局部恢复收敛

页面以`skyResourcesActive`统一报告/可见性准入，`skyImageryActive`保图像模式差异，`skyResourcesPaused`保Sources暂停。target-optical、HiPS、W3、七天体、银河、插画和地景迁至同一输入责任；家族需求、观察模式可用的插画/地景以及宽视场银河互斥保持。实际参数表达式检查覆盖Sources保owner/暂停、普通hide、过期/不可用/错误报告及不同需求；不是实际React或原生控件证据。

集中迁移真实消费者隔离环境：实际选中目录表达式、accepted完成/展示端口、shared body bindings、当前extended目录和严格科学家族discriminator。失效来源返回/绘制绑定修复，原负向断言保留。日月旧地平线截断断言改按既定全天球要求核无地景时上下部分都可拾取，未反向加生产截断。光学完成新增独立来源字段/空fallback及当前HiPS opacity的旧结构断言随实际合同迁移；这不证明图质合格。

又核实两个真实行为缺口。无显式科学/Prepared提交也扫描目录，现只在相应port存在时查其条目；移除守卫的实际owner变异触发`unneeded_default_catalog_scan`。天体局部GPU失败原按钮触发整Canvas重建，现只复位共享body shader，图像由对应loader重试，独立有效资源保持；实际按钮接回旧重建回调的变异触发`optional image retry cannot retire independent Canvas owners`。全局Canvas失效仍归原生命周期。共享通知保七家族fallback、失败/刷新失败含义、隐藏不通知及按资源重试。

- `paint-consumers-1.log`保4失败，`paint-consumers-2.log`16项接受帧/校准/网格/深空辅助恢复通过。
- `resource-consumers-1.log`18项真实资源epoch/clear/取消/元数据与Moon/云带准入通过。公共native缓存消费者移入实际跨realm buffer校验，未改准入信任或删除失效前日志。
- `page-consumers-1.log`66项中63通过、3失败；`page-consumers-2.log`14项相关恢复/目录/公共准入通过。`body-recovery-1.log`26项天体提交/局部shader/真实Hook冷暖及退休通过；`body-feedback-1.log`两项通知/按钮通过。
- 同一Sky/services矩阵：`integration-1.log`1024项/988通过/35失败/1跳过；`integration-2.log`1026项/1020通过/5失败/1跳过；`integration-3.log`1027项/1025通过/1新增退休引用未绑定失败/1跳过；`integration-4.log`**1029项/1028通过/0失败/1跳过**。相对原816项基线范围不同，不直接减失败数。skip保持，不把软件矩阵当全产品/设备验收。
- `scan-mutation.log`与`body-retry-mutation.log`为预期失败，原源码未替换；有限修后检查通过。`app-types-7.log`exit0。当前有限源码绑定`source-bindings-r1.json`不冒完整依赖闭包或验收。

普通Prepared registry仍空，Scene失败/STALE、科学/配准/权益未决、图像真实外沿、原生控件、手机、物理/容量与独审缺口保留。未提交/推送、采购、部署、发布或外联；未加工/采用新图像。

## E原生环境

官方MCP开窗300s超时，随后官方截图仅2×2。同项目官方CLI open exit0并读回23977命令服务；未改项目/账号/API或清缓存。只读Windows探针确认进程14960/“今晚去观星”窗口最小化；身份守卫下窗口API接受一次restore，官方截图仍2×2。随后同进程响应正常但main-window handle/title变化，不继承旧handle继续操作。Console error过滤为空不代表无错。截图/回执保原；当前页、控件、逻辑viewport及Canvas未验，既有WXML FAILED保留。开窗调用已结束；未启动自动化场景、手机、构建或rebind服务。

后续只读检查确认23977/PID14960、9420/PID33088仍监听，8787/8791已不监听。官方MCP对dist/weapp-fixture与已列项目dist/weapp-check均返回project window not found。仅在该实际失败后复用本地公开miniprogram-automator0.12.1连接既有9420：`native-existing-sdk.log`读回pages/map/index，`native-existing-sdk.png`176373B已实际查看，正常地图/搜索/图层/导航及暂无数据面板可见。观察脚本`probe-existing-native.mjs`设25s期限并在finally释放自己连接，不关闭IDE、不替换账号/存储、不注入页面。这个结果证明应用及该自动化通道运行，不证明活动项目路径、API身份或最新云观星代码/控件；2×2回执仍保留，不能据此宣称产品黑屏。下一验证先绑定正确构建和服务。
