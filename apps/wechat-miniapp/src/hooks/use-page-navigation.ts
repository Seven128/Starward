import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { usePresentedPageLifecycle } from "@/navigation/page-presentation";

/** Pages own domain validity; this owner keeps navigation attempts and feedback current. */
export function usePageNavigation() {
  const [navigationError, setNavigationError] = useState(false);
  const life = useRef({ mounted: true, visible: true, next: 0, pending: 0 }).current;
  const retire = () => { life.next++; life.pending = 0; setNavigationError(false); };
  const presentation = usePresentedPageLifecycle({
    hide: () => { life.visible = false; life.pending = 0; setNavigationError(false); },
    show: () => { life.visible = true; setNavigationError(false); },
  });
  const latestPresentation = useRef(presentation); latestPresentation.current = presentation;
  useEffect(() => {
    life.mounted = true;
    return () => { life.mounted = false; life.next++; life.pending = 0; };
  }, []);
  const begin = ({ allowUnknownStack = false, valid = () => true }: {
    allowUnknownStack?: boolean; valid?: () => boolean;
  } = {}) => {
    if (!life.mounted || !life.visible || life.pending || !valid()) return;
    let stackReadError: unknown;
    const pages = () => { try { return Taro.getCurrentPages(); } catch (error) { stackReadError = error; return []; } };
    const stack = pages(), page = stack.at(-1);
    if (!page && !allowUnknownStack) { setNavigationError(true); return; }
    if (page && !latestPresentation.current.isCurrent()) return;
    const ticket = ++life.next;
    const identity = latestPresentation.current.identity();
    life.pending = ticket;
    setNavigationError(false);
    // An accepted handoff may complete after normal hide; new intent retires it.
    const completed = () => life.mounted && life.next === ticket && latestPresentation.current.identity() === identity && valid();
    const active = () => completed() && (page ? latestPresentation.current.isCurrent() : allowUnknownStack) &&
      life.visible && life.pending === ticket && pages().at(-1) === page;
    return { stack, stackReadError, completed, active,
      fail: () => { if (active()) setNavigationError(true); },
      release: () => { if (life.pending === ticket) life.pending = 0; } };
  };
  return { begin, retire, navigationError };
}
