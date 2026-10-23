// Pure map rules stay in map-selection-state; the accepted state is a shell
// slice so selection and decision revision publish in the same transaction.
export { useShellStore as useMapSelectionStore } from "../../state/shell-store";
