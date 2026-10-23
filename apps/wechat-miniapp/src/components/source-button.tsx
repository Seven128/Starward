import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { navigateToSource } from "@/services/source-navigation";
import { SOURCE_READING_ROUTE, sourceReadingIdentity, sourceReadingIdentityMatches, type SourceDocument } from "@/utils/source-document";
import { SemanticIcon } from "./semantic-asset";
import { SharedButton } from "./shared-button-press";
import "./source-button.scss";

/** A containing document may checkpoint its position; false quietly cancels a superseded intent. */
export const SourceNavigationPreparation = createContext<((anchorId?: string) => Promise<boolean | void>) | null>(null);

type SourceAction =
  | { document: SourceDocument; route?: never; onOpen?: never }
  | { route: string; document?: never; onOpen?: never }
  | { onOpen: () => void | Promise<unknown>; document?: never; route?: never };

/** All source entrances share this button; a domain port may guard its own edition/lifecycle. */
export function SourceButton(props: SourceAction & { id?: string | undefined; label?: string | undefined; className?: string | undefined; disabled?: boolean | undefined }) {
  const prepare = useContext(SourceNavigationPreparation);
  const life = useRef({ active: true, mounted: true, pending: false }).current;
  const [opening, setOpening] = useState(false);
  useDidHide(() => { life.active = false; });
  useDidShow(() => { life.active = true; });
  useEffect(() => { life.mounted = true; return () => { life.mounted = false; life.active = false; }; }, [life]);
  const open = async () => {
    if (!life.active || !life.mounted || life.pending || props.disabled) return;
    life.pending = true; setOpening(true);
    try {
      const identity = sourceReadingIdentity(useAppStore.getState());
      const prepared = await prepare?.(props.id);
      if (prepared === false || !life.active || !life.mounted) return;
      if (!sourceReadingIdentityMatches(identity, sourceReadingIdentity(useAppStore.getState()))) throw new Error("source_context_changed");
      if (props.onOpen) await props.onOpen();
      else if (props.document) await navigateToSource({ url: SOURCE_READING_ROUTE, document: props.document });
      else await navigateToSource({ url: props.route! });
    } catch {
      if (life.mounted && life.active) useAppStore.getState().notify({ owner: "source-navigation", placement: "floating", tone: "error",
        title: "来源暂未打开", body: "当前资料已保留，请重试。", dedupeKey: props.id ?? "source-open" });
    } finally { life.pending = false; if (life.mounted) setOpening(false); }
  };
  return <SharedButton {...(props.id === undefined ? {} : { id: props.id, "data-control": props.id })} className={`source-button focus-ring${props.id ? " panel-reading-anchor" : ""} ${props.className ?? ""}`}
    pressVariant="icon" ariaLabel={props.label ?? "来源"} disabled={props.disabled || opening} aria-busy={opening}
    onClick={() => void open()}><SemanticIcon className="shared-button-press__icon" name="source" /></SharedButton>;
}
