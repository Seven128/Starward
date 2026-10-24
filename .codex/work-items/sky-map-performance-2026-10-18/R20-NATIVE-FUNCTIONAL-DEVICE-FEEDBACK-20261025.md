# Native 功能真机反馈（2026-10-25）

本轮是原生 React Native App 的开发反馈，不是 WEAPP、正式候选或完整 Native／Goal 验收。用户已后置层叠／Sky Play 性能与相关内存／OOM，本轮没有采这些数据；未改变冻结代或科学数据。

## 候选与执行资格

已复用同一授权 USB／原 ADB，按原 G2HMxB 盐化绑定核对物理目标、当前用户与实际包身份。Android API34／arm64，当前用户0。原生 API4318只在本机回环启动并有实际健康读回，原 trusted owner仍只接受回环；手机私有业务未资格，不扩大 LAN授权、不创建 reverse／bridge或改防火墙／VPN。

首个普通 Native APK input `45135b72396d0711788415d5bf2fcf4c489b0669343cfaf719ea6a0c7c89301a`，SHA `b0715f391021ecf4a2559964f781aca1c1d82cd9b15afdeaa418e72207b2e6f6`，38,346,767B。已验证签名、aapt包／MainActivity、实际HBC自有API值、源码输入及手机base.apk SHA后才首次启动。

底栏修复后新 input `3a91c623547020d7e2b8eb2a17ccd84f0f6528329e67666f274f924d86d8656a`，APK SHA `53960d39ea3d5e865306699e49497cd74919b996efeb6ab96a635079383cce1e`，38,346,811B，同签名且内容确有变化；只替换前次已核自有包，`install -r`后实际base.apk SHA完全匹配，未uninstall／clear data。

所有输入均由真实截图、同设备／用户／APK、实际Native或已核本App请求的系统许可窗口、新鲜60秒单次守卫执行。一次过期输入被拒绝，未发送，再新截图才继续。Root独占设备／构建／服务，没有代理现场操作。

## 共享底栏的实际修复

旧包普通MainActivity两帧均有五入口落入Android三键系统栏并被浅色系统层覆盖。仅 `PrimaryTabBar`消费已有SafeAreaProvider的bottom inset，新包真实帧五个图标／完整标签及内容触点已位于系统栏之上，颜色和层级恢复；Root实际点击My，再从My进入偏好，路由／当前选中可见。新独审也已实看今晚／My／偏好新帧，限定范围无新P1/P2；iOS、完整导航／视觉仍未验。

全部原图／sidecar／单次输入journal在 private owner：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/`

关键新帧为 `native-functional-ui-53960d39/screen-fd5774b0-63ee-42c0-b012-ef25aa86b6bb.png`（今晚）、`screen-f0b002ae-603d-450a-8365-c63bb84ff96a.png`（My）、`screen-289df83f-9482-4ac3-80f4-a0a500021d51.png`（偏好）。没有复制像素到Git。

## 偏好保存与冷启动：发现真实消费缺口

Root从实际偏好页的初始“银河／≤800m”，明确选择“行星／不步行”，再点保存。`screen-a6aff78d-1ca4-45ac-a17d-55518fca9338.png`及`screen-1cadb967-817f-4790-bd15-afcd20128969.png`显示所选值、r2与已保存；没有先改数据库或注入UI数据。

仅对本轮新App做一次正常强制停进程／冷启动，无数据清理。首次launch后立即读PID过早失败，原intent／launch回执保留；随后只读确认新PID确与原PID不同，补写结果，没有再次重启。证据 `restart-7a708179-9516-402a-a43b-ac48c77d4cb2-*`。

冷启动从普通入口到今晚，再经实际My／偏好入口：`screen-f0fc0b74-4288-4136-a695-6fa60487ec55.png`及稍后帧显示r2／已保存仍在，但快捷控件回到“银河／≤800m”。这不是合格读回。源码 `quickTarget/walking`仍用常量初始化，快捷body也有从unrestricted重新组装完整定义的风险。Root已停止进一步快捷保存，原r2保留；新鲜作者沿原v2／草稿／稳定保存owner修消费者，不重写存储平台。

目前不能仅由真帧判定手机SQL数据丢失；手机内部DB未导出。新作者另在实际Screen→原preferences runtime→生产SQL adapter（仅native SQLite原语替换）重建旅程证实SQL仍是行星／0而UI错误，证据归对应模块报告。原生当前投影和完整保存／恢复结果因此仍未完成，不能拿“已保存”标签关闭。

## 前台定位：权限成立，fresh fix仍未取得

Root经原生偏好页自有解释Modal明确请求前台位置，已核系统 `SkyGrantPermissionsActivity` 为SYSTEM／系统codePath，来自 `app.starward.mobile`且同用户／task。实看系统位置许可后选择“使用时允许”，精确选项保持。实际包权限读回FINE／COARSE granted=true、非one-time；无background permission。

首次OS许可返回后，自有Modal回到无spinner／无错误的idle，仍未定位／r2。相关原图 `screen-8a29f92c-4f0f-46ae-b9b6-7bea15796001.png`（系统）、`screen-8c26d460-13d2-4f42-ace6-a096889e7755.png`（返回idle）。许可交接与真正后台取消的责任已交新鲜只读判别，未直接把截图推成provider失败或宣布已修。

在已读回授权这一实质新条件下，Root只再明确请求一次；本轮不再出OS许可，实际进入loading。`screen-748fe4da-f97e-4c62-a99e-0efb64ea79ed.png`至`screen-dd8bfd04-4d76-4684-a4e7-54fcc3649124.png`仍未返回可用fresh fix。没有退为旧位置／默认点、没有伪造坐标、没有改provider精度／系统定位／网络或连续重发。

Root随后点击明确取消，`screen-1cc633b2-bfc7-4d35-ab9c-680f3b194dbb.png`／`screen-4210bf2e-0b68-4951-b775-eb36e68887c0.png`显示modal关闭且仍未定位r2。因平台one-shot无取消handle，Root又仅停止自有Native包以退役本次未返回的native工作，数据／权限保持，其它应用和服务未改。手机前台不再假定Native，后续启动须重新核当前目标。

## 未完成与下一责任

继续修快捷／完整偏好的一致编辑保存责任，并按判别处理正常OS许可交接；重新构建／核包／实机复测。真正fresh设备位置、正常私有API、实际业务写入／完整family、iOS和其它Native生命周期仍未验。头部raw neutral／visual、My常驻release-context技术串列为其原生投影owner的例外，不以本轮底栏修复关闭。

本机main已交付b4d26545的精确Product／Context成功、staging磁盘前置失败继续独立判断；本轮未提交源码及设备反馈不借旧CI或源码检查成为产品完成。全部原件、失败和缓存保留，完整Goal active未完成。
