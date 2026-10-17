# 公共搜索、跟踪、时刻与日期精度

本轮完成B/E当前公共消费者软件组合，并修复云观星与Map共用日期转换丢失秒／毫秒的问题。唯一PLAN、图像冻结、全部33行原义务及真实未验状态保持；无来源获取、像素加工、普通Prepared采用、云写、平台投递或原生架构修改。

## 缺陷与修复

完整原页面通过原搜索Input／结果行／资料modal／定位和跟踪按钮、原Canvas点选、时间尺、取消及明确提交。修前r1已提交`2026-10-11T16:00:00.264Z`，原“后一天”按钮的真实HTTP成功后变成`2026-10-12T16:00:00Z`，丢失264ms。该运行终态FAILED、浏览器错误空、无最终通过／退休回执，所有原观察和图片保留；不是未响应的活会话。

`components/observation-date.ts`原`instantForCivilDate`通过展示层`HH:mm`及分钟合同转换，截断更精确的已提交时刻。现复用原IANA／有界东八区分钟转换，再保留原秒及毫秒；未改变展示格式或共享时间合同，云观星和Map仍调用同一责任。午夜民用日期及中午到次日中午观测夜保持原含义。

新增四项精度／Intl回退回归在修前失败，原两项通过；修后日期、时区、Sky Context／公共动作及Map时间尺共59项通过。Map原`commitMapDate`复用既有AST回调夹具和真实日期helper，证明实际请求保秒／毫秒／观测夜、busy去重、同Context提交及替换选择／revision／reset／请求代次后的成功和失败退休；日期与Map共12项通过，其中6项日期与前组重叠。App TS5.9.3最终通过。AST／VM只证明原回调边界，不冒Map整页或native合成。

## 当前完整Taro组合

复用原builder／experience及共享tracking-time消费者，增加原搜索行JSX闭包观察。完整SpotSkyPage、安装的React18／Query、官方Taro4.2.1 WEAPP页面／组件映射及原Hook参与；SCSS输入绑定但擦除。真实当前controller／service在隔离loopbackHTTP上运行，天气／repository为夹具，天文和public文件真实。选择器几何、文件／图像回调是受控wx端口，实际绘制为浏览器软件GL与真实Canvas2D。手动相机不请求传感器许可，不拼接旧38阶段为一次新旅程。

- 当前r2一个Context、15阶段；M31保持GALAXY身份且居中，天狼星HR2491跟踪保持同帧几何、拾取及来源时刻。预览不写Context，取消恢复原已提交时刻与精确保存像素；1×跨午夜、暂停、实际点选资料、明确提交更新revision2且保持暂停像素。
- 原日期按钮更新到revision3，地点／Context身份／时区保持，秒和毫秒保持，民用日期与观测夜正确；实际已绘HR2491仍居中。精确保留的旧M31搜索JSX闭包在迁移后被调用，未改变新Context、选择或modal；停止跟踪走原按钮。
- 418前端、183后端静态图输入、311当前checkpoint输入及6保护项前后绑定；62个实际public文件、81真实HTTP、7,666,677响应体字节。三个Context写请求分别201／200／200，无注入失败、无浏览器错误。
- 8组实际GL bottom-up、实际Canvas2D top-down和PNG严格核读，无像素容差；每次取图前后字节保持，预览不同于原帧，取消及明确提交对应帧字节一致。已实际查看M31定位与日期迁移PNG；画布星点、星座、目录标记可观察，SCSS／普通控件可见性不在该截图范围。
- 原Hide／Unload／Query.clear／临时缓存clear后，GPU、native登记、encoded entries／租约／字节／队列、请求、Query、AppHide及传感器监听均0；实际surface销毁并失去GL context。资源各层最大值仍是分开模型，texture9,437,184B、buffer35,436B、decoded10、sourceRGBA15,269,888B、FS1,983,054B、encoded1,936,478B／reserved1,003,398B／I/O1,030,597B，运行2／排队6；不相加冒设备全程物理峰。

独立Python核读复用原当前输入和像素检查，没有另造生产状态或星空；它不是独立产品审查。旧38阶段完整组合保其旧输入、范围与失败，当前实际前端图只改变一个生产文件：共享日期helper。未重跑校准／后台／Sources矩阵，不声称旧全部图仍与当前字节相同。

## 当前本地包与保留

沿原隔离release owner构建新的dirty `ci-structural-nondeployable`，manifest `artifacts/miniapp/release/cloud-sky-public-date-ci-20261011-r1.manifest.json`，UUID `c8fb321c-20fb-4f75-aa25-be92151ab61c`；274文件、4,652,280B，fingerprint `a98de0b3443c829cbd238709f79552c97b419213522cf25e35ebc0f05e12a1b2`。main2,096,519B、余633B，实际manifest／五角色origin／包预算及原候选3项检查通过。编译大小警告保留；这不是qualified protected CI、可部署资格、微信窗口或native当前验收。

输入、日志、修前源码／夹具及原包都保留；精确当前绑定见[回执](../../../../output/cloud-sky-public-actions-2026-10-11-r1/current-binding.json)。运行和独立核读在任务文档回写前完整前后绑定，之后只接受明确的task／Context文字转换，不覆写checkpoint。新包、两个公共运行及旧八次完整组合分别保留。图像库存／19源控制／212既有资源模板不变。

当前Goal active、无预算、未完成。普通Prepared0、HiPS关；原生控件／署名不可见仍FAILED／UNKNOWN_PRODUCT_VS_DEVTOOLS，surface候选未采用，手机不可用。Android／iOS、物理姿态／资源、真实store／CDN／IAM／TLS／域名／资格、qualified OCI、200DAU／12Mbps／10与20混合容量、回滚／off-host及独审仍MISSING／UNVERIFIED；阶段软件结果不升级任何未验义务。
