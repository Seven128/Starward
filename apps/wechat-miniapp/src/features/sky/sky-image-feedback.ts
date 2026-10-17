import { useEffect, useRef } from "react";
import { reportSkyImageError } from "../../services/sky-image-diagnostics";

/** Optional images have no error UI. Keep one bounded console report per live
 * failure transition; the resource owners retain their real failure state. */
export function useSkyImageFailureDiagnostics(resources: readonly { resource: string; failed: boolean }[], visible: boolean): void {
  const previous = useRef(new Set<string>());
  useEffect(() => {
    const next = new Set<string>();
    if (visible) for (const resource of resources) {
      if (!resource.failed || next.has(resource.resource)) continue;
      next.add(resource.resource);
      if (!previous.current.has(resource.resource)) reportSkyImageError("availability", resource.resource);
    }
    previous.current = next;
  }, [resources, visible]);
}
