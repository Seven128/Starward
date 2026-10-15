import { useDidHide, useDidShow } from "@tarojs/taro";
import type { FacilityType, RepresentativeMedia, SpotDetail } from "@starward/miniapp-contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { PHOTO_VIEWER_HANDOFF, useRedLightHandoff } from "@/components/red-light-handoff";
import { SpotImageViewer } from "@/components/spot-image-viewer";
import { useSpotMediaDocumentPosition } from "@/components/spot-media-gallery-position";
import { facilityPhotos } from "@/utils/spot-media";
import { FACILITY_LABEL } from "@/utils/facility-presentation";
import { mediaSource } from "@/utils/media-source";

/** Reading pages share facility albums, their photo return position and native Back. */
export function useFacilityGallery({ identity, name, media, formalMedia, enabled }: {
  identity: string;
  name: string;
  media: readonly RepresentativeMedia[];
  formalMedia: SpotDetail["formalMedia"];
  enabled: boolean;
}) {
  const position = useSpotMediaDocumentPosition(identity);
  const handoff = useRedLightHandoff({ nativeBackBoundary: false, title: PHOTO_VIEWER_HANDOFF.title });
  const [selection, setSelection] = useState<{ scope: string; type: FacilityType; source: string } | null>(null);
  const [index, setIndex] = useState(0);
  const life = useRef({ alive: true, active: true, intent: 0 });
  const closeViewer = useRef<(() => void) | null>(null);
  const allowed = useRef(enabled); allowed.current = enabled;
  const scope = JSON.stringify([identity, formalMedia, media.map(item => [item.id, item.localPath, item.thumbnailPath, item.license, item.state, item.isSiteSpecific])]);
  const currentScope = useRef(scope); currentScope.current = scope;
  useDidShow(() => { life.current.active = true; });
  useDidHide(() => { life.current.active = false; life.current.intent++; position.remember(); setSelection(null); });
  useEffect(() => { life.current.alive = true; return () => { life.current.alive = false; life.current.intent++; }; }, []);
  useEffect(() => { life.current.intent++; setSelection(null); }, [scope]);
  useEffect(() => { if (!enabled) { life.current.intent++; setSelection(null); } }, [enabled]);
  const photos = (type: FacilityType) => facilityPhotos(type, media, formalMedia, __MINIAPP_DEVELOPMENT_FIXTURE_MODE__);
  const open = (type: FacilityType, source: string) => {
    if (!allowed.current || !life.current.active || !life.current.alive || !photos(type).length) return;
    const ticket = ++life.current.intent, requestedScope = currentScope.current;
    position.remember();
    void handoff.confirm(PHOTO_VIEWER_HANDOFF.detail).then(accepted => {
      if (!accepted || !life.current.alive || !life.current.active || !allowed.current ||
        life.current.intent !== ticket || currentScope.current !== requestedScope) return;
      setIndex(0); setSelection({ scope: requestedScope, type, source });
    });
  };
  const items = selection?.scope === scope && enabled ? photos(selection.type) : [];
  const visible = Boolean(selection && items[index]);
  const backHandler = useCallback((handler: (() => void) | null) => { closeViewer.current = handler; }, []);
  const view = <>
    <NativeBackBoundary active={handoff.active || visible} onBack={() => {
      if (handoff.active) handoff.cancel();
      else if (closeViewer.current) closeViewer.current();
      else setSelection(null);
    }} />
    {handoff.warning}
    {visible && selection ? <SpotImageViewer key={`${selection.scope}:${selection.type}`} name={`${name} · ${FACILITY_LABEL[selection.type]}`}
      sourceSelector={selection.source} index={index} onIndexChange={setIndex} onClose={() => setSelection(null)} onBackHandlerChange={backHandler}
      media={items.map(item => ({ id: item.id, src: mediaSource(item.localPath || item.thumbnailPath), alt: item.alt || FACILITY_LABEL[selection.type],
        caption: item.caption || item.alt || "设施照片", attribution: `${item.photographer || "来源未注明"} · ${item.license}`, state: "ready" }))} /> : null}
  </>;
  return { photos, open, view, visible, returnTop: position.returnTop, record: position.record };
}
