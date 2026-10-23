import type { SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource } from "@/utils/source-presentation";
import type { SourceSection } from "@/utils/source-document";
import { SourceButton } from "./source-button";

/** Current source facts enter the native reader; mandatory short credits stay by the data. */
export function SourceEntry({ id, label, sources, subtitle, sections }: {
  id: string; label: string; sources: readonly SourceSummary[]; subtitle?: string; sections?: readonly SourceSection[];
}) {
  const records = sources.filter(isProductSource);
  if (!records.length && !sections?.length) return null;
  return <SourceButton id={id} label={label} document={{ title: label, sources: records,
    ...(subtitle === undefined ? {} : { subtitle }), ...(sections === undefined ? {} : { sections }) }} />;
}
