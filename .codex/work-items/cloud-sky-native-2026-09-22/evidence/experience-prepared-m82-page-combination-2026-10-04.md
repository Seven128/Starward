# Prepared M82 同页面与组合开发结果（2026-10-04）

当前 `SpotSkyPage` 已沿原 target-optical owner 接入显式 Prepared 候选；原正式 Map 入口、同一 Sky 实例、三级渐进影像、失败保粗/重试、已绘来源返回，以及时间提交后的全景/地景/W3/暖返回组合均有当前代码开发证据。普通 Prepared registry 仍空。M82 总览照片矩形仍 **FAILED**；这些结果不认证完整图质、微信原生或最终交付。

## 源码责任与回归

本轮生产修改仅 `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`，由编辑前[封存](../tmp/prepared-page-before-2026-10-04/spot-sky-page.tsx)核其净差：显式 caller 参数统一为 `targetOpticalPublication` 的 kind/ref/hash，普通 route 不传，仍走 legacy；已选对象须匹配 caller reference 才使用其 pin。页面只调用一次现有 `useSkyTargetOptical`，队列用现有 `skyTargetOpticalFrame` 保原 Prepared envelope。实际绘制在同一 Canvas generation 的 Prepared Scene port 提供原 ref/hash。已绘 completion、来源、取消迟到、粗层回退、缓存和既有实例冻结辅助资源策略继续由原 owner 负责；未新建渲染器/缓存框架或改其它业务。

四个 Sky 测试随实际消费者更新。页面 frame/port 检查在修前为4通过/2失败，证据[修前回归](prepared-page-before-fix-2026-10-04.txt)保留。旧 auxiliary VM fixture 的5项失败在封存的修前页面也复现，补当前 owner 绑定/依赖，见[原 fixture 失败](prepared-page-prior-auxiliary-fixture-2026-10-04.txt)；不把这个测试夹具修复称为产品退化修复。最终[46项受影响检查](prepared-page-affected-checks-r3-2026-10-04.txt)与 App 已装 TS5.9.3 [类型检查](prepared-page-app-typecheck-confirmed-2026-10-04.txt)通过。原根 TS6 的 baseUrl 废弃命令失败保持，未改配置。

已有 WEAPP watch 的[源映射](prepared-page-watch-source-binding-2026-10-04.json)包含与当前页面214480B逐字节相同的 sourceContent SHA `caafc94693e4d73abdde122e0974ffaad455bcaf216a25f3b27711dfacc5cd60`。这只证明当前代码进入既有构建，**不证明 DevTools 已加载、WXML 合成或原生呈现正常**。原 BFF/watch PID24040/18132及10月1日创建时间保持，未重启。依用户要求不核对落后设计稿，所查看的是本轮真实输出。

## 当前实际三级页面

[构建](../scripts/build-prepared-m82-page-2026-10-04.mts)与[执行](../scripts/experience-prepared-m82-page-2026-10-04.mts)使用已安装真实 React/Query/Taro、完整 JSX/官方页面配置与 WEAPP 组件映射；原 Map marker→正式 Context→原云观星按钮→同 Sky 页面。隔离 loopback 当前 controller/service/过滤器与真实天文/静态资产，天气及仓库为 fixture。受控 selector、MapFS、native callbacks、软件 WebGL，SCSS仅绑定未合成；不是另一份简化页面，也不是 WEAPP binary/手机。

来源、权利、真实视野/颜色、独立轴尺度、覆盖与原图保留沿[M82成品实际路径](experience-hubble-m82-prepared-2026-10-04.md)。没有重下载、重投影或重加工。实际 pin 是[本地候选 manifest](../../../../output/hubble-m82-prepared-publication-1004-r2/manifest.json)，hash `c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c`，三个PNG1152395B，仅隔离显式 service 注册，普通 service 未注册。

[页面r2](../../../../output/playwright/cloud-sky-prepared-m82-page-1004-r2/result.json)正常退出：公开搜索/定位 M82，公开 pinch 到0.2/0.1/0.05°；OV/MED/DETAIL 实际原hash参与，当首个 DETAIL 503时保 MED，公开重试取得 DETAIL。资料→原 Sources 页面读出完整原 credit/许可/历史颜色义，原 Back 恢复同相机/时刻/细图；hide退休活动租约/原生登记/GPU，show暖读取无新增PNG传输；退到45°撤 Prepared，返回原 Map，最终 clear全部活动归零。

[保存读回r2](../../../../output/hubble-m82-prepared-page-readback-1004-r2/result.json)复核507前端输入、164后端project图、62实际公共read文件的前后绑定与当前原字节、每个PNG实际HTTP/hash和七个实际已绘档位。八组 GL→PNG→GL 原RGBA精确；来源Back/hide-show严格像素相同。104个HTTP正文6939898B不是公网计费出口。r1在浏览器启动前因 task TSX root config 的 decorator 错失败，改明确 worker tsconfig 后r2执行，未改生产；reader r1错假设存有旧任务 `executed-spot-sky-page.tsx` 失败，r2直接核实际source binding与diagnostic原sha，没有重跑页面。

完整 OV/MED/DETAIL 输出均查看：真实尘埃/喷流细节存在，但 OV明显旋转矩形边界，MED视野外边界问题不能因局部截图未出现而升级。几何alpha不是科学有效覆盖；未裁去真实弱结构、未统一抠图/生成补全，未采用候选。

## Prepared 与时间、全景、图层的同实例组合

[剩余组合脚本](../scripts/experience-prepared-m82-combination-2026-10-04.mts)直接复用上述五份原构建文件，[复用绑定](../../../../output/playwright/cloud-sky-prepared-m82-combination-1004-r2/reused-current-build.json)前后原hash保持；没有重构建、不重旧503矩阵/九体/校准/来源冷矩阵。实际新组合为：

- 同 M82 DETAIL 的两网格开/关、星座开/关，原 Prepared packet与来源保留，恢复严格RGBA精确。这个0.05°视野没有网格交点、星座插画不参与，开关帧本身不能证明网格/插画可见绘制效果；先前宽场证据保持，不冒本轮视觉覆盖。
- 原公开跟踪 M82、播放1×/暂停推进1.528秒、取消回原时刻，再播放/暂停/提交 `2026-10-04T13:00:01.411Z`；Scene和正式 Context 保同一提交时刻。提交后 Sources→Back及hide→show保该时刻/同视图/原hash、严格RGBA相同，PNG暖零新传。
- 公开缩回45°退休 Prepared；打开地景再pinch到267.8750329°。开启 W3时12个Norder0 tile全部ready，实际12次 mesh提交，银河影像互斥。关闭W3恢复银河；原竖向Canvas拖动中地景opacity1→0.701566→0.033842→0，2373个实际可用已绘对象都在同snapshot的拾取候选中，不表示现场可见性。
- 反向/取消回原全景，严格RGBA相同；回45°、原公开重新定位M82/细化，仍保持提交时刻/原Prepared hash，全程仅最初三个PNG1152395B，没有暖返回重传；原 Back回 Map，最终所有活动原生登记/GL/租约/队列/encoded库存0。

[组合r2](../../../../output/playwright/cloud-sky-prepared-m82-combination-1004-r2/result.json)正常退出。[根保存读回r2](../../../../output/hubble-m82-prepared-combination-readback-1004-r2/result.json)核507前端/164后端project图/86实际公共read，13组GL→PNG→GL精确、上述四组严格恢复精确；实际网格小视场、暂停细图、完整全景、W3全景和完全渐隐图已查看。137个HTTP正文13867452B仅本地开发请求体账。r1实际W3已ready12，却因task写成`wide-field-w3`而非真实`WIDE_FIELD_W3`等待超时；原失败/成功前缀保留，r2只修task标签与已知相机浮点断言。reader r1错以Prepared调用`skyImageMesh`失败；实际是原`artworkLevels`及完整贡献回执，r2核正确owner、原packet/hash/保存像素，没有重跑runtime。

## 总资源与仍未闭合的义务

组合2980个无丢弃观测跨六个实际参与影像家族：Prepared、目标红外、银河、W3、星座插画、地景。瞬时MAX分别为 GPU纹理上传模型（含copy）17309696B、buffer133968B、13个native活动登记/源RGBA等价20185088B、MapFS含暂存8130683B、encoded8067093B/预留3316173B/19租约/2running/6pending。真正copy模型峰发生在全景返回局部，旧资源与新绘制的过渡已记入，不能只报细图settled。clear期间最多82项retired、文件仍有字节，最后归零，不能从activity0推断退休盘即时0。

这些层的峰发生在不同样本，**不能相加为CPU/native/driver物理总内存**；未含真实GC、driver depth/AA、完整CPU mask/系统开销、帧p95或真实端云容量。17309696B约16.51MiB高于16MiB压力参考，参考不是已采用硬预算或手机实测。当前没有据此扩预算、降低真实图质或新建队列/调度框架；后续优化须定位实际瓶颈和可验证收益。原实例辅助策略15803512B固定未扩大。

本次自审不是独立审查，新生产页面增量独审MISSING。M51/新M82照片边界、弱结构/整体配准/批量来源与背景供应、普通采用及完整标准发布链、旧严格返回失败、WXML FAILED_DEVTOOLS、Android/iOS新版月面、真实mount/retention/全机180GB与200DAU混合容量保持原状态。大字号暂停、手机不可用。六保护与源码范围见[本轮范围读回](prepared-page-scope-verification-2026-10-04.json)。无其它业务逻辑改动、提交/推送/部署/发布/采购；Goal仍active无预算，唯一后续依赖只由PLAN顶部维护。
