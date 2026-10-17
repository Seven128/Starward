import { useEffect, useRef } from "react";
import { useSpotMediaDocumentPosition, useSpotMediaGalleryPosition } from "@/components/spot-media-gallery-position";
import type { MapPanelReturnPosition } from "./sky-return-state";

/** Rehydrate the two native scroll commands without retaining a mounted panel. */
export function usePanelReturnPosition(identity: string, galleryIdentity: string, {
  restorePosition, onPositionChange, ready,
}: {
  restorePosition?: MapPanelReturnPosition | null | undefined;
  onPositionChange?: ((position: MapPanelReturnPosition) => void) | undefined;
  ready: boolean;
}) {
  const document = useSpotMediaDocumentPosition(identity);
  const gallery = useSpotMediaGalleryPosition(galleryIdentity);
  const pending = useRef(restorePosition?.identity === identity ? restorePosition : null);
  const current = useRef<MapPanelReturnPosition>({ identity, top: pending.current?.top ?? 0,
    galleryIdentity, left: pending.current?.galleryIdentity === galleryIdentity ? pending.current.left : 0 });
  const documentIdentity = useRef(identity);
  const mediaIdentity = useRef(galleryIdentity);
  if (documentIdentity.current !== identity) {
    documentIdentity.current = identity;
    pending.current = null;
    current.current = { identity, top: 0, galleryIdentity, left: 0 };
  }
  if (mediaIdentity.current !== galleryIdentity) {
    mediaIdentity.current = galleryIdentity;
    current.current = { ...current.current, galleryIdentity, left: 0 };
  }
  useEffect(() => {
    const restored = pending.current;
    if (!restored || restored.identity !== identity || !ready) return;
    // Wait for the actual panel content, not a fixed delay that can scroll an
    // empty placeholder. Later native events own the position again.
    pending.current = null;
    document.record(restored.top);
    document.setReturnTop(restored.top);
    const left = restored.galleryIdentity === galleryIdentity ? restored.left : 0;
    gallery.onScroll({ detail: { scrollLeft: left } });
    gallery.remember();
    current.current = { identity, top: restored.top, galleryIdentity, left };
    onPositionChange?.(current.current);
  }, [identity, galleryIdentity, ready]);
  return {
    document: { ...document, record(top: number) {
      if (current.current.identity !== identity || !Number.isFinite(top) || top < 0 || pending.current) return;
      document.record(top);
      current.current = { ...current.current, top };
      onPositionChange?.(current.current);
    } },
    gallery: { ...gallery, onScroll(event: { detail: { scrollLeft: number } }) {
      if (current.current.galleryIdentity !== galleryIdentity || !Number.isFinite(event.detail.scrollLeft) || pending.current) return;
      gallery.onScroll(event);
      current.current = { ...current.current, left: Math.max(0, event.detail.scrollLeft) };
      onPositionChange?.(current.current);
    } },
  };
}
