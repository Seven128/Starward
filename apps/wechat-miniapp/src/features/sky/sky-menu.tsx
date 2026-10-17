import { Button, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDidHide } from "@tarojs/taro";
import { SemanticIcon, type SemanticIconName } from "@/components/semantic-asset";
import { skyRetainedLayerStyle } from "./sky-retained-layer";
import { ToggleField } from "@/components/toggle-field";

export function SkyNavigationMenu({ open, disabled = false, hidden = false, onToggle, onLeave, children }: {
  open: boolean; disabled?: boolean; hidden?: boolean; onToggle: () => void; onLeave: () => void; children: ReactNode;
}) {
  return <View className="sky-navigation-actions" style={skyRetainedLayerStyle(hidden)}>
    <Button className="sky-menu-toggle focus-ring" disabled={disabled} aria-expanded={open}
      aria-label={open ? "收起菜单" : "展开菜单"} hoverClass="sky-menu-pressed" onClick={onToggle}>
      <View className={`sky-menu-burger${open ? " sky-menu-burger--open" : ""}`} aria-hidden>
        <View /><View /><View />
      </View>
    </Button>
    {open ? <View className="sky-menu-popup" onTouchStart={event => event.stopPropagation()}
      onTouchMove={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      <SkyMenuAction icon="sky-door" label="返回" id="sky-return" expanded={false} onClick={onLeave} />
      {children}
    </View> : null}
  </View>;
}

export function SkyMenuAction({ icon, label, expanded, disabled = false, onClick, id }: {
  icon: SemanticIconName; label: string; expanded: boolean; disabled?: boolean;
  onClick: () => void; id: string;
}) {
  return <Button className={`sky-control-dock__button focus-ring${expanded ? " sky-control-dock__button--active" : ""}`}
    data-od-id={id} aria-label={label} aria-expanded={expanded} disabled={disabled}
    hoverClass="sky-menu-pressed" onClick={onClick}>
    <View className="sky-menu-circle"><SemanticIcon name={icon} /></View>
  </Button>;
}

/** Presentation lock only. The original orientation controller owns following
 * and calibration, including permission and stale-sample recovery. */
export function SkyBrowseControl({ following, editing, active, disabled, canCalibrate, reducedMotion, onToggle, onCalibrate }: {
  following: boolean; editing: boolean; active: boolean; disabled: boolean; canCalibrate: boolean;
  reducedMotion: boolean; onToggle: () => void; onCalibrate: () => void;
}) {
  const lock = useRef(false), generation = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [moving, setMoving] = useState(false);
  const finish = () => { generation.current++; if (timer.current !== null) clearTimeout(timer.current); timer.current = null; lock.current = false; setMoving(false); };
  useEffect(() => { if (!active) finish(); }, [active]);
  useEffect(() => () => { generation.current++; if (timer.current !== null) clearTimeout(timer.current); lock.current = false; }, []);
  useDidHide(finish);
  const renderedGeneration = generation.current;
  return <View className={`sky-browse-control${following ? " sky-browse-control--following" : ""}${reducedMotion ? " sky-browse-control--immediate" : ""}`}>
    <Button className="sky-browse-sidecar" ariaLabel={editing ? "确定校准" : "校准"}
      disabled={!active || !following || moving || !canCalibrate}
      onClick={() => { if (active && following && !lock.current && canCalibrate) onCalibrate(); }}>
      <View>{editing ? "确定" : "校准"}</View>
    </Button>
    <Button className="sky-control-dock__button sky-browse-mode-toggle" ariaLabel={following ? "切换为手动浏览" : "切换为随手机"}
      disabled={!active || disabled || moving} onClick={() => {
        if (!active || disabled || lock.current) return;
        if (!reducedMotion) { const expected = ++generation.current; lock.current = true; setMoving(true);
          timer.current = setTimeout(() => { if (generation.current === expected) finish(); }, 300); }
        onToggle();
      }}>
      <View className="sky-menu-circle sky-browse-circle">
        <View id="sky-browse-rotor" className="sky-browse-rotor"
          onTransitionEnd={() => { if (generation.current === renderedGeneration) finish(); }}>
          <View className="sky-browse-glyph"><SemanticIcon name="sky-hand" /></View>
          <View className="sky-browse-glyph sky-browse-eye"><SemanticIcon name="sky-eye" /></View>
        </View>
      </View>
    </Button>
  </View>;
}

export function SkySourceLink({ onClick }: { onClick: () => void }) {
  return <Button className="sky-source-link focus-ring" ariaLabel="来源" hoverClass="sky-menu-pressed" onClick={onClick}>
    <SemanticIcon name="sky-source" />
  </Button>;
}

/** The action stays short while attribution remains visible before expansion. */
export function SkySourceDisclosure({ label, credit, expanded, onClick }: {
  label: string; credit: string; expanded: boolean; onClick: () => void;
}) {
  return <Button className="sky-source-heading focus-ring" aria-expanded={expanded}
    hoverClass="sky-menu-pressed" onClick={onClick}>
    <View className="sky-source-heading__copy"><Text>{label}</Text><Text>{credit}</Text></View>
    <SemanticIcon name={expanded ? "sky-up" : "sky-down"} />
  </Button>;
}

export function SkyLayerToggle({ icon, label, detail, selected, disabled = false, onClick }: {
  icon: SemanticIconName; label: string; detail: string; selected: boolean;
  disabled?: boolean; onClick: () => void;
}) {
  return <View className="sky-layer-toggle"><ToggleField id={`sky-layer-${icon}`} label={label}
    description={detail} checked={selected} disabled={disabled} onChange={onClick} /></View>;
}
