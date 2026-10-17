export type SkyControlPanel = "menu" | "calibration" | "time" | "layers";
export type SkyDisclosure = SkyControlPanel | "list";

export interface SkyDisclosureState {
  panel: SkyControlPanel | null;
  list: boolean;
  date: boolean;
  object: boolean;
}

export function skyHasDisclosure(state: SkyDisclosureState): boolean {
  return Boolean(state.panel || state.list || state.date || state.object);
}

/** Coordinates UI intent only. State, time, selection and frozen orientation
 * remain with their existing owners; every command reads their live values. */
export function createSkyDisclosureCommands(owner: {
  read: () => SkyDisclosureState;
  canInteract: () => boolean;
  canOpenMenu: () => boolean;
  canClose: () => boolean;
  canRetireTime: () => boolean;
  setPanel: (panel: SkyControlPanel | null) => void;
  setList: (open: boolean) => void;
  setDate: (open: boolean) => void;
  clearObject: () => void;
  cancelCalibration: () => void;
  cancelTimePreview: () => void;
  pauseTime: () => void;
  leave: () => void | Promise<void>;
}) {
  const closePanel = (nextPanel: "menu" | null = "menu") => {
    const panel = owner.read().panel;
    if (panel === "time") owner.cancelTimePreview();
    if (panel === "calibration") owner.cancelCalibration();
    owner.setPanel(nextPanel);
  };
  return {
    close(disclosure: SkyDisclosure) {
      if (!owner.canClose()) return;
      const state = owner.read();
      if (disclosure === "list") { if (state.list) { owner.setList(false); owner.setPanel("menu"); } return; }
      if (state.panel !== disclosure) return;
      owner.setDate(false);
      closePanel(disclosure === "menu" ? null : "menu");
    },
    applyLayer(change: () => void) {
      const state = owner.read();
      if (owner.canInteract() && state.panel === "layers" && !state.date && !state.object) change();
    },
    back() {
      if (!owner.canClose()) return;
      const state = owner.read();
      if (state.date) { owner.setDate(false); return; }
      if (state.object) { owner.clearObject(); if (!state.list) closePanel(); return; }
      if (state.list) { owner.setList(false); owner.setPanel("menu"); return; }
      if (state.panel) { closePanel(state.panel === "menu" ? null : "menu"); return; }
      return owner.leave();
    },
    leave() {
      if (!owner.canOpenMenu() || !owner.canClose()) return;
      owner.setDate(false);
      owner.clearObject();
      owner.setList(false);
      closePanel(null);
      return owner.leave();
    },
    toggle(disclosure: SkyDisclosure) {
      if (!(disclosure === "menu" ? owner.canOpenMenu() : owner.canInteract())) return;
      const state = owner.read();
      const closing = disclosure === "list" ? state.list : state.panel === disclosure;
      if (closing) {
        if (!owner.canClose()) return;
        owner.setDate(false);
        owner.clearObject();
        if (disclosure === "list") { owner.setList(false); owner.setPanel("menu"); }
        else closePanel(disclosure === "menu" ? null : "menu");
        return;
      }
      owner.cancelCalibration();
      owner.clearObject();
      owner.setDate(false);
      owner.setList(false);
      if (state.panel === "time" || disclosure === "calibration") owner.cancelTimePreview();
      else if (disclosure === "list" || disclosure === "layers" || disclosure === "menu") owner.pauseTime();
      owner.setPanel(disclosure === "list" ? null : disclosure);
      if (disclosure === "list") owner.setList(true);
    },
    date(open: boolean) {
      if (!open) { if (owner.canRetireTime()) owner.setDate(false); return; }
      if (!owner.canInteract() || owner.read().panel !== "time") return;
      owner.cancelCalibration();
      owner.cancelTimePreview();
      owner.setDate(true);
    },
    openObject(reveal: () => void) {
      if (!owner.canInteract()) return;
      owner.cancelCalibration();
      reveal();
    },
    closeObject() {
      if (!owner.canClose() || !owner.read().object) return;
      owner.clearObject();
      owner.setList(false);
      closePanel();
    },
    returnToList() {
      if (!owner.canClose() || !owner.read().object || !owner.read().list) return;
      owner.clearObject();
    },
  };
}
