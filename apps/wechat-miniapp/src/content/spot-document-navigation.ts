import { SPOT_DOCUMENT_CHAPTERS, type SpotDocumentChapter } from "./spot-document";

export interface DocumentGeometry {
  viewport: { top: number; height: number };
  content: { top: number; height: number };
  sections: readonly { id: string; top: number }[];
}

export function visibleDocumentChapter(geometry: DocumentGeometry): SpotDocumentChapter | null {
  const { viewport, content, sections } = geometry;
  if (!Number.isFinite(viewport.top) || !(viewport.height > 0) || sections.length !== SPOT_DOCUMENT_CHAPTERS.length) return null;
  // Adopted chapters.mjs: 12px heading inset + 25px activation band; short last
  // sections must still become current when the actual document reaches its end.
  if (content.height > viewport.height && content.top + content.height - viewport.top - viewport.height < 3) return "notes";
  let active: SpotDocumentChapter = "place";
  for (const [chapter] of SPOT_DOCUMENT_CHAPTERS) {
    const section = sections.find(item => item.id === `formal-feedback-${chapter}`);
    if (!section || !Number.isFinite(section.top)) return null;
    if (section.top <= viewport.top + 37) active = chapter;
  }
  return active;
}

/** Coalesce scroll events into one native measurement at a time. Disposal also
 * invalidates callbacks from hidden pages and replaced form instances. */
export function createDocumentScrollTracker(
  measure: (done: (geometry: DocumentGeometry | null) => void) => void,
  publish: (chapter: SpotDocumentChapter) => void,
) {
  let disposed = false, measuring = false, queued = false;
  function request() {
    if (disposed) return;
    if (measuring) { queued = true; return; }
    measuring = true;
    measure(geometry => {
      if (disposed) return;
      measuring = false;
      // Viewport, full content and headings belong to the same native query.
      const chapter = geometry && visibleDocumentChapter(geometry);
      if (chapter) publish(chapter);
      if (queued) { queued = false; request(); }
    });
  }
  return { request, dispose: () => { disposed = true; } };
}
