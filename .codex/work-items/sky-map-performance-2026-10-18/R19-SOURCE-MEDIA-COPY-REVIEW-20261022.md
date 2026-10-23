# R19 媒体原始出处复制修复独立复核

2026-10-22。独立子代理只读复核本次 `publishedMediaSource` 提取及 `SourceLinks` 接入，依据用户统一来源页指令、根 AGENTS、当前交互/小程序开发 Skill、来源共享与页面生命周期合同，以及 [gen7 目标输出审查](R19-SOURCE-TARGET-REVIEW-20261022.md) 中实际站内照片出处复制 P2。未参与实现，未操作设备、IDE、服务、构建、剪贴板或 Git 状态；只新增本报告。

## 结论

**本次修复范围未发现确认的 P1/P2；实际 gen7 相对地址在代码边界已能投影为可复制的当前 BFF 完整地址。** 支持进入受影响手机页复验，不能将本报告写成原生复制已验收、公开生产地址已可访问或整个来源交付完成。

## 核对结果

- `utils/media-source.ts:2` 提取的是既有图片 owner 的同一受限 route 正则；`mediaSource` 继续通过该 owner 投影，没有另建更宽的相对地址规则。只匹配 `/v2/spots/spot…/media/upload…/image`，不接受任意根路径、协议相对 URL、查询串、片段或外部绝对地址。原图片调用对打包图片、外图与空值的返回保持原样。
- `source-document-content.tsx:17` 仅让上述 route 优先绑定既有 build-time `__MINIAPP_API_BASE__`；普通外链仍走未修改的 `validateExternalUrl`，没有泛化私网、协议或凭据豁免。既有 `download` 私网例外条件未改；本报告不重新授权该例外，也不把普通媒体链接设为 download 来绕过校验。
- `SourceLinks:25` 显示值和实际复制值使用同一投影。gen7 实际出处中的选点 ID、上传 ID、百分号编码和 image 路径逐字保留，仅补当前运行环境的 BFF base；没有发明上游摄影出处、许可、获取时间或永久公开地址。当前开发 base 可为 loopback，这是已有受控环境地址，不是公开发布资格。
- 依赖为来源 UI → 无状态媒体地址 utility；该 utility 不依赖 UI、store、页面或查询服务。服务端 `public-spot-media.ts` 仍是公开媒体 DTO/route 的生产 owner，公开资格及媒体读取的鉴权/发布门槛没有迁入前端正则。
- 新增分支是复制动作前的同步字符串投影，不新增请求、订阅、等待阶段、缓存或页面跳转。原复制 pending、成功/失败状态及页面退休逻辑没有因本改新增第二个 owner。本次没有确认由该改动引入的重入口或陈旧回执问题；这不认证原有异步复制逻辑在所有时序下的行为。

## 本代理实际执行的边界检查

直接调用当前生产 `publishedMediaSource`、`mediaSource` 与 `validateExternalUrl`，无网络、无剪贴板写入：

| 输入机制 | 当前结果 |
| --- | --- |
| gen7 实际已发布站内媒体 route（精确标识只留私有原图/对象映射） | 外链校验仍为 URL_PARSE；媒体 owner 正确补当前 BFF base，图片与复制投影相同 |
| `http://127.0.0.1:8798/admin` | 媒体投影为 null，外链仍拒绝 SSRF_PRIVATE_DESTINATION |
| 站内媒体 route 后加 `?token=x` | 媒体投影为 null，普通外链拒绝 URL_PARSE |
| 协议相对地址、javascript、带账号/密码的 HTTPS | 媒体投影均为 null；原外链规则分别拒绝 |
| 普通公开 HTTPS 来源 | 媒体投影为 null，原外链校验通过并保持原标准化复制值 |

阅读了新增 `source-document-content.test.ts` 与原 `media-source.test.ts`。复用主代理已经完成的两项检查通过记录，未重复整套测试。新增测试确实调用提取的当前 `SourceLinks` 按钮闭包并检查写入值/拒绝反馈，能覆盖旧实现对本类相对 route 无写入的回归；其简化 hooks 不证明真实 React pending 重渲染、隐藏后的迟到回执、原生剪贴板或手机可见反馈。

## 剩余资格

原 gen7 P2 的实现缺陷已在本次代码边界消除；受影响新候选尚未在手机点击复制并观察反馈，目标验收保持未完成。不得读取剪贴板来取证；可用既有受控复制测试核对最终值、手机观察可见复制结果，再确认返回原文状态。此前确认的 HR8162 资料正文不可见、照片 HTTP/查看器成功，以及完整 R19/性能/内存义务不在本修复范围，也未关闭。

复核文件 SHA256：

- `utils/media-source.ts`：`9219d607fb81f89a15d1bf8cab389715884fcb5080e6628aa0669e8057869765`
- `components/source-document-content.tsx`：`aa8372f8d3597e30de215e456c325ae1689c61b50e12a9c40847d010c58781c4`
- `components/source-document-content.test.ts`：`802f77245fa71c1085d46898e1f37007fbb90f209b6e3e146c08f3ef8d940b21`
- `utils/media-source.test.ts`：`e3da5da476f47fc8d6558ee0569aa48dd31a89995e0dc4a45145b5eccf0723ea`
