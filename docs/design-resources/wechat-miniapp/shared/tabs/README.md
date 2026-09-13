# 公共 Tab 激活反馈

本轮用户确认的公共规则：同组基础字号一致，谁active谁稍大；退出激活时同步缩回。共享[selection.js](selection.js)统一文字结构，[selection.css](selection.css)统一激活与缩回的220ms可中断缩放；当前13px基础字、激活视觉约15px。仅缩放文字，触控区域、相邻项与指示器定位保持稳定。减少动态效果直接更新。

生产`SelectionTabs`当前消费者为观星点章节导航、贡献编辑、正式反馈及贡献记录的真正Tab。页面仍拥有当前项、同文档滚动/焦点/指示线责任；公共模块不建立第二个选中状态，也不把章节导航改为替换页面的TabPanel。真正Tab使用选中语义，同文档导航使用当前位置语义。单选图层、筛选项、三态模式和Map/My主导航不因外观相似而自动套用该规则。

该公共定义也约束后续同家族Tab消费者；生产组件已按[共享owner](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-tab-selection-feedback)接入并核对现有真实调用方。WEAPP模拟器已观察四项贡献Tab只有一个active、active矩阵约1.15385且transition为0.22s；快速反向和系统减少动态效果仍按未验证范围记录。
