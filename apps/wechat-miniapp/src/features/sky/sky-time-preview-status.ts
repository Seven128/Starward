import { skyPresentedTimeCurrent } from "./sky-observation-time";

/** The digits express intent. Only the accepted native writer can supply a
 * displayed time; a loaded model or a fallback row is not a painted frame. */
export function skyTimePreviewStatus(input: { requestedAt: string; geometryAt?: string | undefined; paintedAt?: string | undefined;
  generation?: number; paintedGeneration?: number | undefined;
  playing: boolean; runStartAt: string | null; geometryFailed: boolean; canvasFailed: boolean }) {
  const current = input.generation === undefined || Number.isSafeInteger(input.generation) && input.paintedGeneration === input.generation;
  const ready = current && input.geometryAt === input.requestedAt && skyPresentedTimeCurrent(input.requestedAt,
    input.paintedAt, input.playing, input.runStartAt);
  const failed = !ready && (input.geometryFailed || input.canvasFailed);
  return { ready, pending: !ready && !failed, failed, presentedAt: input.paintedAt };
}
