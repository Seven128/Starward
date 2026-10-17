# A/F固定资源分域接线与来源出口

无预算Goal保持active，仅在既有worktree/codex分支实施。影像冻结、普通Prepared采用0、33项及历史未验/失败保留。以下是开发证据，不是OSS发布、CDN资格或完整原生验收。

## 实现与含义

`sky-resource-origin.ts`负责环境绑定的地址、编码cache环境身份和预览头；bare客户端、编码运行时、SAO、星座及来源链接复用该owner。`MINIAPP_SKY_RESOURCE_BASE`为空时沿原API域名与cache key；显式配置时固定哈希图片/文件走资源域名，身份同时绑定API环境与资源域名。发现留API，失败不回退业务主机。预览凭证只给精确API origin的sky路径，不发送到资源域名或相似域名。

W3五份历史清单含`/v2/celestial-objects/...`的API相对下载路径，普通来源下载仍留API，显示的W3固定LOD走资源域名。SDSS/Prepared固定清单可走资源域名。不改写旧W3清单内容来掩盖地址语义。出口保留清单档案不证明消费者采用离站清单。

SDSS/W3 owner显式枚举准入current/retained清单；API和标准export共用固定附件头。新source-manifest静态路径须为JSON并保固定下载头。无filesystem扫描、第二采用表或图像加工。

release-bundle新增`--sky-resource-origin`，省略时绑定API，构建覆盖环境中残留的资源域名。新bundle manifest为v2；平台消费者共用编译域名/指纹核读，v2回执保资源origin。v1仍解释为同源，不能注入未绑定的异域字段。平台验证使用fake driver，未上传/预览/发布。

最后追踪真实发布调用者，现有WeChat protected workflow原本只传API域名，已补`vars.STARWARD_WECHAT_SKY_RESOURCE_ORIGIN`到同一bundle命令；空值显式回落API，非空校验HTTPS origin。只修改本地workflow及其合同检查，不执行远端workflow，也不冒环境变量已经配置或域名通过平台批准。

## 固定出口与检查

原1774条URL/字节/头全部保留，新增11份清单后为1785文件、104,613,871B，publication hash `7c00d901785918c5d038f594bd1e63f8adf12dded8cfea245e35ad6950143fb8`。最终1785地址复核为1780条资源origin、5条W3来源清单API；这些是出口/地址数，不是覆盖数。

机器证据在`output/cloud-sky-resource-origin-2026-10-10-r1/metadata-export-result.json`与`metadata-address-final.json`。前者保union完整性/首次构建epoch，后者绑定最终地址政策、15份控制源码及最终普通隔离构建。第一轮CJS/top-level-await工具错误保`metadata-export.log`，修异步入口后成功；只重验地址政策时未再复制union。

最终`dist/weapp-check-resource-origin-1010-r2`为274文件/4,642,395B，fingerprint `e3d362ea67db9e59cec57a2b8090de8e7f9180583ae3c8adf97688bf07c84a09`，保3项构建警告。它用两保留`.invalid`域名、无fixture/诊断/预览凭证，属于普通隔离编译，不能称CI release或真实环境候选。App/API类型通过。最终消费者50/50、来源HTTP7/7、export6/6及适用release/fake平台17/17、static9/9通过；不是89项产品验收。

新增真实bare消费者回归在修改接线前失败：固定Prepared仍指向API。首轮50项中48通过；新增fixture缺format与旧源码提取缺地址owner绑定各保原错误，修后整组50通过。生产错误没有为迎合VM realm而改写。

## 真实wx的有限证据

复用cache探针`--separate-resource-origin`，在独立wx目录执行编码runtime/cache与bare transport。两个origin都是loopback，API发现返回明确的transport-only probe，不能当真实合格数据。

`output/cloud-sky-native-resource-origin-2026-10-10-r2/native-result.json`记录DevTools/SDK3.17.4：API发现仅一次请求并带受控探针头；资源两次成功请求均无该头；第三次资源请求503没有API回退，粗图lease有效。概览679,918B、细图10,374,947B按wx文件读回hash，暖取同文件零新增HTTP，release/clear后只剩空`index-v2.json`。本地冷链509/1781ms不外推公网、解码/首帧时延。

r1失败于把实际`sky_public_image_response_invalid`限定为受控VM的`sky_public_image_failed`，回执保留。r2核拒绝与实际错误码，四项服务端断言全真。r2绑定在后续“W3清单保持API”分支加入前；缓存运行时、资源origin/环境身份及预览头逻辑未再改，探针的SDSS发现/Prepared编码路径不含W3分支。最终W3政策有源码消费检查和r2普通构建；此前原生回执不能扩大为最终App全部原生通过。

两轮官方截图已查看，但无Canvas探针的状态文字也没有出现在截图中。只确认后台请求/FS回执，视觉未验；此观察增加WXML/工具呈现核对线索，**旧Canvas遮挡仍FAILED，原因UNKNOWN_PRODUCT_VS_DEVTOOLS**。s1/s2本次新开并已官方关闭；服务收回执后退出（exec47954/24357 exit0）。r1失败目录保留，r2只清任务独立编码cache，正式cache/工作区不清。新来源下载、像素操作和编码均0；两次本地成功传输只属验证。

## 离站出版仍未闭

[ESA私有OSS源站](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/use-esa-to-accelerate-oss-resource-access)已有成熟签名回源能力，未引入自写签名/影像源站。账号、bucket、域名/备案、套餐及正式资格未核，未采购/部署/修改DNS。

实际上传须沿同一index把公开route映成object key，不能递归复制physical files：HEALPix叶与`/index`共存时的`.tile`后缀不是公开URL。OSS[自定义metadata](https://www.alibabacloud.com/help/en/oss/user-guide/manage-object-metadata-10)有`x-oss-meta-`前缀，现有公共HTTP头需用[ESA响应头能力](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/modify-outgoing-response-header)恢复并核GET/HEAD/Range、hash/署名。图像变换/资源minify不能改变被SHA绑定的文件；实际配置/当前套餐能力未验，标准出口不等于OSS HTTP回执。

真实store/CDN/live/旧App/rollback、10/20冷进入混合业务、CPU/RSS/DB/native/GPU物理峰、Android/iOS、完整交互及修后独审仍未闭。当前code-review工具只读PR CI，不是本地独审；最新独审MISSING。全部33项不因本文变PASS。
