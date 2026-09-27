import Taro from "@tarojs/taro";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SpotDocumentChapter } from "./spot-document";
import { createDocumentScrollTracker, type DocumentGeometry } from "./spot-document-navigation";

/** Shared four-chapter document navigation; record-list scroll remains separate. */
export function useSpotDocumentNavigation(selector: string, enabled: boolean) {
  const [chapter, setChapter] = useState<SpotDocumentChapter>("place");
  const [anchor, setAnchor] = useState("");
  const tracker = useRef<ReturnType<typeof createDocumentScrollTracker> | null>(null);
  const jumpVersion = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const current = createDocumentScrollTracker(done => {
      try {
        const query = Taro.createSelectorQuery();
        query.select(selector).boundingClientRect();
        query.selectAll(`${selector} .formal-feedback-section`).boundingClientRect();
        query.select(`${selector} .spot-document-scroll-content`).boundingClientRect();
        query.exec(rows => {
          const viewport = rows[0], sections = rows[1], content = rows[2];
          done(viewport && content && Array.isArray(sections) ? { viewport, sections, content } as DocumentGeometry : null);
        });
      } catch { done(null); }
    }, setChapter);
    tracker.current = current;
    Taro.nextTick(() => current.request());
    return () => { current.dispose(); tracker.current = null; jumpVersion.current++; };
  }, [enabled, selector]);
  // Rendered validation, media and input changes can move chapter boundaries
  // without a scroll event. Share the same bounded native measurement queue.
  useEffect(() => { Taro.nextTick(() => tracker.current?.request()); });
  const scrollTo = useCallback((id: string) => {
    const version = ++jumpVersion.current;
    setAnchor("");
    Taro.nextTick(() => { if (version === jumpVersion.current && tracker.current) setAnchor(id); });
  }, []);
  const jump = useCallback((next: SpotDocumentChapter) => {
    setChapter(next);
    scrollTo(`formal-feedback-${next}`);
  }, [scrollTo]);
  const onScroll = useCallback(() => tracker.current?.request(), []);
  return { chapter, anchor, jump, scrollTo, onScroll };
}
