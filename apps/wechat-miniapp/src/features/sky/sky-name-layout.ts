import type { SkyNamedCatalogObject } from "./sky-label-presentation";
import type { SkyCanvasCaption, SkyCanvasTextMetrics } from "./sky-canvas-surface";
import type { SkyViewportInsets, SkyCanvasBounds } from "./sky-viewport";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyObjectIdentity } from "./sky-object-picking";
import { SKY_READY_REVEAL_MS, type SkyReadyProgress } from "./sky-ready-presentation";

export type SkyNameBounds = SkyCanvasBounds;
export type SkyPlacedCatalogName = SkyNamedCatalogObject & {
  readonly bounds: SkyNameBounds;
  readonly caption: SkyCanvasCaption;
  readonly side: "above";
  readonly retiring: boolean;
};
export type SkyControlNameAction = { readonly kind: "target"; readonly target: ResolvedSkyReport["targets"][number] } |
  { readonly kind: "selected"; readonly object: SkyObjectIdentity };
export interface SkyPlacedControlName {
  readonly key: string;
  readonly action: SkyControlNameAction;
  readonly bounds: SkyNameBounds | null;
  readonly anchorBounds: SkyNameBounds | null;
  readonly opacity: number;
  readonly retiring?: boolean;
  readonly captions: readonly SkyCanvasCaption[];
}

type NamePlacement = { readonly kind: "catalog"; readonly side: "above" } |
  { readonly kind: "constellation"; readonly offset: readonly [number, number] } |
  { readonly kind: "control"; readonly placement: "above" };
interface NameProgress extends SkyReadyProgress { readonly from: number; readonly target: 0 | 1 }
type Placement = NamePlacement & { readonly text: string; readonly ready: NameProgress; readonly ceiling: number; readonly newborn: boolean };
interface Scope { readonly context: object | undefined; readonly mode: string }
const intersects = (a: SkyNameBounds, b: SkyNameBounds) => a.left < b.left+b.width && a.left+a.width > b.left &&
  a.top < b.top+b.height && a.top+a.height > b.top;
const validMetrics = (metrics: SkyCanvasTextMetrics) =>
  [metrics.width,metrics.left,metrics.right,metrics.ascent,metrics.descent].every(value=>Number.isFinite(value)&&value>=0);
export const skyControlNameKey = (action: SkyControlNameAction) => action.kind === "target"
  ? `target:${action.target.targetId}` : `selected:${action.object.reference}`;

/** A bounded part of the accepted frame. Only identities reprojected by the
 * current Scene may fade out; no old screen coordinates or offscreen clamp. */
export function createSkyNameLayouts() {
  let accepted: { scope: Scope; placements: Map<string, Placement> } | null = null, revision = 0;
  return {
    reset() { accepted = null; revision++; },
    prepare(scope: Scope, now: number, width: number, height: number, insets: SkyViewportInsets,
      reducedMotion = false, paused = false) {
      const before = accepted?.scope.context === scope.context && accepted?.scope.mode === scope.mode ? accepted.placements : null;
      const expectedRevision = revision, placements = new Map<string, Placement>(), names: SkyPlacedCatalogName[] = [];
      const occupied: SkyNameBounds[] = [], decorations: SkyCanvasCaption[] = [], controls: SkyPlacedControlName[] = [];
      const retainedCatalogReferences = new Set<string>(), retainedTargetIds = new Set<string>(), retainedConstellationIds = new Set<string>();
      for (const [key, value] of before ?? []) {
        if (value.kind === "catalog") retainedCatalogReferences.add(key);
        else if (value.kind === "constellation") retainedConstellationIds.add(key.slice("constellation:".length));
        else if (key.startsWith("target:")) retainedTargetIds.add(key.slice("target:".length));
      }
      let animating = false;
      const margin = 4, padding = 6*width/750;
      const fit = (bounds: SkyNameBounds, visible?: (bounds: SkyNameBounds) => boolean) => bounds.left >= margin && bounds.left+bounds.width <= width-margin &&
        bounds.top >= insets.top+margin && bounds.top+bounds.height <= height-insets.bottom-margin && (visible?.(bounds) ?? true);
      const clear = (bounds: SkyNameBounds, visible?: (bounds: SkyNameBounds) => boolean) => fit(bounds,visible) && !occupied.some(other=>intersects(other,bounds));
      // The existing 16px band changes eligibility; the common time envelope
      // owns the visible exit. Do not spend the alpha in a spatial ramp first.
      const edgeOpacity = (bounds: SkyNameBounds) => Math.min(bounds.left-margin,
        width-margin-bounds.left-bounds.width,bounds.top-insets.top-margin,
        height-insets.bottom-margin-bounds.top-bounds.height) >= 16 ? 1 : 0;
      const word = (x: number, y: number, metrics: SkyCanvasTextMetrics, hit = false): SkyNameBounds => {
        const left = x-metrics.width/2-metrics.left-padding, right = x-metrics.width/2+metrics.right+padding;
        const h = Math.max(hit ? 44 : 0,metrics.ascent+metrics.descent+4), w = Math.max(hit ? 44 : 0,right-left);
        return {left:(left+right-w)/2,top:y-h/2,width:w,height:h};
      };
      const reveal = (key: string, text: string, layout: NamePlacement, targetOpacity: number) => {
        const candidate = before?.get(key);
        const previous = candidate?.text === text && candidate.kind === layout.kind &&
          (layout.kind !== "constellation" || candidate.kind === "constellation" &&
            candidate.offset[0] === layout.offset[0] && candidate.offset[1] === layout.offset[1]) ? candidate : undefined;
        const target = targetOpacity > .01 ? 1 : 0;
        if (!target && !previous) return null;
        const changed = !previous || previous.ready.target !== target || previous.ready.paused !== paused;
        const from = previous?.ready.progress ?? 0;
        const startedAt = changed ? now : previous.ready.startedAt;
        const initial = changed ? from : previous.ready.from;
        const progress = paused ? from : reducedMotion ? target : initial + (target-initial)*Math.max(0,Math.min(1,(now-startedAt)/SKY_READY_REVEAL_MS));
        const ceiling = target ? targetOpacity : previous!.ceiling;
        const ready: NameProgress = {startedAt,from:initial,target,progress,paused};
        if (target || progress > .001) placements.set(key,{...layout,text,ready,ceiling,newborn:changed});
        if (!paused && Math.abs(progress-target) > .001) animating = true;
        return {opacity:ceiling*progress,retiring:target===0};
      };
      return {
        retainedCatalogReferences, retainedTargetIds, retainedConstellationIds,
        target(target: ResolvedSkyReport["targets"][number], projection: {x:number;y:number;altitude:number}, targetOpacity:number,
          heading:SkyCanvasTextMetrics, metadata:SkyCanvasTextMetrics, visible?: (bounds:SkyNameBounds)=>boolean):SkyPlacedControlName|null {
          const {x,y} = projection;
          if (!target.targetId || !target.displayName || !validMetrics(heading) || !validMetrics(metadata) ||
            ![x,y,projection.altitude,targetOpacity].every(Number.isFinite)) return null;
          const action: SkyControlNameAction = {kind:"target",target}, key = skyControlNameKey(action);
          const headY=y-43, metaY=y-22, head=word(x,headY,heading), meta=word(x,metaY,metadata), radius=8*width/750;
          const left=Math.min(head.left,meta.left,x-22), right=Math.max(head.left+head.width,meta.left+meta.width,x+22);
          const top=Math.min(head.top,meta.top), bottom=y+22;
          const bounds={left,top,width:right-left,height:bottom-top};
          if (!clear(bounds,visible)) return null;
          const value=reveal(key,target.displayName,{kind:"control",placement:"above"},targetOpacity*edgeOpacity(bounds));
          if (!value) return null;
          const event=target.type==="METEOR_SHOWER"||target.type==="CONJUNCTION"||target.type==="MILKY_WAY";
          const placed: SkyPlacedControlName = {key,action,bounds,anchorBounds:null,...value,captions:[
            {text:target.displayName,x,y:headY,opacity:value.opacity,font:"600 14px sans-serif",color:"#E7EEF8",letterSpacing:0,textAlign:"center",
              marker:{x,y,radius,color:event?"#F6D56F":"#D1D7FF"}},
            {text:`${target.direction} · ${Math.round(projection.altitude)}°`,x,y:metaY,opacity:value.opacity,font:"12px sans-serif",color:"#9BADCA",letterSpacing:0,textAlign:"center"}]};
          occupied.push(bounds);controls.push(placed);return placed;
        },
        selected(object:SkyObjectIdentity,marker:{x:number;y:number;radiusPx:number;nameOpacity:number},
          locationLabel:string|null,metrics:SkyCanvasTextMetrics):SkyPlacedControlName|null {
          if (!object.reference || !object.displayName || !validMetrics(metrics) ||
            ![marker.x,marker.y,marker.radiusPx,marker.nameOpacity].every(Number.isFinite) || marker.radiusPx<0) return null;
          const {x,y}=marker,action: SkyControlNameAction={kind:"selected",object},key=skyControlNameKey(action);
          const anchor={left:x-22,top:y-22,width:44,height:44},anchorBounds=fit(anchor)?anchor:null;
          const text=object.displayName+(locationLabel?` · ${locationLabel}`:""),captionY=y-marker.radiusPx-24;
          const bounds=word(x,captionY,metrics,true);
          // A selected label remains honest about a covered/underground object;
          // its visible reticle continues to own the separate anchor action.
          if (clear(bounds)) {
            const value=reveal(key,text,{kind:"control",placement:"above"},marker.nameOpacity*edgeOpacity(bounds));
            if (value) {
              const placed: SkyPlacedControlName={key,action,bounds,anchorBounds,...value,captions:[
                {text,x,y:captionY,opacity:value.opacity,font:"12px sans-serif",color:"#F5F3EC",letterSpacing:0,textAlign:"center"}]};
              occupied.push(bounds);if(anchorBounds)occupied.push(anchorBounds);controls.push(placed);return placed;
            }
          }
          if (!anchorBounds) return null;
          const placed: SkyPlacedControlName={key,action,bounds:null,anchorBounds,opacity:0,captions:[]};
          occupied.push(anchorBounds);controls.push(placed);return placed;
        },
        catalog(object: SkyNamedCatalogObject, metrics: SkyCanvasTextMetrics, visible?: (bounds:SkyNameBounds)=>boolean):SkyPlacedCatalogName|null {
          if (names.length>=8 || !validMetrics(metrics) || ![object.x,object.y,object.auxiliaryOpacity,width,height].every(Number.isFinite) || width<=0 || height<=0) return null;
          const y=object.y-24,bounds=word(object.x,y,metrics,true);
          if (!clear(bounds,visible)) return null;
          const clearance=names.reduce((distance,name)=>Math.min(distance,Math.max(bounds.left-name.bounds.left-name.bounds.width,
            name.bounds.left-bounds.left-bounds.width,bounds.top-name.bounds.top-name.bounds.height,
            name.bounds.top-bounds.top-bounds.height)),16);
          const target=object.auxiliaryOpacity*edgeOpacity(bounds)*Math.max(0,Math.min(1,clearance/16));
          const value=reveal(object.reference,object.displayName,{kind:"catalog",side:"above"},target);
          if (!value) return null;
          const placed: SkyPlacedCatalogName={...object,auxiliaryOpacity:value.opacity,retiring:value.retiring,side:"above",bounds,
            caption:{text:object.displayName,x:object.x,y,opacity:value.opacity,font:"12px sans-serif",color:"#DCE4EF",letterSpacing:0,textAlign:"center"}};
          names.push(placed);occupied.push(bounds);return placed;
        },
        constellation(iau:string,caption:SkyCanvasCaption,metrics:SkyCanvasTextMetrics,
          visible?: (bounds:SkyNameBounds,x:number,y:number)=>boolean):SkyCanvasCaption|null {
          if (decorations.length>=6 || !iau || !validMetrics(metrics) || ![caption.x,caption.y,caption.opacity].every(Number.isFinite)) return null;
          const key="constellation:"+iau,previous=before?.get(key),preferred=previous?.kind==="constellation"?previous.offset:[0,0] as const;
          for (const offset of [preferred,[0,0],[0,-72],[0,72],[-72,0],[72,0]] as readonly (readonly [number,number])[]) {
            const x=caption.x+offset[0],y=caption.y+offset[1],bounds=word(x,y,metrics);
            if (!clear(bounds,visible?bounds=>visible(bounds,x,y):undefined)) continue;
            const value=reveal(key,caption.text,{kind:"constellation",offset},caption.opacity*edgeOpacity(bounds));
            if (!value) return null;
            const placed={...caption,x,y,opacity:value.opacity};occupied.push(bounds);decorations.push(placed);return placed;
          }
          return null;
        },
        get names(): readonly SkyPlacedCatalogName[] { return names; },
        get controls(): readonly SkyPlacedControlName[] { return controls; },
        get animating() { return animating; },
        commit(presentedAt=now,excludedKeys:readonly string[]=[]) {
          if (revision!==expectedRevision) return false;
          for (const key of excludedKeys) placements.delete(key);
          for (const [key,value] of placements) if(value.newborn) placements.set(key,{...value,newborn:false,ready:{...value.ready,startedAt:presentedAt}});
          accepted={scope,placements};revision++;return true;
        },
      };
    },
  };
}

/** Pointer taps use current same-copy glyph bounds, never a lagging WXML box. */
export function pickSkyCatalogName(names: readonly SkyPlacedCatalogName[], x: number, y: number): SkyPlacedCatalogName | null {
  if (![x,y].every(Number.isFinite)) return null;
  return names.find(name=>!name.retiring && name.auxiliaryOpacity >= .1 && x >= name.bounds.left && x <= name.bounds.left+name.bounds.width &&
    y >= name.bounds.top && y <= name.bounds.top+name.bounds.height) ?? null;
}

/** Actions retain their own domain identity; decorative names never enter. */
export function pickSkyControlName(names:readonly SkyPlacedControlName[],x:number,y:number):SkyPlacedControlName|null {
  if(![x,y].every(Number.isFinite))return null;
  const contains=(bounds:SkyNameBounds|null)=>bounds&&x>=bounds.left&&x<=bounds.left+bounds.width&&
    y>=bounds.top&&y<=bounds.top+bounds.height;
  return names.find(name=>!name.retiring&&name.opacity>=.1&&contains(name.bounds)||
    name.action.kind==='selected'&&contains(name.anchorBounds))??null;
}

export function sameSkyControlNames(left:readonly SkyPlacedControlName[],right:readonly SkyPlacedControlName[]):boolean {
  const sameBounds=(a:SkyNameBounds|null,b:SkyNameBounds|null)=>a===b||Boolean(a&&b&&a.left===b.left&&
    a.top===b.top&&a.width===b.width&&a.height===b.height);
  return left.length===right.length&&left.every((name,index)=>{
    const next=right[index]!;
    const sameAction=name.action.kind==='selected'?next.action.kind==='selected'&&name.action.object===next.action.object:
      next.action.kind==='target'&&name.action.target===next.action.target;
    return sameAction&&name.key===next.key&&name.opacity===next.opacity&&name.retiring===next.retiring&&sameBounds(name.bounds,next.bounds)&&
      sameBounds(name.anchorBounds,next.anchorBounds)&&name.captions.length===next.captions.length&&
      name.captions.every((caption,index)=>{
        const other=next.captions[index]!;
        return caption.text===other.text&&caption.x===other.x&&caption.y===other.y&&caption.color===other.color;
      });
  });
}

export function sameSkyCatalogNames(left: readonly SkyPlacedCatalogName[], right: readonly SkyPlacedCatalogName[]): boolean {
  return left.length === right.length && left.every((name,index)=>{
    const next=right[index]!;
    return name.reference === next.reference && name.displayName === next.displayName && name.x === next.x && name.y === next.y &&
      name.auxiliaryOpacity === next.auxiliaryOpacity && name.retiring === next.retiring && name.side === next.side &&
      name.caption.color === next.caption.color &&
      name.bounds.left === next.bounds.left && name.bounds.top === next.bounds.top &&
      name.bounds.width === next.bounds.width && name.bounds.height === next.bounds.height;
  });
}
