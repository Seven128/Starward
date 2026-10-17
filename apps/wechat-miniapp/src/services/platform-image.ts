import Taro from "@tarojs/taro";

/** Editors retain their own account, draft, rights and lifecycle guards. */
export async function choosePlatformImages(count: number) {
  try {
    return await Taro.chooseImage({
      count,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    });
  } catch (error) {
    // Classify only the native picker result, before display-copy translation.
    const message = error instanceof Error ? error.message
      : error && typeof error === "object" && "errMsg" in error ? error.errMsg : "";
    if (typeof message === "string" && /^chooseImage:fail\s+cancel\b/iu.test(message)) return null;
    throw error;
  }
}
