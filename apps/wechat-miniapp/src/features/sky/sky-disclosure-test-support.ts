import { createSkyDisclosureCommands, type SkyControlPanel, type SkyDisclosureState } from "./sky-disclosure-commands";
import { createSkyObservationTime } from "./sky-observation-time";

export const committedAt = "2026-09-30T15:59:58.000Z";
export function disclosureFixture(panel: SkyControlPanel | null) {
  const time = createSkyObservationTime();
  time.bind("revision1", committedAt, { startAt: committedAt, endAt: "2026-09-30T17:00:00.000Z" });
  const state: SkyDisclosureState = { panel, list: false, date: false, object: false };
  const result = { time, state, visible: true, editing: false, busy: false, retired: false,
    left: 0, calibrationCancelled: 0 };
  const commands = createSkyDisclosureCommands({
    read: () => state,
    canInteract: () => result.visible && !result.editing && !result.busy && !result.retired,
    canOpenMenu: () => result.visible && !result.editing && !result.retired,
    canClose: () => result.visible && !result.retired,
    canRetireTime: () => !result.retired,
    setPanel: next => { state.panel = next; },
    setList: open => { state.list = open; },
    setDate: open => { state.date = open; },
    clearObject: () => { state.object = false; },
    cancelCalibration: () => { result.calibrationCancelled++; result.editing = false; },
    cancelTimePreview: () => { if (!result.retired) time.cancel(); },
    pauseTime: () => { time.pause(); },
    leave: () => { result.left++; },
  });
  return Object.assign(result, { commands });
}
