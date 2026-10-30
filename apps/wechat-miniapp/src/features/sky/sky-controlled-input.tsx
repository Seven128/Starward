import { Input, type InputProps } from "@tarojs/components";
import { memo, useMemo, useRef, useState } from "react";

type SkyControlledInputProps = InputProps & {
  active: boolean;
  editingGeneration?: number;
};

const NativeInput = memo(function NativeInput({
  active: _active, editingGeneration: _editingGeneration, nativeRevision: _nativeRevision, ...props
}: SkyControlledInputProps & { nativeRevision: number }) {
  return <Input {...props} />;
});

/** Taro republishes a controlled Input's value whenever its host renders.
 * Keep unchanged fields out of Sky's frame updates, while forwarding events
 * to their current owner and reconciling every actual native edit. */
export function SkyControlledInput({ onInput, onFocus, onBlur, onConfirm, ...props }: SkyControlledInputProps) {
  const handlers = useRef({ onInput, onFocus, onBlur, onConfirm });
  handlers.current = { onInput, onFocus, onBlur, onConfirm };
  const [nativeRevision, setNativeRevision] = useState(0);
  const events = useMemo(() => ({
    onFocus: ((event) => handlers.current.onFocus?.(event)) as NonNullable<InputProps["onFocus"]>,
    onInput: ((event) => {
      try { return handlers.current.onInput?.(event); }
      finally { setNativeRevision(value => value + 1); }
    }) as NonNullable<InputProps["onInput"]>,
    onBlur: ((event) => {
      try { return handlers.current.onBlur?.(event); }
      finally { setNativeRevision(value => value + 1); }
    }) as NonNullable<InputProps["onBlur"]>,
    onConfirm: ((event) => {
      try { return handlers.current.onConfirm?.(event); }
      finally { setNativeRevision(value => value + 1); }
    }) as NonNullable<InputProps["onConfirm"]>,
  }), []);
  // A rejected edit can leave the owner's value unchanged while the native
  // field has already advanced. Its event revision must still write it back.
  return <NativeInput {...props} nativeRevision={nativeRevision}
    {...onInput ? { onInput: events.onInput } : {}} {...onFocus ? { onFocus: events.onFocus } : {}}
    {...onBlur ? { onBlur: events.onBlur } : {}} {...onConfirm ? { onConfirm: events.onConfirm } : {}} />;
}
