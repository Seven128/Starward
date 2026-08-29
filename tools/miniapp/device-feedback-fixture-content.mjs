import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeFixtureBase(directory, appId) {
  await mkdir(path.join(directory, "weapp", "pages", "index"), {
    recursive: true,
  });
  await writeFile(
    path.join(directory, "project.config.json"),
    `${JSON.stringify(
      {
        appid: appId,
        projectname: "Starward isolated device feedback",
        compileType: "miniprogram",
        miniprogramRoot: "weapp/",
        setting: { urlCheck: true, es6: true, minified: true },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(path.join(directory, "weapp", "app.js"), "App({});\n");
  await writeFile(
    path.join(directory, "weapp", "app.json"),
    `${JSON.stringify(
      {
        pages: ["pages/index/index"],
        window: {
          navigationBarTitleText: "Starward Device Feedback",
          navigationBarBackgroundColor: "#050814",
          navigationBarTextStyle: "white",
          backgroundColor: "#050814",
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(directory, "weapp", "app.wxss"),
    "page{background:#050814}\n",
  );
  await writeFile(
    path.join(directory, "weapp", "pages", "index", "index.json"),
    `${JSON.stringify({ usingComponents: {} }, null, 2)}\n`,
  );
}

export async function writeFixtureVariant(directory, variant) {
  const page = path.join(directory, "weapp", "pages", "index");
  const palette =
    variant === "A"
      ? { background: "#07111f", accent: "#67e8f9" }
      : { background: "#160b2d", accent: "#f0abfc" };
  await writeFile(
    path.join(page, "index.js"),
    `Page({data:{variant:${JSON.stringify(variant)},tapped:false},onTap(){this.setData({tapped:true})}});\n`,
  );
  await writeFile(
    path.join(page, "index.wxml"),
    `<view class="page"><text class="eyebrow">ISOLATED DEVICE FEEDBACK</text><text class="candidate">CANDIDATE ${variant}</text><button bindtap="onTap">BOUNDED INPUT</button><text wx:if="{{tapped}}" class="observed">INPUT OBSERVED</text></view>\n`,
  );
  await writeFile(
    path.join(page, "index.wxss"),
    `.page{min-height:100vh;box-sizing:border-box;padding:180rpx 48rpx;background:${palette.background};color:#f8fafc;display:flex;flex-direction:column;align-items:center;gap:44rpx}.eyebrow{font-size:24rpx;letter-spacing:4rpx;color:${palette.accent}}.candidate{font-size:72rpx;font-weight:700;color:${palette.accent}}button{width:520rpx;background:#f8fafc;color:#111827}.observed{font-size:32rpx;color:#ffffff}\n`,
  );
}
