import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Canvas, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import type { DisplayMode, PlanPublicShareData, SourceSummary, SpotPublicShareData } from "@starward/miniapp-contracts";
import { EMPTY_FIELD_VALUE, StatusPanel } from "./status-panel";
import { useAppStore } from "@/state/app-store";
import { displayZonedShareExpiry } from "@/utils/zoned-date";
import { planSpotRiskMessage } from "@/utils/public-share-copy";
import "./share-poster.scss";

type PublicShare = PlanPublicShareData | SpotPublicShareData;
const ID = "public-share-poster";
const WIDTH = 320;

function posterLines(data: PublicShare): { heading: string; lines: string[]; sources: SourceSummary[] } {
  if (data.kind === "PLAN") {
    const risk = planSpotRiskMessage(data.spotStatus);
    return {
      heading: data.spotName,
      lines: [
        `公开行程 · ${data.spotRegion}`,
        ...(risk ? [risk] : []),
        `计划出发  ${data.departureLocalDate} ${data.departureLocalTime}`,
        `观测时段  ${data.localDate} ${data.localTime}`,
        `至 ${data.endLocalDate} ${data.endLocalTime}`,
        `地点时区  ${data.timezone}`,
        ...data.events.map(event => `关联天象  ${event.displayName}`),
        "计划结束不代表已到访或观测成功。",
        `分享有效至  ${displayZonedShareExpiry(data.expiresAt, data.timezone)}`,
      ],
      sources: [data.spotSource, ...data.events.flatMap(event => event.source ? [event.source] : [])],
    };
  }
  return {
    heading: data.name,
    lines: [
      `正式观星点 · ${data.region}`,
      data.address,
      ...(data.status === "TEMPORARILY_CLOSED" ? ["此观星点暂时关闭，请勿按旧信息进入。"] : []),
      `开放  ${data.opening || EMPTY_FIELD_VALUE}`,
      `进入  ${data.access || EMPTY_FIELD_VALUE}`,
      `安全  ${data.safety || EMPTY_FIELD_VALUE}`,
      `停车  ${data.parking || EMPTY_FIELD_VALUE}`,
      `视野  ${data.horizon || EMPTY_FIELD_VALUE}`,
    ],
    sources: [data.source],
  };
}

function wrap(text: string, maxWidth: number, fontSize: number): string[] {
  const advance = (char: string) => fontSize * (/\s/u.test(char) ? 0.35 : /[\x00-\x7f]/u.test(char) ? 0.68 : 1);
  const rows: string[] = [];
  for (const paragraph of text.split("\n")) {
    let row = "";
    let rowWidth = 0;
    for (const token of paragraph.match(/[A-Za-z0-9:/._-]+|\s+|./gu) ?? []) {
      const tokenWidth = [...token].reduce((sum, char) => sum + advance(char), 0);
      if (row && rowWidth + tokenWidth > maxWidth) {
        rows.push(row.trimEnd());
        row = "";
        rowWidth = 0;
      }
      if (!row && /^\s+$/u.test(token)) continue;
      if (tokenWidth > maxWidth) {
        for (const char of token) {
          const charWidth = advance(char);
          if (row && rowWidth + charWidth > maxWidth) {
            rows.push(row.trimEnd());
            row = "";
            rowWidth = 0;
          }
          row += char;
          rowWidth += charWidth;
        }
      } else {
        row += token;
        rowWidth += tokenWidth;
      }
    }
    rows.push(row.trimEnd());
  }
  return rows;
}

function posterLayout(data: PublicShare) {
  const content = posterLines(data);
  const contentWidth = WIDTH - 44;
  const heading = wrap(content.heading, contentWidth, 22);
  const body = content.lines.map(line => wrap(line, contentWidth, 13));
  const credits = content.sources.map(source => [
    ...wrap(`${source.attribution?.name || source.provider} · ${source.title}`, contentWidth, 11),
    ...(source.attribution?.statements.flatMap(statement => wrap(statement, contentWidth, 11)) ?? []),
    ...wrap(`许可：${source.license}`, contentWidth, 11),
    ...wrap(source.sourceUrl, contentWidth, 11),
  ]);
  const bodyTop = 83 + heading.length * 28 + 12;
  const divider = bodyTop + body.reduce((height, rows) => height + rows.length * 21 + 8, 0) + 8;
  const creditsTop = divider + 44;
  const height = creditsTop + credits.reduce((sum, rows) => sum + rows.length * 16 + 5, 0) + 28;
  return { heading, body, credits, bodyTop, divider, creditsTop, height };
}

const POSTER_COLORS: Record<DisplayMode, { background: string; accent: string; text: string; divider: string; muted: string }> = {
  DAY: { background: "#fffdf8", accent: "#4859b8", text: "#282b29", divider: "#d9dce7", muted: "#5c6473" },
  NIGHT: { background: "#07152b", accent: "#1677ff", text: "#edf5ff", divider: "#56779e", muted: "#a7bdd9" },
  OBSERVATION: { background: "#170000", accent: "#a63f3f", text: "#ff9b9b", divider: "#a63f3f", muted: "#e77474" },
};

function paint(data: PublicShare, mode: DisplayMode, onDrawn?: () => void) {
  const layout = posterLayout(data);
  const colors = POSTER_COLORS[mode];
  const ctx = Taro.createCanvasContext(ID);
  ctx.setFillStyle(colors.background);
  ctx.fillRect(0, 0, WIDTH, layout.height);
  ctx.setFillStyle(colors.accent);
  ctx.fillRect(0, 0, WIDTH, 8);
  ctx.setFillStyle(colors.text);
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
  ctx.setStrokeStyle(colors.divider);
  ctx.beginPath();
  ctx.moveTo(22, layout.divider);
  ctx.lineTo(WIDTH - 22, layout.divider);
  ctx.stroke();
  ctx.setFillStyle(colors.muted);
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
  const mode = useAppStore(state => state.mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"red-light-warning" | "permission" | "export" | null>(null);
  useEffect(() => { setError(null); Taro.nextTick(() => paint(data, mode)); }, [data, mode]);
  useDidShow(() => { Taro.nextTick(() => paint(data, useAppStore.getState().mode)); });

  const save = async (allowUnthemedHandoff = false) => {
    if (busy) return;
    if (mode === "OBSERVATION" && !allowUnthemedHandoff) {
      setError("red-light-warning");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("poster_draw_timeout")), 6000);
        paint(data, mode, () => {
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
    <Canvas key={mode} className="share-poster__canvas" canvasId={ID}
      style={{ height: `${posterLayout(data).height}px` }} />
    <Button className="share-poster__save" disabled={busy} onClick={() => void save()}>{busy ? "正在保存…" : "保存海报到相册"}</Button>
    {error === "red-light-warning" ? <View className="share-poster__handoff">
      <StatusPanel state="PARTIAL"
        detail="相册界面可能亮屏。微信相册授权及保存界面可能显示亮白色。可先取消，在设置中切换日间或夜间再保存。"
        recoveryLabel="仍要保存" onRecover={() => void save(true)} />
      <Button className="share-poster__cancel" onClick={() => setError(null)}>暂不保存</Button>
    </View> : null}
    {error === "permission" ? <StatusPanel state="ERROR" title="相册权限未开启"
      detail="请在微信设置中允许保存到相册，再返回重试。" recoveryLabel="打开设置"
      onRecover={() => void Taro.openSetting()} /> : null}
    {error === "export" ? <StatusPanel state="ERROR" title="海报暂时无法保存"
      detail="请稍后重试；开发者工具不代表真机相册能力。" recoveryLabel="重试保存"
      onRecover={() => void save()} /> : null}
  </View>;
}
