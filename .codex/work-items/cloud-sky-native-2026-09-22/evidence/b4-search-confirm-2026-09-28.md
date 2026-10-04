# B4 搜索确认与原生输入同步

## 责任与发现

`SkyObjectSearch`是云观星天体列表的搜索输入owner，输入文本经250ms debounce交给现有`SkySearchResults`，请求和取消由既有query owner负责。Android自动突发输入出现`Uranus`→`Uras`后，对这个边界作限定检查；该丢字原因仍未证实。

发现另一个可复现的消费者错误：键盘确认回调原先读取闭包中的`trimmedQuery`，没有使用原生确认事件的最终文本。原生已输入M51、React仍是M5时会查询旧内容；原生已清空但旧React状态仍是Alioth时会重新呈现旧结果。这不是最终查询服务失败，而是确认时的文本来源错误。

## 变更与实际检查

确认事件现在同时更新输入文本和经过trim的提交词，后续请求、资料身份、取消、错误重试和250ms普通输入策略不变。没有为查询建立第二个缓存或改变渲染引擎。

新增检查运行实际组件事件回调，保留旧render回调模拟native输入先于React提交；观察实际交给结果组件的query，不以setState调用次数作结论。修前3项中2项失败：M5残留、清空后仍出现Alioth；修后3项通过，另带既有tracking恢复检查共4/4。覆盖最终文本含空格、确认清空撤回旧结果、连续编辑只保留最新词及关闭取消timer。Mini类型检查通过。

命令：在`apps/wechat-miniapp`运行`node ../../tools/run-node.cjs --import tsx --test src/features/sky/sky-object-search.test.ts src/features/sky/sky-object-tracking-status.test.ts`；根目录`npm run typecheck --workspace @starward/wechat-miniapp`。

## 边界与下一消费者

这是本地代码/行为检查，尚未投递手机；当前P1RINGS28A候选继续用于未改字节的M51检查。下一次B4集中投递纳入本修复，再核键盘确认及中文输入。没有声称修好普通快速手输或ADB突发丢字；Taro运行时自身也有native value回写，不能仅改成defaultValue就宣称解决。

时间尺左侧向右滑返回观星点仍待归因；已安装Taro的`taro.config.d.ts`明确标`disableSwipeBack`自微信7.0.5起失效，并链接微信官方能力调整公告。此次没有加失效配置或禁止整个页面正常返回。中部手势可继续同代验证；边缘竞争留B4批次。

本项不改数据权益、商业排除原因或Goal完成条件；独立审查与目标键盘证据仍缺。

## 隔离WEAPP编译补证

后续goal续行完成独立`dist/weapp-check-sky-b4-confirm-0928`构建，退出0、Webpack17.511秒，仍有CSS顺序、chunk体积与性能建议3类warning；[完整日志](b4-search-confirm-build-2026-09-28.log)。实际Sky编译JS的`onConfirm:function(e){o(e.detail.value),d(e.detail.value.trim())}`已带入修复；无当前P1RINGS28A标记。只是无标记的本地检查包，默认本机API，不能直接充当手机可用候选或最终正式包。

通过现有`fingerprintBundle`得到257文件、SHA256 `71d175d04805d9f03c0d7a915823c7e9a537b888b49a1892847bb5f34c647b45`、4,428,879 B。依据实际app.json分包根统计原始文件和：主包2,070,696 B、spot423,617 B、sky922,511 B、content1,012,055 B；这不是微信官方压缩/上传计量，V05仍需正式计量和手机资源。没有打开/刷新IDE、替换手机包或改活动dist输出。

00:46受保护手机抓屏仍为同代M51宽场、m2/45°，等待放大未当作已发生；无重复输入。上一goal轮归类为进展（搜索修复与反例），本续行也有新编译/字节证据，不是全Goal阻塞审计成立。
