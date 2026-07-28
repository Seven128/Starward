import { colors } from "@starward/ui-system/tokens";
import { useShellStore } from "../state/shell-store";

export function useStarwardTheme() {
  const mode = useShellStore((state) => state.displayMode);
  return { mode, palette: colors[mode] } as const;
}
