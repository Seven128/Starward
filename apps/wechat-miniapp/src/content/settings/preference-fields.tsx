import { ToggleField } from "@/components/toggle-field";
import { Button, Input, Slider, Text, View } from "@tarojs/components";
import type { FacilityType, UserPreferences } from "@starward/miniapp-contracts";
import type { usePreferencesSync } from "@/hooks/use-preferences-sync";

const FACILITY_PREFERENCES: ReadonlyArray<{
  key: FacilityType;
  label: string;
}> = [
  { key: "PARKING", label: "停车" },
  { key: "TOILET", label: "厕所" },
  { key: "PLATFORM", label: "平台" },
  { key: "CHARGING", label: "充电" },
  { key: "SIGNAL", label: "信号" },
];

type PreferenceFieldsProps = {
  preferences: UserPreferences;
  updatePreference: ReturnType<typeof usePreferencesSync>["updatePreference"];
};

export function PreferenceFields({
  preferences,
  updatePreference,
}: PreferenceFieldsProps) {
  return (
    <>
      <View
        id="settings-form"
        className="settings-card card"
        data-od-id="settings-form"
        data-control="settings-form"
      >
        <Text className="type-section">选点偏好</Text>
        <View className="form-group">
          <Text className="type-label">默认城市或地点</Text>
          <Input
            className="field"
            value={preferences.defaultPlace}
            maxlength={80}
            aria-label="默认城市或地点"
            placeholder="例如：深圳"
            onInput={(event) =>
              updatePreference("defaultPlace", event.detail.value)
            }
          />
        </View>
        <View className="form-group">
          <Text className="type-label">经验水平</Text>
          <View className="settings-choice-grid">
            {(["BEGINNER", "ADVANCED"] as const).map((level) => (
              <Button
                key={level}
                className={`chip focus-ring${preferences.experience === level ? " chip--selected" : ""}`}
                aria-pressed={preferences.experience === level}
                onClick={() => updatePreference("experience", level)}
              >
                <Text>{level === "BEGINNER" ? "入门" : "进阶"}</Text>
              </Button>
            ))}
          </View>
        </View>
        <View className="form-group">
          <View className="settings-summary-row">
            <Text className="type-label">最长驾车时间</Text>
            <Text className="type-data">
              {preferences.maxDriveMinutes} 分钟
            </Text>
          </View>
          <Slider
            min={30}
            max={360}
            step={30}
            value={preferences.maxDriveMinutes}
            activeColor="var(--primary)"
            backgroundColor="var(--border)"
            blockColor="var(--primary)"
            blockSize={24}
            aria-label="最长驾车时间"
            onChange={(event) =>
              updatePreference("maxDriveMinutes", event.detail.value)
            }
          />
          <Text className="type-caption">
            驾车时间不可用时，此偏好暂不参与选点。
          </Text>
        </View>
        <View className="form-group">
          <Text className="type-label">必须设施</Text>
          <View className="facility-choice-grid">
            {FACILITY_PREFERENCES.map(({ key, label }) => {
              const selected = preferences.requiredFacilities.includes(key);
              return (
                <Button
                  key={key}
                  className={`chip focus-ring${selected ? " chip--selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() =>
                    updatePreference(
                      "requiredFacilities",
                      selected
                        ? preferences.requiredFacilities.filter(
                            (facility) => facility !== key,
                          )
                        : [...preferences.requiredFacilities, key],
                    )
                  }
                >
                  <Text>{label}</Text>
                </Button>
              );
            })}
          </View>
        </View>
      </View>

      <View className="settings-card card">
        <Text className="type-section">可访问性</Text>
        <ToggleField id="large-text-preference" label="大字模式" description="内容重排，不产生页面横向滚动"
          checked={preferences.largeText}
          onChange={(checked) => updatePreference("largeText", checked)}
        />
        <ToggleField id="reduced-motion-preference" label="减少动态" description="减少过渡动画与动态效果"
          checked={preferences.reducedMotion}
          onChange={(checked) => updatePreference("reducedMotion", checked)}
        />
      </View>
    </>
  );
}
