# 当前性能入口恢复证据

本轮按用户要求完善agent可独立接手的性能前置与判断逻辑；唯一执行入口为[TARGET-HEAP-OBSERVATION-ROUTE](TARGET-HEAP-OBSERVATION-ROUTE.md#current-performance-entry)，唯一PLAN仍持有D1/D2责任。此处仅归纳证据与缺口，不构成第二份计划。

## 当前证据与完成边界

| 责任 | 当前结论 |
| --- | --- |
| 源码与交付 | main/56ba8f62e06297bedb6c34eee4ce2c4208b503aa；本轮无产品源码改动。既有CI成功，自动staging容量前置失败未部署；本轮未重跑。 |
| 候选 | 热点canonical为f82522ac（339件/5,038,372B，主包2,027,580B）；仅当前外部项目增加官方private大包调试设置后为4668dd24（340件/5,038,429B）。API和Sky资源origin均配对热点owner。差异、原字节及完整指纹已保存。 |
| 热点与出网 | 当前授权USB手机到电脑热点的源地址/路由已核；现有ICS为VPN出口→热点下行，提升只读确认正确，未修改共享。源地址绑定IPv4的公网IP/域名TCP通过。 |
| 业务API | 用户报告测试点搜不到后，实读原PG55441和热点API8808均无监听；由原pg_ctl/data owner与backend-data start恢复，沿用原配置/数据库/session secret，未迁移/重种/启worker或提醒。当前host ready200、原授权手机source-bound HTTP200；真实places/search?q=星河平台返回FRESH及隔离测试·星河平台。api-hotspot/resume-verification-20261026.private.json及更新后的owner/selection持有新进程身份。原有限防火墙未改。此次重启重置volatile Context/缓存，不能当此前同缓存性能条件。 |
| 真实LAN与手机 | 用户确认扫描当前二维码；实际手机Map及连接/服务正常浮层已看。扫码后当前端口为8001而不是出码时的8002，已读到实际phone peer Established；独立真机调试窗口显示Wi-Fi、收到556/发出141、待发送/未确认0。这些是连接证据，不是性能结论。 |
| 工具与观测来源 | 官方skill/version匹配、登录有效；已验证独立Performance的快捷键录制/停止/保存及原件校验。CUA的窗口抓图/坐标输入不稳定，USB截图为独立手机证据。用户最新采用默认亲自操作真机调试与采集，旧概括GUI授权不再作为agent接管依据。 |
| 自动真机调试 | 已在自然断连后实测同一手机自动接入，4668dd24候选、实际LAN和非零消息确认，未扫码；receipt为automatic-reconnect-receipt.private.json。IDE后续重开时auto又选错VPN网卡并回退广域网，实际phone截图与无LAN peer相符；自动成功不保证继承LAN地址。该会话已结束，转同候选手动入口，当前恢复状态归HANDOFF。 |
| 性能采集与产品 | D1夜光首开Performance已完整导出并解析：2,349,130 B、747事件、376 CPU samples，SHA256为4a0e3a1b82cdfb22e217873170379eefa4bf23b3f1261a2b3dcfb083f40aab06；原件与分析在profiles/。元数据请求约713 ms，图像downloadFile至success约3371 ms，不能把它全算纯网络。操作窗口FunctionCall合计约210 ms，下一缺口在供给/下载分段，不宜盲改JS。未映射栈、native/GPU和OOM仍未关闭。三份清单文件及额外调时分配采样均已收到、校验并分析，完整状态见PERFORMANCE-CAPTURE-ANALYSIS-20261026.md；已有故障和性能结果仍未修复，分配采样不关闭泄漏/OOM。 |

主用LAN/独立窗口和Performance导出已建立过，复用有效证据，不再把它们列作待研究能力；断连后的当前现场须重新实读。首次Sky断连发生于正常Play之前，用户确认未操作；有界检查未定因。单点PSS约1,046,579 KiB不证明增长或OOM。用户已完成四份采集；Root不并发控制设备，当前转源码修复，唯一下一步归HANDOFF。

## 方案核对

原入口已经过独立审查；本轮进一步补入自动接入决策、候选必要设置、监听与真实程序身份随会话更新、故障分层，以及Storage/缓存/负载和停止保存条件。方案写责任、依赖和判定，不保存临时端口/IP/PID或逐次命令。自动入口的支持证据与实际手机成功证据严格分开。 新独立只读审查核对同账号owner、官方auto参数与当前方案，未发现阻塞问题；确认未引入额外资格矩阵，也未把用户当前暂缓采集写成永久停止。

当前外部项目为`D:/dev/Starward-data/verification/sky-map-20261018/performance-20261025/project`；raw profiles保存在同级`profiles/`，不进入小程序包或Git。私有运行owner为既有phone-current-api任务下`performance-priority-20261025T150130558Z`，当前连接读回与手机图像引用归`attached-lan-hold-evidence.private.json`；其余策略/配置/原字节均原位保全，未上传。
