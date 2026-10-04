# W3 开启与月面回程：当前共享资源组合基线

2026-10-02。Root 在第一条五条件资源因果已独审闭合后，解除当时的阶段内暂停，复用原脚本 `experience-full-hook-resource-journey-2026-10-02.mts --expand` 和全部既有离线 bytes/report/metadata。没有生产改动、重新获取素材或启动服务/IDE。旧 r4 与作者“--expand未执行”保当时条件，本次独立新 generation 不回写旧结果。

`output/playwright/cloud-sky-full-hook-resource-1002-r5/result.json`，6,062,623B，SHA `d7aee05722e0f3472ca89b25d818c486f4c19d530bc7f39f138701568946c5e1`。执行脚本 SHA 仍 `b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a`。r5从小程序cwd执行，metafile相对cwd路径却被拼到ROOT，原task脚本的静默catch漏掉依赖绑定；**r5自含sourceBindings只有page/api-client两项，不能声称它自产完整138项绑定**。其整份bundle与r4仅JS注释路径不同，TypeScript removeComments printer的全AST规范化文本相同（SHA `c8fea7c94ee4136fce395a6ffb42171e6d08be2d1bfe168b7876c2ff88fbc97b`）；原r4的138项输入/current hash及全AST等价由后续active input receipt补证，不回写r5，也不冒称r5执行前自产绑定。未来harness依赖绑定必须严格失败，不能将读取失败当虚拟module静默排除。原五 W3-off 条件先运行，新五 W3-on 和三 Moon-focused 条件随后使用同一个真实公共缓存/13 Hooks/同 HTMLImage/实际 software WebGL owner。原五全RGBA SHA与r4相同；同一 Moon2.4 往返全RGBA SHA相同，原45/W3 on45返回也相同。

| 新条件 | art / W3 wanted | 新 image transfer / decode | owner-held源RGBA模型 | 三帧最大 GL 逻辑纹理 | 第三帧源上传 |
| --- | ---: | ---: | ---: | ---: | ---: |
| W3开45 | 8 / 0 | 0 / 0 | 16,515,072B | 3,432,448B | 0B |
| W3开85 | 11 / 5 | 5 / 8 | 16,515,072B | 15,728,640B | 0B |
| W3开139 | 28 / 8 | 3 / 20 | 31,981,568B | 31,981,568B | 15,204,352B |
| W3开274.9 | 0 / 12 | 4 / 4 | 14,680,064B | 16,777,216B | 0B |
| W3开回45 | 8 / 0 | 0 / 9 | 16,515,072B | 14,680,064B | 0B |
| Moon朝向2.4 | 0 / 0 | 1 / 1 | 10,485,760B | 8,388,608B | 0B |
| Moon朝向85 | 16 / 0 | 7 / 18 | 23,920,640B | 18,939,904B | 2,621,440B |
| Moon朝向回2.4 | 0 / 0 | 0 / 1 | 10,485,760B | 16,318,464B | 0B |

这些传输是受控 offer 读取真实 encoded bytes，不是公网请求或出口容量。W3开139暖帧重传包含8张1MiB W3 tile（8,388,608B）与8张星座图（6,815,744B），不是全部由星座图造成。Moon朝向85的2,621,440B来自Ari/Cam/Cas/Cep；此时月面Hook wanted为空并转cold，不能称为月面纹理本身重传。2.4时10MiB引用模型含8MiB月面和2MiB既有地景overview retained fallback；实际GL只提交8MiB月面。

W3开关在45不生成tile请求，85及以上依实际当前资格申请；银河和W3沿实际页面互斥条件，不把纯selector的旧组合误作生产并存。返回Moon2.4没有新encoded transfer，但从cold重新解码一次；返回W3开45的9次decode也不能称为全部解码命中。

退出后实际共享core inspect为51 entries、8,162,497B encoded、lease/reserved/running/pending/retired/failures皆0；renderer texture/live bytes皆0。任务诊断故意强持所有创建过的HTMLImage，不能据进程RSS认证native/GC。实际native acquisition callback peak为2，decode pending peak为5，再次说明2槽不等于统一native decode上限。帧时只有同机software观测，其他软件GPU试验同时运行，未作性能结论。

Root已查看W3开139与Moon2.4实图。W3的矩形/拼接痕迹仍可见；光谱含义和整体画质义务保持开放，RGBA往返相同不解决画质。新月面软件图不升级手机新版验收。SDSS/selected/LOCAL资格仍明确关闭，当前结果不是全部公开选中消费者、连续手势/时间/跟踪、native性能或200DAU容量认证。

下一依赖是同原窗口的active-retention独立两变体actualGPU A/B，明确持续内存与首帧/不同集合代价；source-plane候选的数值/真实像素证据另存，不与保留政策混合成一个结果。对应实现和完整恢复/目标证据仍归唯一PLAN。
