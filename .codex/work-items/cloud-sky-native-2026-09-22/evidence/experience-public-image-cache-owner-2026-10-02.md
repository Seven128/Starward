# 公共压缩文件 owner：开发小路径，2026-10-02

共享公共影像文件服务及 Canvas lease adapter 已实现；[正常useSkyNativeImages/App/既有清缓存服务](experience-public-image-consumer-integration-2026-10-02.md)已迁移，并经[实际完整模块独审](experience-public-image-consumer-independent-review-2026-10-02.md)闭合桌面受控集成。legacy session仅保其既有明确变化点，selected W3仍未迁移。不得宣称真实微信重进已减少公网HTTP或已完成目标运行时。该模块是唯一 PLAN 第3步的独立依赖，实现不替代第2步影像质量、原生组合及完整交付。

## 单一责任与实际实现

`apps/wechat-miniapp/src/services/sky-public-image-cache.ts` 拥有编码文件、环境/内容SHA/编码键、全局最多两个 acquisition、完整写入、读回、不可变 attempt 路径、索引提交、跨启动恢复、LRU/配额、租约、取消、epoch清理和有界恢复；不导入 React、api-client 或页面，不解码/渲染。目录索引只存字段白名单，无URL/账户/来源语义。当前获准 manifest 仍拥有来源、权限/许可、覆盖、科学含义；字节相同不合并这些事实。

`sky-public-image-runtime.ts` 提供 Taro FS/transport 薄适配，准入同一已配置环境的已获准 hash-bound 公共 bitmap 路由。optical trial、selected W3 可变 URL、账户/天气/投稿不进入持久缓存。Moon coverage 与星座/行星/银河/地景/W3宽场/SDSS现有固定出版各保其原URL，未改任何服务端合同、部署或旧资产。

`sky-image-bytes.ts` 共享原编码尺寸/实际内容 SHA 验证；`features/sky/sky-artwork-request.ts` 增加可选 acquisition，Canvas解码/冷文件转移仍保原 decodeId、一次 release 和迟到守卫。公共 lease 的 release 降引用，合法文件可保留；native/GPU失败不会删除已校验字节。clear 退休 lease 并通知在途decode，旧onload不交付；已用文件等实际lease释放后回收。原临时 request 路径和 selected W3 兼容入口仍有效。

初始化只扫描版本目录内的严格自有 filename，非法/孤儿未当命中；不清任意 USER_DATA_PATH。每次磁盘命中验证完整字节和 dimensions，受预期长度及索引256KiB约束。rename原子性未假设：写后和最终文件均实际读回，再提交/读回索引。每个 committed 文件带唯一 attempt，旧取消/clear迟到回调只能处理自己路径；不可取消native I/O直到终态仍占slot/字节。异常删除的文件继续计额度，后续显式清理可恢复。清理在native回调卡住时最多2秒返回pending，底层继续拥有其I/O；pending/leased不报完成。

**初始开发政策** 为32MiB编码文件（包含图片在途staging/失败垃圾），单文件上限8MiB，非decoded/GPU预算。依据既有库存实测13.57MiB：两份当前库存约27.14MiB，加当前最大3.16MiB写入低于32MiB。该政策用于当前实现试验，并非全小程序200MB剩余空间或最终设备额度认证；正常索引及索引staging另外各受256KiB上限约束，通常最多两份；其他业务文件还要在全产品资源检查中计入。不能把32MiB写成全目录实际磁盘严格上限。不预加载全库；新增资源需沿同一有界淘汰，不扩大现GPU额度。

## 实际修复与开发验证

独立审查已实际发现并保留修前反例：首个acquisition刚交付lease、Promise.finally尚未运行时，同SHA新waiter加入已经广播的旧job，最终被清掉且永久等待。现于成功/失败广播前关闭join并按identity移除pending，旧finally不删除替代job。作者立即连续acquire regression通过；独立同一复现的修前/修后代次和其余FS/lease复核已由[完整独审](experience-public-image-cache-independent-review-2026-10-02.md)闭合，不能仅以测试数量替代效果。

作者相关回归21通过、miniapp typecheck通过（最后源码修复后另行复核）；覆盖跨启动、同length损坏、active lease、nativewrite/clear迟到、半提交、quota、初始化恢复、startup超预算、双waiter取消、late Canvas decode和cold转移。这些是受控FS/native回调开发检查，无实际WX存储、正常Hook、真实Canvas/GPU/手机/容量声明。

现有真实月面coverage-v2、地景overview/detail的离线Windows Node FS小路径：

- 独占 `output/sky-public-cache-real-files-1002-r1/`，执行task/script和源代码/三图/manifest/六项保留文件前后SHA绑定。
- 三图实际文件为1,595,187 /854,784 /3,316,173 B；首次transfer合计 **5,766,144 B，三次**，写入与最终读回均匹配当前出版SHA。
- 首次交付后立即同SHA获取仍完成；release一份lease不删另一份正在用的文件。
- 同runtime暖取、全新owner重读索引恢复，均 **额外transfer0/额外编码bytes0**；lease归零而合法压缩文件仍在。
- clear实际完成，自己目录只剩空索引，当前三源/代码/manifest和六项保留文件前后不变。
- result SHA `62802cda6b638e08956712f49139addca2f4c4fb3a2351cb80beda385df5e9f3`；结果/事件/执行task/readback/binding保留。首次task误将输出指向不存在的task-local output，mkdir在任何写入前失败；已改为惯用repo/output后运行，未删/覆盖失败或历史生成物。

这些 **transfer是缓存owner的离线读源边界，不是HTTP公网出口**。Node文件系统/rename/模拟owner重启不认证WX FS或真实JS启动；没有新月面源下载、重新加工、部署、IDE刷新、手机推送/验收，也没有图像质量/已绘效果声明。

## 下一依赖

支持层和正常消费者桌面集成独审已闭合；当前Hook/Canvas解码释放、粗图回退、hide/新Canvas/owner重启/同singleton清理均有实际受控证据。App保legacy旧session扫描并恢复新目录，Settings通过既有clearTemporaryApiCache接同owner，保部分失败反馈/账户天气边界，不编辑六项保留修改。后续实际native abort复核又发现core退休被抛错打断、runtime人工reject提前释放真实在途槽；当前先fence所有消费者/逐safeabort，transport只等actual success/fail结算，core waiters即时取消但未完成I/O保占用。修前r6/r8与修后最终r11完整路径见上述独审，不能追溯升级前面NodeFS和旧支持层bindings。接着完成静态成品与既有release/readonly出口接入、实际端云链与冷暖整场资源验证。selected W3先补publication/每图内容身份发现；不可拿publicationHash或可变URL当图片内容SHA。目标WX额度/系统清文件/最低SDK、总native/GPU内存与冷暖全旅程/服务器混合业务及200DAU峰值仍未验。Goal active、无预算、未完成。
