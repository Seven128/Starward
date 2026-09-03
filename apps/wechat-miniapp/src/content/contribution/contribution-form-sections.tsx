import {
  Button,
  Input,
  Picker,
  Switch,
  Text,
  Textarea,
  View,
} from "@tarojs/components";
import { useEffect, useState } from "react";
import { SoftButton } from "@/components/soft-button";
import { KIND_LABEL, TOPICS } from "./contribution-model";
import type { ContributionCommands } from "./use-contribution-commands";
import type { ContributionForm } from "./use-contribution-form";

const KIND_COPY = {
  FIELD_REPORT: "开放、路线、照明、天气或安全变化",
  CORRECTION: "指出正式地点资料中的具体错误",
  NEW_SPOT_PROPOSAL: "提交候选位置与证据，不直接创建地点",
} as const;

export function ContributionContextSection({
  form,
}: {
  form: ContributionForm;
}) {
  const [spotChoice, setSpotChoice] = useState<"FORMAL" | "NEW">(
    form.hasFormalSpot ? "FORMAL" : "NEW",
  );
  useEffect(() => {
    if (form.hasFormalSpot) setSpotChoice("FORMAL");
  }, [form.hasFormalSpot]);
  const hasSpotContext = form.hasFormalSpot || spotChoice === "FORMAL";
  const kinds = hasSpotContext
    ? (["FIELD_REPORT", "CORRECTION", "NEW_SPOT_PROPOSAL"] as const)
    : (["NEW_SPOT_PROPOSAL"] as const);
  return (
    <View className="contribution-card card">
      <Text className="type-section">反馈对象</Text>
      <View
        className="contribution-context"
        data-od-id="contribution-spot-context"
        data-control="contribution-spot-context"
      >
        {form.hasFormalSpot ? (
          <Text className="type-label">
            {form.routeSpotName || "当前正式观星点"}
          </Text>
        ) : null}
        {form.hasFormalSpot ? (
          <Text className="type-caption">
            {form.kind === "NEW_SPOT_PROPOSAL"
              ? "新增地点将使用独立候选位置，不会改写当前正式观星点"
              : "已从详情继承点位，不会改报到其他地点"}
          </Text>
        ) : (
          <>
            <Text className="type-caption">
              从“我的”进入时可选择已确认的正式观星点，或保持为独立新增地点提议。
              正式点位的现场反馈仍不会读取当前位置。
            </Text>
            <View className="contribution-spot-choice" role="radiogroup" aria-label="反馈地点类型">
            <Button
              className={`chip focus-ring${spotChoice === "FORMAL" ? " chip--selected" : ""}`}
              aria-pressed={spotChoice === "FORMAL"}
              onClick={() => setSpotChoice("FORMAL")}
            >
              <Text>选择正式观星点</Text>
            </Button>
            <Button
              className={`chip focus-ring${spotChoice === "NEW" ? " chip--selected" : ""}`}
              aria-pressed={spotChoice === "NEW"}
              onClick={() => setSpotChoice("NEW")}
            >
              <Text>新地点</Text>
            </Button>
            </View>
            {spotChoice === "FORMAL" ? (
              <View className="contribution-formal-spot-fields">
              <View className="form-group">
                <Text className="type-label">正式 spot_id</Text>
                <Input
                  className="field"
                  data-od-id="contribution-formal-spot-id"
                  focus={form.validationField === "contribution-spot-context"}
                  value={form.routeSpotId}
                  maxlength={180}
                  placeholder="spot:…"
                  onInput={(event) => form.setRouteSpotId(event.detail.value)}
                />
              </View>
              <View className="form-group">
                <Text className="type-label">点位名称（可选）</Text>
                <Input
                  className="field"
                  value={form.routeSpotName}
                  maxlength={120}
                  placeholder="便于确认当前点位"
                  onInput={(event) => form.setRouteSpotName(event.detail.value)}
                />
              </View>
              {!form.hasFormalSpot ? (
                <Text className="type-caption contribution-inline-warning">
                  请输入已确认且以 spot: 开头的 ID；没有可确认的 ID 时请改选新地点。
                </Text>
              ) : null}
              </View>
            ) : null}
          </>
        )}
      </View>
      <View
        className="contribution-choice-grid"
        data-od-id="contribution-kind-control"
        data-control="contribution-kind-control"
      >
        {kinds.map((item) => (
          <Button
            key={item}
            className={`contribution-kind-choice focus-ring${form.kind === item ? " contribution-kind-choice--selected" : ""}`}
            aria-pressed={form.kind === item}
            onClick={() => form.selectKind(item)}
          >
            <Text className="type-label">{KIND_LABEL[item]}</Text>
            <Text className="type-caption">{KIND_COPY[item]}</Text>
          </Button>
        ))}
      </View>
      {form.matchingDraft ? (
        <View
          className="contribution-draft-recovery"
          data-od-id="contribution-draft-recovery"
        >
          <Text className="type-label">这里有一份未完成草稿</Text>
          <Text className="type-caption">
            rev.{form.matchingDraft.revision} · 已绑定当前微信身份
          </Text>
          <View className="contribution-draft-recovery__actions">
            <SoftButton label="继续草稿" onClick={() => form.applyDraft(form.matchingDraft!)}>
              继续草稿
            </SoftButton>
            <SoftButton label="稍后处理" onClick={form.goBackPhase}>
              稍后
            </SoftButton>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function ContributionLocationSection({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  if (form.kind !== "NEW_SPOT_PROPOSAL") return null;
  return (
    <View
      className="contribution-card contribution-location-card card"
      data-od-id="contribution-location-consent"
      data-control="contribution-location-consent"
    >
      <Text className="type-section">建议地点</Text>
      <View className="form-group">
        <Text className="type-label">地点名称</Text>
        <Input
          className="field contribution-candidate-name"
          data-od-id="contribution-candidate-name"
          focus={form.validationField === "contribution-candidate-name"}
          value={form.candidateName}
          maxlength={120}
          placeholder="例如：某山顶观景台"
          onInput={(event) => form.setCandidateName(event.detail.value)}
        />
        {form.validationField === "contribution-candidate-name" ? (
          <FieldError>请填写地点名称。</FieldError>
        ) : null}
      </View>
      <View className="form-group">
        <Text className="type-label">地区</Text>
        <Input
          className="field contribution-candidate-region"
          data-od-id="contribution-candidate-region"
          focus={form.validationField === "contribution-candidate-region"}
          value={form.candidateRegion}
          maxlength={120}
          placeholder="城市 / 区域"
          onInput={(event) => form.setCandidateRegion(event.detail.value)}
        />
        {form.validationField === "contribution-candidate-region" ? (
          <FieldError>请填写地区。</FieldError>
        ) : null}
      </View>
      <View className="contribution-coordinate-grid">
        <CoordinateField
          label="纬度"
          odId="contribution-candidate-latitude"
          value={form.latitude}
          placeholder="22.000000"
          focus={form.validationField === "contribution-candidate-latitude"}
          onInput={form.setLatitude}
        />
        <CoordinateField
          label="经度"
          odId="contribution-candidate-longitude"
          value={form.longitude}
          placeholder="114.000000"
          focus={form.validationField === "contribution-candidate-longitude"}
          onInput={form.setLongitude}
        />
      </View>
      <SoftButton
        label="使用一次当前位置"
        onClick={() => void commands.useCurrentLocation()}
      >
        使用一次当前位置
      </SoftButton>
      <View className="contribution-switch-row">
        <View>
          <Text className="type-label">同意提交该精确坐标</Text>
          <Text className="type-caption">
            审核前不公开；敏感地点可转为模糊或隐藏坐标
          </Text>
        </View>
        <Switch
          className="contribution-coordinate-consent"
          data-od-id="contribution-coordinate-consent"
          checked={form.preciseLocationConsent}
          color="var(--primary)"
          aria-label="同意提交新增地点精确坐标"
          onChange={(event) =>
            form.setPreciseLocationConsent(event.detail.value)
          }
        />
      </View>
      {form.validationField === "contribution-candidate-latitude" ||
      form.validationField === "contribution-candidate-longitude" ? (
        <FieldError>请输入有效的纬度和经度。</FieldError>
      ) : null}
      {form.validationField === "contribution-location-consent" ? (
        <FieldError>提交新增地点前需要明确同意提交该坐标。</FieldError>
      ) : null}
    </View>
  );
}

function CoordinateField({
  label,
  odId,
  value,
  placeholder,
  focus = false,
  onInput,
}: {
  label: string;
  odId: string;
  value: string;
  placeholder: string;
  focus?: boolean;
  onInput: (value: string) => void;
}) {
  return (
    <View className="form-group">
      <Text className="type-label">{label}</Text>
      <Input
        className={`field ${odId}`}
        data-od-id={odId}
        focus={focus}
        type="digit"
        value={value}
        placeholder={placeholder}
        onInput={(event) => onInput(event.detail.value)}
      />
    </View>
  );
}

export function ContributionEvidenceSection({
  form,
}: {
  form: ContributionForm;
}) {
  return (
    <View className="contribution-card card">
      <View
        className="contribution-date-grid"
        data-od-id="contribution-observed-at"
        data-control="contribution-observed-at"
      >
        <DateTimeField
          mode="date"
          label="现场日期"
          value={form.date}
          onChange={form.setDate}
        />
        <DateTimeField
          mode="time"
          label="现场时间"
          value={form.time}
          onChange={form.setTime}
        />
      </View>
      <View className="form-group" data-od-id="contribution-topic-control" data-control="contribution-topic-control">
        <Text className="type-label">涉及事实（可多选）</Text>
        {form.validationField === "contribution-topic-control" ? (
          <FieldError>至少选择一项事实。</FieldError>
        ) : null}
        <View className="contribution-topic-grid">
          {TOPICS.map(({ key, label }) => (
            <Button
              key={key}
              className={`chip focus-ring${form.topics.includes(key) ? " chip--selected" : ""}`}
              aria-pressed={form.topics.includes(key)}
              onClick={() => form.toggleTopic(key)}
            >
              <Text>{label}</Text>
            </Button>
          ))}
        </View>
      </View>
      <View className="form-group">
        <Text className="type-label">现场依据或纠错说明</Text>
        <Textarea
          className="field contribution-textarea"
          data-od-id="contribution-detail"
          focus={form.validationField === "contribution-detail"}
          value={form.detail}
          maxlength={2000}
          placeholder="写清看到什么、何时发生、与页面现有信息哪里一致或不一致（至少 20 字）"
          onInput={(event) => form.setDetail(event.detail.value)}
        />
        <Text className="type-caption">
          {form.detail.trim().length}/2000；不要填写手机号、车牌或他人身份信息
        </Text>
        {form.validationField === "contribution-detail" ? (
          <FieldError>请至少填写 20 个字的现场依据。</FieldError>
        ) : null}
      </View>
    </View>
  );
}

function FieldError({ children }: { children: string }) {
  return <Text className="contribution-field-error">{children}</Text>;
}

function DateTimeField({
  mode,
  label,
  value,
  onChange,
}: {
  mode: "date" | "time";
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="form-group">
      <Text className="type-label">{label}</Text>
      <Picker
        mode={mode}
        value={value}
        onChange={(event) => onChange(event.detail.value)}
      >
        <View className="field focus-ring">
          <Text>{value}</Text>
        </View>
      </Picker>
    </View>
  );
}
