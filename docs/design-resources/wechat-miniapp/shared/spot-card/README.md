# 公共观星点卡片（设计预览）

搜索页采用卡片的共同结构与样式，供搜索结果和创建/反馈记录共同使用。card.mjs拥有区域、名称、地址定位图标、有图/无图结构；card.css拥有90px基础卡片、字级、照片渐变、圆角及按压反馈。调用者传入名称、区域、地址与可归属封面；缺图显示原无图卡，不生成虚假照片。

搜索负责筛选和选点，记录列表负责审核扩展与状态路由；组件不持有查询、审核、草稿、导航或业务store。新增审核字段只属于列表的下方扩展区，无需给基础卡片增加业务模式开关。

消费者：search/adopted/search-page/preview（mountSpotCards）；contributions/adopted/creation-feedback/preview（spotCard）。这是一套浏览器设计资源公共组件，不是生产Taro组件迁移完成的声明。
