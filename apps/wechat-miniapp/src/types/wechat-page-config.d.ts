import "@tarojs/taro";

declare module "@tarojs/taro" {
  interface PageConfig {
    /** WeChat asynchronous component placeholders, missing from Taro 4.2 types. */
    componentPlaceholder?: Record<string, string>;
  }
}
