import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";

/** Pages own domain validity; this owner keeps navigation attempts and feedback current. */
export function usePageNavigation() {
  const [navigationError, setNavigationError] = useState(false);
  const life = useRef({ mounted: true, visible: true, next: 0, pending: 0 }).current;
  const retire = () => { life.next++; life.pending = 0; setNavigationError(false); };
  useDidHide(() => { life.visible = false; life.pending = 0; setNavigationError(false); });
  useDidShow(() => { life.visible = true; setNavigationError(false); });
  useEffect(() => {
    life.mounted = true;
    return () => { life.mounted = false; life.next++; life.pending = 0; };
  }, []);
  const begin = ({ allowUnknownStack = false, valid = () => true }: {
    allowUnknownStack?: boolean; valid?: () => boolean;
  } = {}) => {
    if (!life.mounted || !life.visible || life.pending || !valid()) return;
    const pages = () => { try { return Taro.getCurrentPages(); } catch { return []; } };
    const stack = pages(), page = stack.at(-1);
    if (!page && !allowUnknownStack) { setNavigationError(true); return; }
    const ticket = ++life.next;
    life.pending = ticket;
    setNavigationError(false);
    // An accepted handoff may complete after normal hide; new intent retires it.
    const completed = () => life.mounted && life.next === ticket && valid();
    const active = () => completed() && life.visible && life.pending === ticket && pages().at(-1) === page;
    return { stack, completed, active,
      fail: () => { if (active()) setNavigationError(true); },
      release: () => { if (life.pending === ticket) life.pending = 0; } };
  };
  return { begin, retire, navigationError };
}
