# 旧基线reader与新增Prepared静态路线

只读提取当前HEAD `b73523f1c76bf50a3811fcff65f3e2d2f791373d`的`tools/deployment/sky-static-bundle.mjs`，保留精确源文件；未切换分支、重建包、修改生产或重新加工图片。用真实已恢复1752条静态index检查该旧reader，并实际调用其bundle validator。

旧reader接受1743条，拒绝9条新增Prepared support URL：3native pinned manifest、2派生区域manifest及4原区/供给mask。它首先报`sky_static_record_invalid`，这些路线在旧基线尚未支持；移除附件头仍拒绝。初始调查脚本错把全部差异假设为附件头，报错后纠正该假设，未据此改产品或弱化守卫。实际结果`output/native-static-reader-compatibility-2026-10-09/failing-before.json`和完整旧源码保留。

因此，**该HEAD控制工具读取新增完整包FAILED**，不能把“旧二进制回滚UNVERIFIED”继续表述为已兼容，也不能仅删附件头宣称修好。现工具对旧图及区域的精确记录、当前完整包与隔离恢复已有独立限定开发证据；应用回滚镜像、当前控制工具、静态保留URL各有自己的版本责任。旧客户端能否消费新producer、真实supported-client/rollback引用全集、OCI/live/GCM/远端仍未验。无实际已部署旧工具身份或新控制兼容方案，不重复旧包/备份矩阵或运行发布。普通注册空，所有未提交成果及33项保持。
