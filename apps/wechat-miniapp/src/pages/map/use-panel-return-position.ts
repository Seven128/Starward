import { useEffect, useRef } from "react";
import Taro from "@tarojs/taro";
import { useSpotMediaDocumentPosition, useSpotMediaGalleryPosition } from "@/components/spot-media-gallery-position";
import type { MapPanelReturnPosition } from "./sky-return-state";

type ReadingBlock = { id: string; top: number; height: number };
type ReadingLayout = { scrollId: string; inset: number; revision: object };
type ReadingObservation = { top: number; blocks: ReadingBlock[]; node?: Taro.ScrollViewContext };

/** Absolute document coordinates stay usable between native measurements. */
export function readingAnchorAt(blocks: ReadingBlock[], top: number, inset: number) {
  const line = top + inset;
  const block = blocks.find(item => item.top + item.height > line) ?? blocks.at(-1);
  return block ? { id: block.id, offset: block.top - top } : undefined;
}

/** Own native scroll restoration for both a remounted and a hidden retained panel. */
export function usePanelReturnPosition(identity: string, galleryIdentity: string, {
  restorePosition, onPositionChange, ready, visible = true, layout,
}: {
  restorePosition?: MapPanelReturnPosition | null | undefined;
  onPositionChange?: ((position: MapPanelReturnPosition) => void) | undefined;
  ready: boolean;
  visible?: boolean;
  layout?: ReadingLayout;
}) {
  const document = useSpotMediaDocumentPosition(identity);
  const gallery = useSpotMediaGalleryPosition(galleryIdentity);
  const pending = useRef(restorePosition?.identity === identity ? restorePosition : null);
  const current = useRef<MapPanelReturnPosition>({ identity, top: pending.current?.top ?? 0,
    galleryIdentity, left: pending.current?.galleryIdentity === galleryIdentity ? pending.current.left : 0 });
  const documentIdentity = useRef(identity);
  const mediaIdentity = useRef(galleryIdentity);
  const visibility = useRef(visible);
  const epoch = useRef(0);
  const documentAcknowledgement = useRef<number | null>(null);
  const galleryAcknowledgement = useRef<number | null>(null);
  const blocks = useRef<ReadingBlock[]>([]);
  const readingReturn = useRef(pending.current);
  const measurement = useRef(0);
  const pendingReads = useRef(new Set<() => void>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  if (documentIdentity.current !== identity) {
    epoch.current++;
    documentIdentity.current = identity;
    pending.current = null;
    documentAcknowledgement.current = null;
    galleryAcknowledgement.current = null;
    current.current = { identity, top: 0, galleryIdentity, left: 0 };
    blocks.current = [];
    readingReturn.current = null;
  }
  if (mediaIdentity.current !== galleryIdentity) {
    epoch.current++;
    mediaIdentity.current = galleryIdentity;
    current.current = { ...current.current, galleryIdentity, left: 0 };
  }
  if (visibility.current !== visible) {
    epoch.current++;
    if (!visible) {
      pending.current = { ...current.current };
      readingReturn.current = pending.current;
    }
    documentAcknowledgement.current = null;
    galleryAcknowledgement.current = null;
  }
  visibility.current = visible;
  const renderedEpoch = epoch.current;
  useEffect(() => {
    if (!visible) pendingReads.current.forEach(cancel => cancel());
    return () => { measurement.current++; pendingReads.current.forEach(cancel => cancel()); };
  }, [visible]);
  const observe = (onCancel?: (cancel: () => void) => void): Promise<ReadingObservation | null> => {
    if (!mounted.current || !layout || !ready || !visibility.current) return Promise.resolve(null);
    const queryEpoch = epoch.current;
    return new Promise(resolve => {
      let finished = false;
      const finish = (value: ReadingObservation | null) => {
        if (finished) return;
        finished = true; clearTimeout(timer); pendingReads.current.delete(cancel); resolve(value);
      };
      const cancel = () => finish(null);
      // A missing native callback must not hold the source button indefinitely.
      const timer = setTimeout(cancel, 1000);
      pendingReads.current.add(cancel);
      onCancel?.(cancel);
      Taro.nextTick(() => {
        if (finished || !mounted.current || queryEpoch !== epoch.current || !visibility.current) { cancel(); return; }
        try {
          const query = Taro.createSelectorQuery();
          query.select(`#${layout.scrollId}`).boundingClientRect();
          query.select(`#${layout.scrollId}`).scrollOffset();
          query.selectAll(`#${layout.scrollId} .panel-reading-anchor`).boundingClientRect();
          query.select(`#${layout.scrollId}`).node();
          query.exec(results => {
            if (!mounted.current || queryEpoch !== epoch.current || !visibility.current) { cancel(); return; }
            const [viewport, scroll, rects, context] = results as [{ top?: number } | null, { scrollTop?: number } | null,
              { id?: string; top?: number; height?: number }[] | null, { node?: Taro.ScrollViewContext } | null];
            if (!Number.isFinite(viewport?.top) || !Number.isFinite(scroll?.scrollTop) || !Array.isArray(rects)) { cancel(); return; }
            finish({ top: scroll!.scrollTop!, blocks: rects.filter(rect => typeof rect.id === "string" && Number.isFinite(rect.top) && Number.isFinite(rect.height) && rect.height! > 0)
              .map(rect => ({ id: rect.id!, top: rect.top! - viewport!.top! + scroll!.scrollTop!, height: rect.height! }))
              .sort((a, b) => a.top - b.top), ...(context?.node ? { node: context.node } : {}) });
          });
        } catch { cancel(); }
      });
    });
  };
  useEffect(() => {
    // Withdraw a previous command so the same offset is issued again on return.
    if (!visible) document.setReturnTop(undefined);
  }, [visible]);
  useEffect(() => {
    const restored = pending.current;
    if (!restored || restored.identity !== identity || !ready || !visible) return;
    // Wait for the actual panel content, not a fixed delay that can scroll an
    // empty placeholder. Later native events own the position again.
    // A retained document can rebuild preceding content after show. Its anchor
    // is restored from actual geometry, rather than acknowledging an early top.
    if (!layout || !restored.anchor) {
      pending.current = null;
      documentAcknowledgement.current = restored.top;
      document.record(restored.top);
      document.setReturnTop(restored.top);
    }
    const left = restored.galleryIdentity === galleryIdentity ? restored.left : 0;
    galleryAcknowledgement.current = left;
    gallery.onScroll({ detail: { scrollLeft: left } });
    gallery.remember();
    current.current = { identity, top: restored.top, galleryIdentity, left, ...(restored.anchor ? { anchor: restored.anchor } : {}) };
    onPositionChange?.(current.current);
  }, [identity, galleryIdentity, ready, visible]);
  useEffect(() => {
    const ticket = ++measurement.current, queryEpoch = epoch.current;
    if (!layout || !ready || !visible) return;
    let retired = false;
    let cancel = () => {};
    // One observation per actual layout version or scroll rest, never per frame.
    void observe(stop => { cancel = stop; }).then(observation => {
        if (!observation || retired || !mounted.current || ticket !== measurement.current || queryEpoch !== epoch.current || !visibility.current) return;
        blocks.current = observation.blocks;
        const saved = readingReturn.current;
        const block = saved?.anchor ? blocks.current.find(item => item.id === saved.anchor!.id) : undefined;
        if (saved?.identity === identity && block && saved.anchor) {
          const top = Math.max(0, block.top - saved.anchor.offset);
          pending.current = null;
          documentAcknowledgement.current = top;
          document.record(top);
          document.setReturnTop(top);
          // enhanced ScrollView's public command also applies an unchanged prop
          // after native layout moved it; no fake offset or prop withdrawal.
          if (Math.abs(observation.top - top) >= 1 && typeof observation.node?.scrollTo === "function") {
            try { observation.node.scrollTo({ top, animated: false }); } catch { /* prop remains the fallback */ }
          }
          current.current = { ...current.current, top, anchor: saved.anchor };
        } else if (pending.current) {
          // A removed content block falls back to the original numeric position.
          const top = pending.current.top;
          pending.current = null;
          documentAcknowledgement.current = top;
          document.record(top); document.setReturnTop(top);
        } else if (!saved) {
          const anchor = readingAnchorAt(blocks.current, current.current.top, layout.inset);
          current.current = { ...current.current, ...(anchor ? { anchor } : {}) };
        }
        onPositionChange?.(current.current);
    });
    return () => { retired = true; cancel(); };
  }, [identity, ready, visible, layout?.scrollId, layout?.revision]);
  const takeOver = () => {
    if (!mounted.current || !visibility.current || epoch.current !== renderedEpoch) return;
    pending.current = null;
    documentAcknowledgement.current = null;
    galleryAcknowledgement.current = null;
    readingReturn.current = null;
    measurement.current++;
    pendingReads.current.forEach(cancel => cancel());
    // Keep the last native prop: withdrawing scrollTop on ordinary touches
    // resets this WEAPP ScrollView to zero. A new explicit anchor owns that change.
  };
  return {
    document: { ...document, takeOver, async prepareSourceNavigation(anchorId?: string) {
      const queryEpoch = epoch.current, ticket = measurement.current;
      const observation = await observe();
      if (!mounted.current || !visibility.current || queryEpoch !== epoch.current || ticket !== measurement.current) return false;
      if (!observation || !layout) return true;
      blocks.current = observation.blocks;
      const entrance = observation.blocks.find(block => block.id === anchorId);
      const anchor = entrance ? { id: entrance.id, offset: entrance.top - observation.top }
        : readingAnchorAt(observation.blocks, observation.top, layout.inset);
      // Both the native top and rects belong to this same observation batch.
      current.current = { ...current.current, top: observation.top, ...(anchor ? { anchor } : {}) };
      onPositionChange?.(current.current);
      return true;
    }, record(top: number) {
      if (!mounted.current || !visibility.current || epoch.current !== renderedEpoch || current.current.identity !== identity || !Number.isFinite(top) || top < 0 || pending.current) return false;
      // Native offsets can round to a whole logical pixel. Other layout events
      // cannot acknowledge a restoration; a real touch may take over immediately.
      if (documentAcknowledgement.current !== null && Math.abs(top - documentAcknowledgement.current) >= 1) return false;
      documentAcknowledgement.current = null;
      document.record(top);
      const anchor = !readingReturn.current && layout ? readingAnchorAt(blocks.current, top, layout.inset) : current.current.anchor;
      current.current = { ...current.current, top, ...(anchor ? { anchor } : {}) };
      onPositionChange?.(current.current);
      return true;
    } },
    gallery: { ...gallery, returnLeft: visible ? gallery.returnLeft : undefined, takeOver, onScroll(event: { detail: { scrollLeft: number } }) {
      if (!mounted.current || !visibility.current || epoch.current !== renderedEpoch || current.current.galleryIdentity !== galleryIdentity || !Number.isFinite(event.detail.scrollLeft) || pending.current) return false;
      if (galleryAcknowledgement.current !== null && Math.abs(event.detail.scrollLeft - galleryAcknowledgement.current) >= 1) return false;
      galleryAcknowledgement.current = null;
      gallery.onScroll(event);
      current.current = { ...current.current, left: Math.max(0, event.detail.scrollLeft) };
      onPositionChange?.(current.current);
      return true;
    } },
  };
}
