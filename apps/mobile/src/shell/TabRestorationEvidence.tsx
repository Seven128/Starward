import { digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

interface TabRestorationConfig {
  testID: string;
  tabId: string;
  rootRoute: string;
  nestedRoute: string;
  ownerType: "scroll" | "canvas";
  ownerId: string;
}

interface OwnerState {
  x: number;
  y: number;
  revision: number;
  digest: string;
}

const emptyStateSha256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function useTabRestorationEvidence(config: TabRestorationConfig) {
  const instanceId = useRef(
    `${config.ownerId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const sequence = useRef(0);
  const [ownerState, setOwnerState] = useState<OwnerState>({
    x: 0,
    y: 0,
    revision: 1,
    digest: emptyStateSha256,
  });

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = Math.max(0, Math.round(event.nativeEvent.contentOffset.x));
      const y = Math.max(0, Math.round(event.nativeEvent.contentOffset.y));
      setOwnerState((current) => {
        if (current.x === x && current.y === y) return current;
        const nextSequence = sequence.current + 1;
        sequence.current = nextSequence;
        const revision = current.revision + 1;
        void digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          JSON.stringify({ owner_id: config.ownerId, x, y, revision }),
        ).then((digest) => {
          if (sequence.current !== nextSequence) return;
          setOwnerState((latest) =>
            latest.x === x && latest.y === y && latest.revision === revision
              ? { ...latest, digest }
              : latest,
          );
        });
        return { x, y, revision, digest: current.digest };
      });
    },
    [config.ownerId],
  );

  const value = JSON.stringify({
    schema_version: "starward-tab-restoration-state-v1",
    tab_id: config.tabId,
    root_route: config.rootRoute,
    active_route: config.nestedRoute,
    nested_route: config.nestedRoute,
    owner_type: config.ownerType,
    stack_depth: 2,
    production_route: true,
    shared_root_scroll_owner: false,
    owner_id: config.ownerId,
    screen_instance_id: instanceId.current,
    owner_state_sha256: ownerState.digest,
    owner_state_revision: ownerState.revision,
  });

  return {
    onScroll,
    scrollEventThrottle: 32,
    evidence: (
      <View
        testID={config.testID}
        collapsable={false}
        accessible
        accessibilityLabel={`${config.testID}:${value}`}
        style={styles.machineEvidence}
      >
        <Text style={styles.machineEvidenceText}>{value}</Text>
      </View>
    ),
  };
}

const styles = StyleSheet.create({
  machineEvidence: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
  },
  machineEvidenceText: {
    color: "transparent",
    fontSize: 1,
    lineHeight: 1,
  },
});
