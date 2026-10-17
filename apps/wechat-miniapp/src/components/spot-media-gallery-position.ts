import { useCallback, useEffect, useRef, useState } from "react";
import { photoRevealLeft } from "./spot-media-gallery-geometry";

/** An explicit viewer/route return command must not replay every native scroll event. */
export function useSpotMediaDocumentPosition(identity: string) {
  const position = useRef({ identity, top: 0 });
  const [returnTop, setReturnTop] = useState<number | undefined>(undefined);
  useEffect(() => {
    position.current = { identity, top: 0 };
    setReturnTop(undefined);
  }, [identity]);
  const record = useCallback((top: number) => {
    if (position.current.identity === identity && Number.isFinite(top) && top >= 0) position.current = { identity, top };
  }, [identity]);
  const remember = useCallback(() => {
    if (position.current.identity === identity) setReturnTop(position.current.top);
  }, [identity]);
  return { position, returnTop, setReturnTop, record, remember };
}

/** Keep the native horizontal ScrollView at its source crop while a photo viewer is open. */
export function useSpotMediaGalleryPosition(identity: string) {
  const [returnLeft, setReturnLeft] = useState(0);
  const liveLeft = useRef(0);

  useEffect(() => {
    liveLeft.current = 0;
    setReturnLeft(0);
  }, [identity]);

  const onScroll = useCallback((event: { detail: { scrollLeft: number } }) => {
    if (Number.isFinite(event.detail.scrollLeft)) liveLeft.current = Math.max(0, event.detail.scrollLeft);
  }, []);
  const remember = useCallback(() => setReturnLeft(liveLeft.current), []);

  const reveal = useCallback((index: number, count: number, width: number) => {
    const left = photoRevealLeft(index, count, width);
    if (left === null) return;
    liveLeft.current = left;
    setReturnLeft(left);
  }, []);

  return { returnLeft, onScroll, remember, reveal };
}
