# C：源缺测版本化出版、加载与组合绘制

M42三档已接入原出版／BFF／Mini加载与来源链；当前v3只替换该目标的源绑定PNG，其余150张JPEG不变。完整交互体验仍是主线；此模块接入不代表整体画质、原生组合或目标验收完成。

## 已实现与实际证据

- 数据管线复用已收到的20个HiPS FITS输入（21,029,120B），没有重新下载。`allwise_finite_tan.py`和`hips_tan_lookup.mjs`在正式publisher下重建完整TAN几何、复用healpix-ts采样及严格源校验；三档PNG与原候选逐字节哈希一致。只将非有限源样本设为alpha0；有限黑色仍保留。缺测计数不是无伪影科学覆盖率，`validFraction=null/NOT_MEASURED`保持。
- 新v3 publication hash：`87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073`；不可变PNG地址含像素SHA。旧v2 `46c520ab6160784c766b057cae5aed4bec1bfd0d7c4f65fc136a30716e7a1462`及v1 `2076958a52af3eca6d194b0bd79686ec34c67c6829469d0b26b26b2bc0db3bce`均可经原清单／图片路由取得。153个旧JPEG、12个广角JPEG、20个原始FITS及v16/v17候选完整性再次核对。
- 新Mini显式`imageVersion=source-finite-v3`，无版本客户端继续读v2 JPEG。BFF按实际格式／维度／hash／WCS／源receipt校验；响应带实际出版hash及source ID。新加载器拒绝未绑定或相互冲突的成功回复，选择PNG／JPEG后才写入自有请求文件；取消、迟到写入、替换和启动清理复用既有owner。旧客户端继续使用旧端点；新客户端需要支持身份响应头的BFF，不能靠旧服务忽略query假装完成新版接入。
- 实际已绘Frame的图片hash传入现有modal及独立sources route，共享hook／API缓存纳入版本和hash。旧粗图可用时不会显示新细图来源；绑定出版物不可用时保留目录资料、PARTIAL与重试，不静默换来源。维度／级别规则归`miniapp-contracts/src/deep-sky-image-publication.ts`，出版、传输和原TAN注册消费者复用。
- 实际Nest/Fastify HTTP读到新三档PNG、对应清单和绑定资料，也读到全部153张旧图及v1代表图。`experience-w3-release-http-2026-09-29.json`另核编译后production-condition contracts/API导出，真实JPEG/PNG和来源hash相符；使用显式Memory/weather测试ports，无listen或部署，未认证现有8789/8791进程已换版本。
- `experience-w3-publication-chain-2026-09-29.mts`把实际HTTP字节经生产Mini请求／真实本机文件owner送入完整`drawSkyScene`及共享TWGL renderer。BSC/OpenNGC和Astronomy Engine为真实出版与算法，Context/weather为明确Memory测试adapter；不生成第二套渲染器。

| 档位 | 编码B | 源缺测像素 | 整场缺测内点 | 当前缺测像素变化最大值 | 填白变异变化 | 已保留亮部内点 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| OVERVIEW | 41082 | 22 | 21 | 0 | 148 | 1244/1244 |
| MEDIUM | 124865 | 648 | 882 | 0 | 148 | 1710/1710 |
| DETAIL | 145243 | 5095 | 8206 | 0 | 148 | 5423/5423 |

实际条件：2026-09-29T20:00:00.000Z、observer={"latitude":22.4826799,"longitude":114.5557147,"elevationM":0}、390×844、垂直FOV=2.4°／1.35°／0.54°、NIGHT、指向同刻M42。比较使用透明图片诊断基线以保持相同目录符号／可用性，填白仅是有界反例，不进入产品。三档完整画面已看；均提交正确图片来源，OBSERVATION红光时不提交该来源。全部3份实际编码文件由owner释放后为0；这不是微信文件系统／GPU/native峰值或手机资源测量。

实际输出：
- [OVERVIEW 整场图](E:/dev/worktrees/Starward/remote-main-20260908/output/playwright/cloud-sky-w3-publication-chain-0929/m42-overview-whole-scene.png)
- [MEDIUM 整场图](E:/dev/worktrees/Starward/remote-main-20260908/output/playwright/cloud-sky-w3-publication-chain-0929/m42-medium-whole-scene.png)
- [DETAIL 整场图](E:/dev/worktrees/Starward/remote-main-20260908/output/playwright/cloud-sky-w3-publication-chain-0929/m42-detail-whole-scene.png)

## 修前失败与核对

v3路由fixture修前被旧服务以publication_invalid拒绝；真实HTTP opt-in修前仍返回v2同hash，未换图片或来源。Mini修前把真实PNG写成.jpg；资料adapter修前接受另一出版物的来源；过渡成功回复缺hash时也能写图。上述反例各已复现，修后对应检查通过。任务链记录保留实际数据，不用测试数量衡量产品完成。

Python实际PNG alpha读回、有限黑色与缺FITS尾padding／缺科学数组区别；BFF版本／旧offer／绑定来源／恢复；Mini格式／身份／取消／解码／来源route／Back和原场景消费者均通过。Mini typecheck、contracts/API release build、SDK current及WEAPP隔离构建通过。保留三项原Webpack顺序／体积建议，不把它们或本机rawB当官方包体／性能。

## 干净候选、限制与下一依赖

clean-v18尚未打开：SHA256 `db4c51efa1e2a44e518c4c69eb9c936a2e25a35cd0a21b127e9180d039e0dd7c`，257文件／4,479,339 rawB，raw main 2,085,621B。无诊断／mock／vConsole／source maps；包含新加载、来源及既有轴修复，图片由BFF提供。loopback8791仅开发，不推手机。

本轮没有原生RPC重试、新窗口、被取消提权重试、手机动作、常驻服务、云部署、Git提交或推送。旧v12当前Frame／Context／4B夹具仍未知；已有安全会话恢复时先核其归属并退休，再用一个v18，先绑定实际服务出版／接受Context／已绘Frame。新月面依旧无本代手机证据。

有限源条带、饱和孔洞及整体C/B3质量／其它配准／合法覆盖继续开放；不能把缺测孔洞当真实暗星云、把有限比例当质量mask，或强加全153科学mask为普遍完成条件。HIps输入完整数组但缺2624B尾padding的标准限制保在receipt。没有填洞、改CRPIX、隐藏对象凑质量或扩大商业范围。

下一步回到同一候选的A入口／D重解码及来源／C09网格与模式／公共时间回复、返回和恢复组合；真实运行不可安全取得时，继续PLAN同阶段可执行差距，不重复本轮源下载或已闭合加工。完整旅程、环境质量、真实姿态／完整旋转校准／OS后台、Android/iOS、首屏／帧时／native资源／官方包体／流量／成本和必要独立审查均未关闭。自审不是独立审查；Goal active、无预算。

后续同轮[运行核对与接入](experience-w3-running-adoption-2026-09-29.md)已补上述当时未认证部分：先实际发现8789／8791旧v2，仅替换8791公开出版转发到真实编译owner，保8789内存与测试Context。原compiled HTTP／软件GPU证据不因此变成原生或全域升级。
