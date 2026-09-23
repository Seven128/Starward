import Taro from "@tarojs/taro";
import { Button, Canvas, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import type { PlanPublicShareData, SourceSummary, SpotPublicShareData } from "@starward/miniapp-contracts";
import { StatusPanel } from "./status-panel";
import { useAppStore } from "@/state/app-store";
import "./share-poster.scss";

type PublicShare = PlanPublicShareData | SpotPublicShareData;
const ID = "public-share-poster";
const WIDTH = 320;

function posterLines(data: PublicShare): { heading: string; lines: string[]; sources: SourceSummary[] } {
  if (data.kind === "PLAN") return {
    heading: data.spotName,
    lines: [
      `公开行程 · ${data.spotRegion}`,
      `计划出发  ${data.departureLocalDate} ${data.departureLocalTime}`,
      `观测时段  ${data.localDate} ${data.localTime}`,
      `至 ${data.endLocalDate} ${data.endLocalTime}`,
      `地点时区  ${data.timezone}`,
      ...data.events.map(event => `关联天象  ${event.displayName}`),
      "计划结束不代表已到访或观测成功。",
      `分享有效至  ${data.expiresAt.slice(0, 10)}`,
    ],
    sources: [data.spotSource, ...data.events.flatMap(event => event.source ? [event.source] : [])],
  };
  return {
    heading: data.name,
    lines: [
      `正式观星点 · ${data.region}`,
      data.address,
      ...(data.status === "TEMPORARILY_CLOSED" ? ["此观星点暂时关闭，请勿按旧信息进入。"] : []),
      `开放  ${data.opening || "暂无资料"}`,
      `进入  ${data.access || "暂无资料"}`,
      `安全  ${data.safety || "暂无资料"}`,
      `停车  ${data.parking || "暂无资料"}`,
      `视野  ${data.horizon || "暂无资料"}`,
    ],
    sources: [data.source],
  };
}

function wrap(text: string, width: number): string[] {
  const rows: string[] = [];
  for (const paragraph of text.split("\n")) {
    let row = "";
    for (const char of paragraph) {
      if (row.length >= width) { rows.push(row); row = ""; }
      row += char;
    }
    rows.push(row);
  }
  return rows;
}

function posterLayout(data: PublicShare) {
  const content = posterLines(data);
  const heading = wrap(content.heading, 12);
  const body = content.lines.map(line => wrap(line, 20));
  const credits = content.sources.map(source => [
    ...wrap(`${source.attribution?.name || source.provider} · ${source.title}`, 25),
    ...(source.attribution?.statements.flatMap(statement => wrap(statement, 25)) ?? []),
    ...wrap(`许可：${source.license}`, 25),
    ...wrap(source.sourceUrl, 43),
  ]);
  const bodyTop = 83 + heading.length * 28 + 12;
  const divider = bodyTop + body.reduce((height, rows) => height + rows.length * 21 + 8, 0) + 8;
  const creditsTop = divider + 44;
  const height = creditsTop + credits.reduce((sum, rows) => sum + rows.length * 16 + 5, 0) + 28;
  return { heading, body, credits, bodyTop, divider, creditsTop, height };
}

function paint(data: PublicShare, onDrawn?: () => void) {
  const layout = posterLayout(data);
  const ctx = Taro.createCanvasContext(ID);
  ctx.setFillStyle("#fffdf8");
  ctx.fillRect(0, 0, WIDTH, layout.height);
  ctx.setFillStyle("#4859b8");
  ctx.fillRect(0, 0, WIDTH, 8);
  ctx.setFillStyle("#282b29");
  ctx.setFontSize(16);
  ctx.fillText("今晚去观星", 22, 42);
  ctx.setFontSize(22);
  for (const [index, row] of layout.heading.entries())
    ctx.fillText(row, 22, 83 + index * 28);
  let y = layout.bodyTop;
  ctx.setFontSize(13);
  for (const lines of layout.body) {
    for (const row of lines) {
      ctx.fillText(row, 22, y);
      y += 21;
    }
    y += 8;
  }
  ctx.setStrokeStyle("#d9dce7");
  ctx.beginPath();
  ctx.moveTo(22, layout.divider);
  ctx.lineTo(WIDTH - 22, layout.divider);
  ctx.stroke();
  ctx.setFillStyle("#5c6473");
  ctx.setFontSize(11);
  ctx.fillText("资料与许可", 22, layout.divider + 22);
  let sourceY = layout.creditsTop;
  for (const rows of layout.credits) {
    for (const row of rows) {
      ctx.fillText(row, 22, sourceY);
      sourceY += 16;
    }
    sourceY += 5;
  }
  ctx.draw(false, onDrawn);
}

export function SharePoster({ data }: { data: PublicShare }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"permission" | "export" | null>(null);
  useEffect(() => { Taro.nextTick(() => paint(data)); }, [data]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("poster_draw_timeout")), 6000);
        paint(data, () => {
          void Taro.canvasToTempFilePath({ canvasId: ID, fileType: "png", width: WIDTH, height: posterLayout(data).height,
            destWidth: WIDTH * 2, destHeight: posterLayout(data).height * 2 }).then(result => {
            clearTimeout(timeout);
            resolve(result.tempFilePath);
          }, cause => { clearTimeout(timeout); reject(cause); });
        });
      });
      await Taro.saveImageToPhotosAlbum({ filePath: image });
      useAppStore.getState().notify({ owner: "share-poster", placement: "floating", tone: "success",
        title: "海报已保存", body: "可在相册查看公开分享海报。", dedupeKey: "share-poster-saved" });
    } catch {
      const settings = await Taro.getSetting().catch(() => null);
      setError(settings?.authSetting?.["scope.writePhotosAlbum"] === false ? "permission" : "export");
    } finally { setBusy(false); }
  };

  return <View className="share-poster">
    <Text className="type-section">分享海报</Text>
    <Canvas className="share-poster__canvas" canvasId={ID}
      style={{ height: `${posterLayout(data).height}px` }} />
    <Button className="share-poster__save" disabled={busy} onClick={() => void save()}>{busy ? "正在保存…" : "保存海报到相册"}</Button>
    {error === "permission" ? <StatusPanel state="ERROR" title="相册权限未开启"
      detail="请在微信设置中允许保存到相册，再返回重试。" recoveryLabel="打开设置"
      onRecover={() => void Taro.openSetting()} /> : null}
    {error === "export" ? <StatusPanel state="ERROR" title="海报暂时无法保存"
      detail="请稍后重试；开发者工具不代表真机相册能力。" recoveryLabel="重试保存"
      onRecover={() => void save()} /> : null}
  </View>;
}
