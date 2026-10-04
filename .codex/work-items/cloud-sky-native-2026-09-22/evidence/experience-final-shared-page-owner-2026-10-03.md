# 最终 SAO/影像同 owner 的实际 page/Scene 开发证据

本次仅修改任务脚本、证据与对应进度/Context，没有修改产品源码或其他业务逻辑。工作区、分支与 HEAD 保持指定值；六项设置/outbox 字节保持。Goal 为 active、无预算、未完成。

本次接上最终 generation wrapper 修复后的完整 API 与实际 page 提取路径。两个任务 bundle 通过显式转发调用同一份真实 `sky-public-image-runtime`，每个已完成条件均断言一个缓存实例、一个 owner、同一个对象；没有两个 32MiB 预算。page 的转发和 API 的 owner 观察包装单独保存，原实现字节绑定仍在。当前 page174/API150 个输入去重为271个，根读回逐项核当前字节；此前 r10 的修前 epoch 不改判。

## 已完成的受影响路径

复用现有标准静态 artifact、数据、受控原生 UTF8 scaffold 与当前 Scene；没有重新导出、下载、加工或重跑旧九条件矩阵。本次仅五项变化后的共同文件消费者：冷宽场、数值完整天球、M51 细化、来源 hide/Back 暖返回、宽场 hide/暖返回。共20个软件 GPU 帧，PNG 与保存的底向 RGBA 精确一致，同帧 publication/已绘时刻绑定成立，无 GL 错误。数值全天视野为267.87503292753496°，不是旧 DOME 字符串回退45°。

宽场/全天实际 SAO 绘制身份分别4/6；选中 M51 已加载1850条，但该局部的 SAO 投影绘制为0，不冒有画出的恒星。普通 SDSS 成功细化到 DETAIL 并保 MEDIUM parent，选中 W3 状态 READY。来源按钮消费实际已绘 SDSS hash，受控导航随后执行真实 hide/show，所有活动图像/句柄/租约退休，返回后的 RGBA 与此前选中帧一致；宽场返回亦精确一致。属于受控导航与生命周期证据，尚未执行完整原生来源 route/Back UI。

| 已完成条件 | 已载 SAO 条数 | SAO 数值 payload 模型 B | 已载 publication JSON 表示 B | 持久 SAO 文件 B | 已就绪图像 RGBA 模型 B |
| --- | ---: | ---: | ---: | ---: | ---: |
| 冷宽场 | 324 | 18144 | 48092 | 47434 | 14680064 |
| 完整天球 | 423 | 23688 | 62558 | 93245 | 14680064 |
| M51 细化 | 1850 | 103600 | 265936 | 358429 | 13631488 |
| 来源 Back 暖返回 | 1850 | 103600 | 265936 | 358429 | 13631488 |
| hide 宽场暖返回 | 324 | 18144 | 48092 | 358429 | 14680064 |

实际参与的图像 owner 为 W3 宽场、星座插画、地景、SDSS 与选中 W3。月面/各行星 Hook 虽启用，本次没有已加载影像，银河 Hook 无已加载图片；这不能证明这些家族的完整共同峰值。Prepared/science registry 仍空。

同一时间轴观察的独立层峰值：已就绪/注册图像 RGBA 模型14680064 B、临时 pending decode RGBA 模型8388608 B、MapFS 文件含暂存/库存5598741 B、租约24。GPU 句柄模型各自峰值 texture14680064 B、buffer156636 B；这些峰值及不同层不能求和声称同帧物理总峰。parsed JS/native/driver/RSS 未测。缓存结束前49项/5560715 B，在原共同32MiB预算内；clear 后所有文件数据项/租约/队列/退休项为0，只留26 B空 v2 inventory。所有实际 SAO loader 已 dispose 且无 pending/loaded；诊断强引用不冒实际 GC 回收。

## 静态合同与真实出口表示

同一 Caddy 静态 mount 的 SAO JSON GET 按真实 source hash/19433 B正文校验，编码8574 B；HEAD200正文0，原 ETag 条件 GET304正文0。均为 catalog/static，source披露保持。最后 report/BSC/figures 三项暖请求均304、零正文。没有放宽通用 response-cache 政策。

runner 最后的总量相等断言 **FAILED，原记录保留**：76个请求中73个完成、3个被取消；完成客户端接收编码正文6311671 B，而 Caddy size 总数6338325 B。最先串行的 HEAD 客户端收到0 B，Caddy 压缩写入计数为20；其余成功非 HEAD 的 status/size multiset 均可匹配，留下3条200/8878日志，恰对应3项取消，但匿名日志不能逐条对应路由或证明客户端实际收到了这些字节。取消物理传输量保持未知，不能算零。新版任务脚本改成分项计量；没有重跑五段旅程，保存的 r12 仍为失败 aggregate epoch。根只读路径核完整保存结果和这个分项差异，没有将失败 runner 改成通过。

另保留：最初 builder CRLF 入口失败；r11 所有编译产物完成后的 console 变量误名失败；静态 HEAD 零正文误调用 gunzip 失败；复制任务元信息造成 inputs-before 文件冲突；根读回首次误读 sourceCredit 的嵌套字段失败。修正均限任务入口，复用完成产物，不掩盖历史。

## 直接证据及边界

- [根读回结果](../../../../output/playwright/cloud-sky-shared-page-readback-1003-r2/result.json)：271源、20帧、分项日志、单owner、来源与清理核算。
- [保存的执行脚本](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/executed-script.mts)、[aggregate失败/请求账本](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/live-failure.json)、[最终资源/句柄账本](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/final-owner.json)。
- [实际静态合同](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/static-json-contract.json)、[单实例转发绑定](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/shared-runtime-forwarding.json)、[复用编译产物](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/reused-build.json)。
- [全天实际 PNG](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/joint-full-sphere-normal-settled.png)、[选中实际 PNG](../../../../output/playwright/cloud-sky-live-mixed-1003-r12/joint-selected-fine-normal-settled.png) 已实际查看；照片暖底/弱结构等质量问题仍在，不凭画面或像素相同通过图质。

React/Taro/query/MapFS/native callback/clock 与软件 GL 受控，隔离 Nest/Fastify/Caddy 使用实际服务代码和缓存源文件，report/business/weather/test-astronomy 保留 fixture 含义。共享 BFF/watch 没有重启，最新服务加载仍未验。不是完整 JSX/WXML、原生手势/公开时间/完整跟随校准、Android/iOS、物理设备/200DAU/12Mbps/10-20混合容量或独立审查。自审不冒独审。

唯一下一依赖：同一 owner 的实际月面/行星参与及活动 page 请求 hide/取消/迟到组合，按已有真源与当前端口补有界增量，核被保留文件和退休资源；不重复五段/旧矩阵或推测优化。旧二进制回滚 JSON 库存及全小程序文件额度仍待核。图质/来源/批量完整出版、物理峰值与端云成本、平台验收全部义务保持。
