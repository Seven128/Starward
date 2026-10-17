import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PreparedOpticalSelection } from "@starward/miniapp-contracts";
import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { skyTargetOpticalFrame, type SkyPreparedOpticalImage } from "./sky-sdss-optical-frame";
import { skyPreparedRegionSelections } from "./sky-prepared-region-selection";
import type { SkyTargetOpticalView } from "./sky-target-optical-visibility";
import { useSkyTargetOptical } from "./use-sky-target-optical";

interface RegionBinding {
  readonly selection: PreparedOpticalSelection;
  readonly canvas: SkyArtworkCanvas | null;
  readonly revision: number;
  readonly frame: SkyPreparedOpticalImage | null;
  readonly label: string;
  readonly requested: boolean;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly refreshFailed: boolean;
  readonly updateFailed: boolean;
  readonly retry: () => boolean;
  readonly failedImage: (image: object) => void;
}
const keyOf = (selection: PreparedOpticalSelection) => `${selection.kind}:${selection.reference}:${selection.publicationHash}`;
const ownerKey = (selection: PreparedOpticalSelection, revision: number) => `${keyOf(selection)}:${revision}`;
const EMPTY_REGION_FRAMES: readonly SkyPreparedOpticalImage[] = Object.freeze([]);
const sameBinding = (a: RegionBinding | undefined, b: RegionBinding) => Boolean(a &&
  a.canvas === b.canvas && a.revision === b.revision && a.label === b.label &&
  a.requested === b.requested && a.loading === b.loading && a.failed === b.failed &&
  a.refreshFailed === b.refreshFailed && a.updateFailed === b.updateFailed && sameSkyOpticalInput(a.frame, b.frame));

/** Each immutable edition has one existing loader instance. React component
 * identity keeps hook order fixed as current regions enter or leave the view. */
function SkyPreparedRegionResource({ selection, canvas, revision, footprint, paused, onBinding }: {
  selection: PreparedOpticalSelection; canvas: SkyArtworkCanvas | null; revision: number;
  footprint: SkyTargetOpticalView; paused: boolean;
  onBinding: (key: string, binding: RegionBinding | null) => void;
}) {
  const loaded = useSkyTargetOptical(selection.kind, selection.reference, footprint.view.verticalFovDeg,
    canvas, revision, true, selection.publicationHash, footprint, paused);
  const actions = useRef(loaded); actions.current = loaded;
  const retry = useCallback(() => actions.current.retry(), []);
  const failedImage = useCallback((image: object) => actions.current.failedImage(image), []);
  const frame = useMemo(() => {
    const value = skyTargetOpticalFrame(loaded);
    return value && "preparedPublication" in value ? value : null;
  }, [loaded.image, loaded.renderedLevel, loaded.renderedAsset, loaded.publication, loaded.coarser, loaded.fallback]);
  const publication = loaded.publication;
  const label = publication && "subject" in publication ? publication.subject.label : "当前区域";
  const key = ownerKey(selection, revision);
  const binding = useMemo<RegionBinding>(() => ({ selection, canvas, revision, frame, label,
    requested: loaded.requested, loading: loaded.loading, failed: loaded.failed,
    refreshFailed: loaded.refreshFailed, updateFailed: loaded.updateFailed, retry, failedImage }),
  [selection, canvas, revision, frame, label, loaded.requested, loaded.loading, loaded.failed,
    loaded.refreshFailed, loaded.updateFailed, retry, failedImage]);
  useEffect(() => { onBinding(key, binding); }, [key, binding, onBinding]);
  useEffect(() => () => onBinding(key, null), [key, onBinding]);
  return null;
}

/** Collection is a consumer of the common loader, not a second image/cache or
 * metadata owner. Render-time scope rejects late callbacks before effects. */
export function useSkyPreparedRegions(publications: readonly PreparedOpticalSelection[] | undefined,
  footprint: SkyTargetOpticalView | undefined, canvas: SkyArtworkCanvas | null, revision: number,
  active: boolean, paused: boolean) {
  const selections = useMemo(() => active ? skyPreparedRegionSelections(publications, footprint) : [],
    [active, publications, footprint?.report, footprint?.at, footprint?.width, footprint?.height,
      footprint?.view.basis, footprint?.view.verticalFovDeg, footprint?.view.center?.x, footprint?.view.center?.y]);
  const scope = useRef({ selections, canvas, revision, active, paused });
  scope.current = { selections, canvas, revision, active, paused };
  const [stored, setStored] = useState<ReadonlyMap<string, RegionBinding>>(() => new Map());
  const onBinding = useCallback((key: string, binding: RegionBinding | null) => {
    const current = scope.current;
    if (binding && (!current.active || current.canvas !== binding.canvas || current.revision !== binding.revision ||
      !current.selections.some(selection => ownerKey(selection, current.revision) === key))) return;
    setStored(previous => {
      if (!binding) {
        if (!previous.has(key)) return previous;
        const next = new Map(previous); next.delete(key); return next;
      }
      if (sameBinding(previous.get(key), binding)) return previous;
      const next = new Map(previous); next.set(key, binding); return next;
    });
  }, []);
  const bindings = useMemo(() => selections.flatMap(selection => {
    const binding = stored.get(ownerKey(selection, revision));
    return binding?.canvas === canvas && binding.revision === revision ? [binding] : [];
  }), [stored, selections, canvas, revision]);
  const frames = useMemo(() => {
    const drawable = bindings.flatMap(binding => binding.frame ? [binding.frame] : []);
    return drawable.length ? drawable : EMPTY_REGION_FRAMES;
  }, [bindings]);
  const currentBindings = useRef(bindings); currentBindings.current = bindings;
  const failedImage = useCallback((image: object) => {
    for (const binding of currentBindings.current) binding.failedImage(image);
  }, []);
  const retry = useCallback((publicationHash: string) => {
    if (!scope.current.active || scope.current.paused) return false;
    return currentBindings.current.find(binding => binding.selection.publicationHash === publicationHash)?.retry() ?? false;
  }, []);
  return { frames, bindings, failedImage, retry, loading: bindings.some(binding => binding.loading),
    resources: footprint ? selections.map(selection => <SkyPreparedRegionResource
      key={`${keyOf(selection)}:${revision}`} selection={selection} canvas={canvas} revision={revision}
      footprint={footprint} paused={paused} onBinding={onBinding} />) : null };
}
