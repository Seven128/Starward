import { SelectionTabs } from "@/components/selection-tabs";
import { SPOT_DOCUMENT_CHAPTERS, type SpotDocumentChapter } from "./spot-document";
import "./spot-document.scss";

export function SpotDocumentTabs({ chapter, onSelect, label, className = "" }: {
  chapter: SpotDocumentChapter; onSelect(chapter: SpotDocumentChapter): void; label: string; className?: string;
}) {
  const index = SPOT_DOCUMENT_CHAPTERS.findIndex(([id]) => id === chapter);
  // The day styles preserve the adopted label spacing with actual 44px hit targets.
  return <SelectionTabs className={`formal-feedback-tabs ${className}`} items={SPOT_DOCUMENT_CHAPTERS.map(([id, text]) => ({ id, label: text }))}
    activeId={chapter} onSelect={onSelect} label={label} activeItemClassName="is-active" indicatorClassName="formal-feedback-tabs__line"
    indicatorStyle={{ left: `calc(var(--document-tab-start, 0px) + ${Math.max(0, index)} * var(--document-tab-step, 25%))`, width: "var(--document-tab-marker, 25%)" }} />;
}
