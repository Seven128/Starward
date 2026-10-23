import Taro, { useDidHide, useLoad } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/state/app-store";
import { readSourceReadingEnvelope, sourceReadingIdentity, sourceReadingIdentityMatches,
  SOURCE_READING_EVENT, type SourceReadingEnvelope } from "@/utils/source-document";
import { SourcePage } from "@/components/source-page";
import { SourceDocumentContent } from "@/components/source-document-content";
import { StatusPanel } from "@/components/status-panel";

/** Single native EventChannel, visible-page lifetime, no persisted or cross-page registry. */
export function SourceDocumentReadingPage() {
  const [reading, setReading] = useState<SourceReadingEnvelope | null>(null);
  const [received, setReceived] = useState(false);
  const life = useRef({ mounted: true, retired: false, channel: null as Taro.EventChannel | null });
  const current = useAppStore(state => JSON.stringify(sourceReadingIdentity(state)));
  const clear = () => { life.current.retired = true; setReading(null); setReceived(true); };
  const receive = (value: unknown) => {
    if (!life.current.mounted || life.current.retired) return;
    const result = readSourceReadingEnvelope(value);
    setReading(result && sourceReadingIdentityMatches(result.identity, sourceReadingIdentity(useAppStore.getState())) ? result : null);
    setReceived(true);
  };
  useLoad(() => {
    const page = Taro.getCurrentPages().at(-1);
    const channel = page?.getOpenerEventChannel?.() as Taro.EventChannel | undefined;
    life.current.channel = channel ?? null;
    if (channel?.once) channel.once(SOURCE_READING_EVENT, receive);
    else setReceived(true);
  });
  useDidHide(clear);
  useEffect(() => () => {
    life.current.mounted = false; life.current.retired = true;
    life.current.channel?.off?.(SOURCE_READING_EVENT, receive);
    life.current.channel = null;
  }, []);
  const valid = reading && sourceReadingIdentityMatches(reading.identity, JSON.parse(current));
  useEffect(() => { if (reading && !valid) clear(); }, [reading, valid]);
  return <SourcePage title={valid ? reading.document.title : "来源"} {...(valid && reading.document.subtitle !== undefined ? { subtitle: reading.document.subtitle } : {})}>
    {valid ? <SourceDocumentContent document={reading.document} /> : <StatusPanel state={received ? "ERROR" : "EMPTY"}
      title="来源入口已失效" detail="请返回原页面，从当前资料的来源按钮重新打开。" />}
  </SourcePage>;
}
