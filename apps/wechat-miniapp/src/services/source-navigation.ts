import Taro from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { readSourceReadingEnvelope, sourceReadingIdentity, sourceReadingIdentityMatches,
  SOURCE_READING_EVENT, SOURCE_READING_ROUTE, type SourceDocument } from "@/utils/source-document";

let navigating = false;

/** One native page handoff. Domain callers retain publication checks and resource ownership. */
export async function navigateToSource({ url, document }: { url: string; document?: SourceDocument }): Promise<void> {
  if (navigating) return;
  if (!/^\/(spot\/data-source|sky\/sources)\/index(?:\?|$)/u.test(url) || document && url !== SOURCE_READING_ROUTE) {
    throw new Error("source_route_invalid");
  }
  const envelope = document ? readSourceReadingEnvelope({ document, identity: sourceReadingIdentity(useAppStore.getState()) }) : null;
  if (document && !envelope) throw new Error("source_document_invalid");
  const opener = Taro.getCurrentPages().at(-1);
  if (!opener) throw new Error("source_opener_unavailable");
  navigating = true;
  try {
    // EventChannel belongs to this one native stack entry. No global document
    // registry, URL payload, persistent cache or retained React component.
    await Taro.navigateTo({ url, success: result => {
      if (envelope && sourceReadingIdentityMatches(envelope.identity, sourceReadingIdentity(useAppStore.getState()))) {
        result.eventChannel.emit(SOURCE_READING_EVENT, envelope);
      }
    } });
  } finally { navigating = false; }
}
