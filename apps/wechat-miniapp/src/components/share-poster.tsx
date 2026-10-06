import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Canvas, Image, Text, View } from "@tarojs/components";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DisplayMode, PlanPublicShareData, SourceSummary, SpotPublicShareData } from "@starward/miniapp-contracts";
import { EMPTY_FIELD_VALUE, StatusPanel } from "./status-panel";
import { useAppStore } from "@/state/app-store";
import { displayZonedShareExpiry } from "@/utils/zoned-date";
import { planSpotRiskMessage } from "@/utils/public-share-copy";
import { createSharePosterOwner } from "./share-poster-owner";
import { createSharePosterFiles } from "./share-poster-files";
import { drawSharePoster, POSTER_WIDTH, POSTER_EXPORT_SCALE, type PosterPalette } from "./share-poster-drawing";
import "./share-poster.scss";

type PublicShare = PlanPublicShareData | SpotPublicShareData;
type PreviewImage = { canvasId: string; path: string; revision: number };
let canvasSequence = 0;
let posterFileSequence = 0;
const WIDTH = POSTER_WIDTH;

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
    for (const token of paragraph.match(/(?:\([A-Za-z0-9:/._-]+\)|（[A-Za-z0-9:/._-]+）)|[A-Za-z0-9:/._-]+|\s+|./gu) ?? []) {
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

const POSTER_COLORS: Record<DisplayMode, PosterPalette> = {
  DAY: { background: "#fffdf8", accent: "#4859b8", text: "#282b29", divider: "#d9dce7", muted: "#5c6473" },
  NIGHT: { background: "#07152b", accent: "#1677ff", text: "#edf5ff", divider: "#56779e", muted: "#a7bdd9" },
  OBSERVATION: { background: "#170000", accent: "#a63f3f", text: "#ff9b9b", divider: "#a63f3f", muted: "#e77474" },
};

export function SharePoster({ data }: { data: PublicShare }) {
  const mode = useAppStore(state => state.mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"red-light-warning" | "permission" | "export" | null>(null);
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [preview, setPreview] = useState<PreviewImage | null>(null);
  const currentPreview = useRef<PreviewImage | null>(null);
  const previewRevision = useRef(0);
  const content = useMemo(() => ({ data, mode }), [data, mode]);
  const committedContent = useRef<typeof content | null>(null);
  // Each snapshot has its own native node: a late command from an expired
  // instance/theme cannot target the fixed ID of a newly mounted poster.
  const frame = useMemo(() => ({ ...content, canvasId: `public-share-poster-2d-live-${++canvasSequence}`,
    canvas: null as Taro.Canvas | null, previewImage: null as string | null }), [content, canvasRevision]);
  const currentCanvasId = useRef(frame.canvasId);
  useLayoutEffect(() => { currentCanvasId.current = frame.canvasId; }, [frame.canvasId]);
  const owner = useMemo(() => {
    const files = createSharePosterFiles<typeof frame>({ export: async value => {
      if (!value.canvas) throw new Error("poster_canvas_unavailable");
      const width = WIDTH * POSTER_EXPORT_SCALE, height = posterLayout(value.data).height * POSTER_EXPORT_SCALE;
      const temporary = (await Taro.canvasToTempFilePath({ canvas: value.canvas, fileType: "png",
        x: 0, y: 0, width, height, destWidth: width, destHeight: height })).tempFilePath;
      // SDK temporary files cannot be unlinked. Transfer this acquisition to
      // its own writable path, including late results that must be retired.
      const filePath = `${Taro.env.USER_DATA_PATH}/starward-share-poster-${Date.now()}-${++posterFileSequence}.png`;
      return new Promise<string>((resolve, reject) => {
        const manager = Taro.getFileSystemManager();
        manager.saveFile({ tempFilePath: temporary, filePath,
          success: result => resolve(result.savedFilePath),
          fail: cause => {
            // Only this newly allocated destination can contain a partial
            // transfer. Wait for its cleanup before releasing the file queue.
            try { manager.unlink({ filePath, complete: () => reject(cause) }); }
            catch { reject(cause); }
          } });
      });
    }, remove: image => new Promise<void>((resolve, reject) => {
      try { Taro.getFileSystemManager().unlink({ filePath: image, success: () => resolve(), fail: reject }); }
      catch (cause) { reject(cause); }
    }) });
    const presentImage = (value: typeof frame, image: string) => {
      files.retain(image);
      const previous = value.previewImage;
      value.previewImage = image;
      const next = { canvasId: value.canvasId, path: image, revision: ++previewRevision.current };
      currentPreview.current = next;
      setPreview(next);
      if (previous) files.release(previous);
    };
    return createSharePosterOwner<typeof frame>({
    nextTick: callback => Taro.nextTick(callback),
    draw: (value, done, fail, current) => {
      const paint = (canvas: Taro.Canvas) => {
        if (!current()) return;
        try {
          drawSharePoster(canvas, posterLayout(value.data), POSTER_COLORS[value.mode]);
          value.canvas = canvas;
          done();
        } catch (cause) { fail(cause); }
      };
      if (value.canvas) { paint(value.canvas); return; }
      Taro.createSelectorQuery().select(`#${value.canvasId}`).node(result => {
        if (!current()) return;
        if (!result?.node || typeof result.node.getContext !== "function" ||
          typeof result.node.width !== "number" || typeof result.node.height !== "number") {
          fail(new Error("poster_canvas_unavailable"));
          return;
        }
        paint(result.node as Taro.Canvas);
      }).exec();
    },
    preview: async (value, current) => {
      const image = await files.export(value, current);
      try { if (current()) presentImage(value, image); }
      finally { files.release(image); }
    },
    presentImage,
    releasePreview: value => {
      if (currentPreview.current?.canvasId === value.canvasId) currentPreview.current = null;
      if (value.previewImage) { files.release(value.previewImage); value.previewImage = null; }
    },
    export: (value, current) => files.export(value, current),
    releaseImage: image => files.release(image),
    save: image => Taro.saveImageToPhotosAlbum({ filePath: image }),
    albumFailure: async () => {
      const settings = await Taro.getSetting().catch(() => null);
      return settings?.authSetting?.["scope.writePhotosAlbum"] === false ? "permission" : "export";
    },
    retire: () => setCanvasRevision(value => value + 1),
    busy: setBusy,
    error: setError,
    saved: () => useAppStore.getState().notify({ owner: "share-poster", placement: "floating", tone: "success",
      title: "海报已保存", body: "可在相册查看公开分享海报。", dedupeKey: "share-poster-saved" }),
    });
  }, []);
  useLayoutEffect(() => { setError(null); }, [data, mode]);
  useLayoutEffect(() => {
    const contentChanged = committedContent.current !== content;
    committedContent.current = content;
    owner.update(frame, contentChanged);
  }, [owner, frame, content]);
  useLayoutEffect(() => () => owner.dispose(), [owner]);
  useDidShow(() => owner.show());
  useDidHide(() => owner.hide());

  const save = async (allowUnthemedHandoff = false) => {
    if (busy) return;
    if (mode === "OBSERVATION" && !allowUnthemedHandoff) {
      setError("red-light-warning");
      return;
    }
    setError(null);
    await owner.save();
  };

  return <View className="share-poster">
    <Text className="type-section">分享海报</Text>
    <View id={`${frame.canvasId}-slot`} className="share-poster__canvas-slot"
      style={{ height: `${posterLayout(data).height}px` }}>
      <Canvas key={frame.canvasId} id={frame.canvasId} type="2d" className="share-poster__canvas" />
      {preview?.canvasId === frame.canvasId ? <Image key={`${frame.canvasId}:${preview.revision}`} src={preview.path} mode="aspectFit"
        className="share-poster__preview" aria-label="公开分享海报预览" onError={() => {
          if (currentCanvasId.current === frame.canvasId && currentPreview.current === preview) {
            currentPreview.current = null; setPreview(null); setError("export");
          }
        }} /> : null}
    </View>
    <Button className="soft-button focus-ring share-poster__save" disabled={busy} onClick={() => void save()}>{busy ? "正在保存…" : "保存海报到相册"}</Button>
    {error === "red-light-warning" ? <View className="share-poster__handoff">
      <StatusPanel state="PARTIAL"
        detail="相册界面可能亮屏。微信相册授权及保存界面可能显示亮白色。可先取消，在设置中切换日间或夜间再保存。"
        recoveryLabel="仍要保存" onRecover={() => void save(true)} />
      <Button className="soft-button focus-ring share-poster__cancel" onClick={() => setError(null)}>暂不保存</Button>
    </View> : null}
    {error === "permission" ? <StatusPanel state="ERROR" title="相册权限未开启"
      detail="请在微信设置中允许保存到相册，再返回重试。" recoveryLabel="打开设置"
      onRecover={() => void Taro.openSetting()} /> : null}
    {error === "export" ? <StatusPanel state="ERROR" title="海报暂时无法保存"
      detail="请稍后重试；开发者工具不代表真机相册能力。" recoveryLabel="重试保存"
      onRecover={() => void save()} /> : null}
  </View>;
}
