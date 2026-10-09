import { Text, View } from "@tarojs/components";
import { SemanticIcon, type SemanticIconName } from "@/components/semantic-asset";
import { contributionRecordStatus } from "./contribution-record-model";

type RecordStatus = ReturnType<typeof contributionRecordStatus>;
const STATUS_ICON: Record<RecordStatus["key"], SemanticIconName> = {
  DRAFT: "pencil", PENDING: "clock", REJECTED: "warning",
  ONLINE: "check", APPROVED: "check", WITHDRAWN: "close",
};

/** List and frozen detail present the same domain status and shared icon. */
export function ContributionRecordStatus({ status }: { status: RecordStatus }) {
  return <View className={`contribution-status-pill contribution-status-pill--${status.tone} contribution-status-pill--${status.key.toLowerCase()}`}>
    <View className="contribution-status-pill__icon"><SemanticIcon name={STATUS_ICON[status.key]} /></View>
    <Text>{status.label}</Text>
  </View>;
}
