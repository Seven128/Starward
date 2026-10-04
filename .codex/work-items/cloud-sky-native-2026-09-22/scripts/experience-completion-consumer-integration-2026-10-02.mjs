import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const page='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
const scene='apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
const hash=s=>createHash('sha256').update(s).digest('hex');
let p=await fs.readFile(page,'utf8'),s=await fs.readFile(scene,'utf8');
assert.equal(hash(p),'f2005524cac532ab8af8d1fde65815ec7cfcf243abe305ae85b27b470e0831f3');
assert.equal(hash(s),'9d4343b3f3fae121ee4fc2b244112ad8cf7d886c949ffbf869746535f9a1e4f7');
await fs.writeFile(task+'tmp/optical-completion-page-before-2026-10-02.tsx',p);
await fs.writeFile(task+'tmp/optical-completion-scene-before-2026-10-02.ts',s);
const replace=(source,old,next)=>{assert.equal(source.split(old).length,2,old.slice(0,100));return source.replace(old,next);};
const pn=p.includes('\r\n')?'\r\n':'\n',sn=s.includes('\r\n')?'\r\n':'\n';
const lines=(text,n)=>text.replaceAll('\n',n);
s=replace(s,'export type SkyScenePaintedSources = { sdssOpticalImage: object | null; deepSkyImage: object | null };',
  'export type SkyScenePaintedSources = { readonly sdssOptical: SkySdssOpticalCompletion | null; readonly deepSkyImage: object | null };');
s=replace(s,'import type { SkySdssOpticalImage } from "./sky-sdss-optical-frame";',
  'import type { SkySdssOpticalImage } from "./sky-sdss-optical-frame";'+sn+'import { completeLegacySkyOptical, type SkySdssOpticalCompletion } from "./sky-sdss-optical-completion";');
s=replace(s,'painted?.(null, { sdssOpticalImage: null, deepSkyImage: null });','painted?.(null, { sdssOptical: null, deepSkyImage: null });');
s=replace(s,'} : null, { sdssOpticalImage: paintedSdssOpticalImage, deepSkyImage: paintedDeepSkyImage });',
  '} : null, Object.freeze({ sdssOptical: completeLegacySkyOptical(sdssOpticalImage, paintedSdssOpticalImage), deepSkyImage: paintedDeepSkyImage }));');
p=replace(p,'import { deepSkyAuxiliaryOpacity } from "./sky-deep-auxiliary-visibility";',
  'import { deepSkyAuxiliaryOpacity } from "./sky-deep-auxiliary-visibility";'+pn+
  'import { liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput, type SkySdssOpticalCompletion } from "./sky-sdss-optical-completion";');
p=replace(p,'  const paintedSkyObjectsRef = useRef<SkyPickSnapshot | null>(null);',lines(`  const paintedSkyObjectsRef = useRef<SkyPickSnapshot | null>(null);
  // Only lifecycle's accepted completion can publish this draw's actual view,
  // picking and immutable sources. The slot lives only around this attempt's done.
  const pendingSkyPaintRef = useRef<{ frame: SkyCanvasFrame; generation: number; publish: (() => void) | null } | null>(null);`,pn));
p=replace(p,'"data" | "frameAt" | "mode" | "constellations" | "constellationsEnabled" | "sdssOpticalImage" | "deepSkyImage" | "stellarSupplement"> &',
  '"data" | "frameAt" | "mode" | "constellations" | "constellationsEnabled" | "deepSkyImage" | "stellarSupplement"> &');
p=replace(p,'    { resolvedBodyReferences: readonly string[]; suppressedBodyReferences: readonly string[];',
  '    { sdssOptical: SkySdssOpticalCompletion | null; nativeCanvasGeneration: number;'+pn+
  '      resolvedBodyReferences: readonly string[]; suppressedBodyReferences: readonly string[];');
p=replace(p,'    paint: (context, frame, size, done) => {',lines(`    paint: (context, frame, size, done) => {
      const paintAttempt = { frame, generation: canvasGenerationRef.current, publish: null as (() => void) | null };`,pn));
p=replace(p,'        (snapshot, sources) => {'+pn+'          paintedSkyObjectsRef.current = snapshot;',
  '        (snapshot, sources) => {'+pn+'          paintAttempt.publish = () => {'+pn+'          paintedSkyObjectsRef.current = snapshot;');
const begin=p.indexOf('          const paintedSdssOpticalImage = sources.sdssOpticalImage');
const end=p.indexOf('          const paintedDeepSkyImage =',begin);
assert(begin>0&&end>begin);
p=p.slice(0,begin)+'          const paintedSdssOptical = liveSkyOpticalCompletion(sources.sdssOptical);'+pn+p.slice(end);
p=replace(p,'setPresentedSkyFrame(previous => snapshot || paintedSdssOpticalImage || paintedDeepSkyImage ?',
  'setPresentedSkyFrame(previous => snapshot || paintedSdssOptical || paintedDeepSkyImage ?');
const equalBegin=p.indexOf('              previous.sdssOpticalImage?.image === paintedSdssOpticalImage?.image');
const equalEnd=p.indexOf('              previous.deepSkyImage?.image',equalBegin);
assert(equalBegin>0&&equalEnd>equalBegin);
p=p.slice(0,equalBegin)+'              previous.nativeCanvasGeneration === paintAttempt.generation &&'+pn+
  '              sameSkyOpticalCompletion(previous.sdssOptical, paintedSdssOptical) &&'+pn+p.slice(equalEnd);
p=replace(p,'                sdssOpticalImage: paintedSdssOpticalImage, deepSkyImage: paintedDeepSkyImage,',
  '                sdssOptical: paintedSdssOptical, nativeCanvasGeneration: paintAttempt.generation, deepSkyImage: paintedDeepSkyImage,');
p=replace(p,'        }, done, fov, frame.deepSkyImage?.canvasGeneration',lines(`          };
        }, () => {
          // A late/repeated/rejected completion must not publish or clear a newer
          // attempt. Scene completion is synchronous today; retain the port fence.
          if (paintAttempt.generation !== canvasGenerationRef.current || !paintAttempt.publish) { done(); return; }
          pendingSkyPaintRef.current = paintAttempt;
          try { done(); }
          finally { if (pendingSkyPaintRef.current === paintAttempt) pendingSkyPaintRef.current = null; }
        }, fov, frame.deepSkyImage?.canvasGeneration`,pn));
const sameBegin=p.indexOf('      completed.sdssOpticalImage?.image === latest.sdssOpticalImage?.image');
const sameEnd=p.indexOf('      completed.constellations === latest.constellations',sameBegin);
assert(sameBegin>0&&sameEnd>sameBegin);
p=p.slice(0,sameBegin)+'      sameSkyOpticalInput(completed.sdssOpticalImage, latest.sdssOpticalImage) &&'+pn+p.slice(sameEnd);
p=replace(p,'    presented: (frame, size) => {',lines(`    presented: (frame, size) => {
      const attempt = pendingSkyPaintRef.current;
      pendingSkyPaintRef.current = null;
      if (!attempt || attempt.frame !== frame || attempt.generation !== canvasGenerationRef.current || !attempt.publish) return;
      attempt.publish();`,pn));
p=replace(p,'    invalidated: () => {'+pn+'      paintedSkyObjectsRef.current = null;',
  '    invalidated: () => {'+pn+'      pendingSkyPaintRef.current = null;'+pn+'      paintedSkyObjectsRef.current = null;');
const liveBegin=p.indexOf('  const sdssOpticalImagePresented = Boolean(');
const liveEnd=p.indexOf('  const sdssOpticalStatus',liveBegin);
assert(liveBegin>0&&liveEnd>liveBegin);
p=p.slice(0,liveBegin)+lines(`  const presentedSdssOptical = presentedSceneCurrent && nativeCanvasMounted &&
    canvasSize.width > 0 && canvasSize.height > 0 &&
    presentedSkyFrame?.nativeCanvasGeneration === canvasGenerationRef.current
    ? liveSkyOpticalCompletion(presentedSkyFrame.sdssOptical) : null;
  const sdssOpticalImagePresented = Boolean(presentedSdssOptical);
`,pn)+p.slice(liveEnd);
p=replace(p,'    paintedImage: sdssOpticalImagePresented ? presentedSkyFrame!.sdssOpticalImage!.image : null,',
  '    photoPresented: sdssOpticalImagePresented,');
const recoveryBegin=p.indexOf('  const sdssOpticalCurrentImagePresented = Boolean(');
const recoveryEnd=p.indexOf('  const orientationTargetFrame',recoveryBegin);
assert(recoveryBegin>0&&recoveryEnd>recoveryBegin);
p=p.slice(0,recoveryBegin)+lines(`  const sdssOpticalCurrentImagePresented = Boolean(presentedSdssOptical && sdssOptical.publication &&
    presentedSdssOptical.reference === sdssOptical.publication.objectRef &&
    presentedSdssOptical.publicationHash === sdssOptical.publication.publicationHash &&
    (presentedSdssOptical.kind === "legacy" ? [presentedSdssOptical.field] : presentedSdssOptical.participatingFields)
      .some(field => field.image === sdssOptical.image || field.image === sdssOptical.coarser?.image));
`,pn)+p.slice(recoveryEnd);
p=replace(p,'(sdssOpticalImagePresented && presentedSkyFrame?.sdssOpticalImage?.reference === entry.objectRef)',
  '(presentedSdssOptical?.kind === "legacy" && presentedSdssOptical.reference === entry.objectRef)');
p=replace(p,'{...(sdssOpticalImagePresented && presentedSkyFrame?.sdssOpticalImage?.reference === selectedCatalogObject.reference &&'+pn+
  '              presentedSkyFrame.sdssOpticalImage.publicationHash ? { opticalPublicationHash: presentedSkyFrame.sdssOpticalImage.publicationHash } : {})}',
  '{...(presentedSdssOptical?.reference === selectedCatalogObject.reference &&'+pn+
  '              presentedSdssOptical.publicationHash ? { opticalPublicationHash: presentedSdssOptical.publicationHash } : {})}');
let selection=await fs.readFile('apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts','utf8');
selection=replace(selection,'  paintedImage: object | null;','  photoPresented: boolean;');
selection=replace(selection,'if (input.canvasVisible && input.paintedImage)','if (input.canvasVisible && input.photoPresented)');
await fs.writeFile(scene,s);
await fs.writeFile(page,p);
await fs.writeFile('apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts',selection);
console.log(JSON.stringify({page:hash(p),scene:hash(s),acceptedPublication:'page staging -> lifecycle.presented',scienceDefault:'unchanged disabled'}));
