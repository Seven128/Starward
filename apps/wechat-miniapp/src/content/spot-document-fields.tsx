import { Button, Input, Text, Textarea, View } from "@tarojs/components";
import type { ReactNode } from "react";
import { SemanticIcon } from "@/components/semantic-asset";
import type {
  ContributionFormalBaseline,
  ContributionFormalFieldKey,
  ContributionMediaKind,
} from "@starward/miniapp-contracts";
import {
  SPOT_DOCUMENT_CHOICES,
  SPOT_DOCUMENT_LABELS,
  SPOT_DOCUMENT_PLACEHOLDERS,
  type SpotDocumentValues,
} from "./spot-document";
import "./spot-document.scss";

const CHOICE_LABELS: Readonly<Record<string, string>> = { "有条件开放": "有条件", "需预约或其他条件": "有条件", "允许进入": "允许", "禁止进入": "禁止", "季节性开放": "季节性" };

export function SpotDocumentFields({
  values,
  disabled,
  baseline,
  onChange,
  addressControl,
  renderPhotoGroup,
  notesFooter,
  textareaFixed = false,
  renderField,
}: {
  values: SpotDocumentValues;
  disabled: boolean;
  baseline?: ContributionFormalBaseline;
  onChange(key: ContributionFormalFieldKey, value: string): void;
  addressControl?: ReactNode;
  renderPhotoGroup?: (kind: ContributionMediaKind) => ReactNode;
  notesFooter?: ReactNode;
  textareaFixed?: boolean;
  renderField?: (key: ContributionFormalFieldKey) => ReactNode | undefined;
}) {
  return <>
    <SpotDocumentSection id="formal-feedback-place">
      {addressControl ?? <SpotDocumentAddressControl disabled={disabled} changed={Boolean(baseline && values.address !== (baseline.fields.address ?? ""))} onClear={() => onChange("address", "")}>
        <Input disabled={disabled} ariaLabel="搜索地址" value={values.address} maxlength={300}
          placeholder={SPOT_DOCUMENT_PLACEHOLDERS.address ?? ""} placeholderClass="formal-feedback-placeholder"
          onInput={event => onChange("address", event.detail.value)} />
      </SpotDocumentAddressControl>}
      <Text className="formal-feedback-address-copy">{values.address || (renderField ? "地址资料未提供" : "尚未填写地点地址")}</Text>
      {renderField?.("name") ?? <SpotDocumentField fieldKey="name" value={values.name} baseline={baseline} disabled={disabled} onChange={onChange} required />}
    </SpotDocumentSection>
    <SpotDocumentSection id="formal-feedback-access" title="开放与到达">
      <View className="formal-feedback-group">{(["openness", "hours", "access", "accessNote", "road", "safety"] as const).map((key) =>
        renderField?.(key) ?? <SpotDocumentField key={key} fieldKey={key} value={values[key]} baseline={baseline} disabled={disabled} onChange={onChange} />)}</View>
    </SpotDocumentSection>
    <SpotDocumentSection id="formal-feedback-facilities" title="设施与现场">
      <View className="formal-feedback-group"><Text className="formal-feedback-subtitle">停车设施</Text>
      <SpotDocumentField fieldKey="parking" value={values.parking} baseline={baseline} disabled={disabled} onChange={onChange} />
      <SpotDocumentField fieldKey="parkingNote" value={values.parkingNote} baseline={baseline} disabled={disabled} onChange={onChange} />
      {renderPhotoGroup?.("parking")}</View>
      <View className="formal-feedback-group"><Text className="formal-feedback-subtitle">洗手间</Text>
      <SpotDocumentField fieldKey="toilet" value={values.toilet} baseline={baseline} disabled={disabled} onChange={onChange} />
      <SpotDocumentField fieldKey="toiletNote" value={values.toiletNote} baseline={baseline} disabled={disabled} onChange={onChange} />
      {renderPhotoGroup?.("toilet")}</View>
      <View className="formal-feedback-group"><Text className="formal-feedback-subtitle">其他场地信息</Text>
      {(["platform", "horizon", "light", "signal", "camping", "contact"] as const).map((key) =>
        renderField?.(key) ?? <SpotDocumentField key={key} fieldKey={key} value={values[key]} baseline={baseline} disabled={disabled} onChange={onChange} />)}</View>
    </SpotDocumentSection>
    <SpotDocumentSection id="formal-feedback-notes" title="补充说明">
      <Textarea
        className={`formal-feedback-textarea${baseline && values.detail !== (baseline.fields.detail ?? "") ? " is-changed" : ""}`}
        disabled={disabled}
        fixed={textareaFixed}
        value={values.detail}
        maxlength={2000}
        placeholder={SPOT_DOCUMENT_PLACEHOLDERS.detail ?? ""}
        placeholderClass="formal-feedback-placeholder"
        onInput={(event) => onChange("detail", event.detail.value)}
      />
      {renderPhotoGroup?.("site")}
      {notesFooter}
    </SpotDocumentSection>
  </>;
}

/** The location picker and editable formal address share presentation, not data ownership. */
export function SpotDocumentAddressControl({ children, disabled, changed = false, onClear }: {
  children: ReactNode; disabled: boolean; changed?: boolean; onClear(): void;
}) {
  return <View className="formal-feedback-address" data-field="address">
    <Text className="formal-feedback-field__label">地点地址 <Text className="formal-feedback-required">*</Text></Text>
    <View className={`formal-feedback-address__control${changed ? " is-changed" : ""}`}>
      <SemanticIcon name="search" className="formal-feedback-address__search" />
      {children}
      <Button className="formal-feedback-address__clear" disabled={disabled} ariaLabel="清除地址" onClick={onClear}>
        <SemanticIcon name="close" />
      </Button>
    </View>
  </View>;
}

export function SpotDocumentSection({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return <View id={id} className="formal-feedback-section">{title ? <Text className="formal-feedback-section-title">{title}</Text> : null}{children}</View>;
}

export function SpotDocumentField({ fieldKey, value, baseline, disabled, onChange, required = false, error, focus = false, label }: {
  fieldKey: ContributionFormalFieldKey;
  value: string;
  baseline: ContributionFormalBaseline | undefined;
  disabled: boolean;
  onChange(key: ContributionFormalFieldKey, value: string): void;
  required?: boolean;
  error?: string | undefined;
  focus?: boolean;
  label?: string;
}) {
  const choices = SPOT_DOCUMENT_CHOICES[fieldKey];
  const changed = Boolean(baseline && value !== (baseline.fields[fieldKey] ?? ""));
  return <View className={`formal-feedback-field formal-feedback-field--${fieldKey}${changed ? " is-changed" : ""}${error ? " candidate-intake-input" : ""}`} data-field={fieldKey}>
    <Text className="formal-feedback-field__label">{label ?? SPOT_DOCUMENT_LABELS[fieldKey]}{required ? <Text className="formal-feedback-required"> *</Text> : null}</Text>
    {choices ? <View className="formal-feedback-choices">{choices.map((choice) =>
      <Button key={choice || "unknown"} disabled={disabled} ariaLabel={`${label ?? SPOT_DOCUMENT_LABELS[fieldKey]}：${choice || "不清楚"}`} aria-pressed={value === choice} className={value === choice ? "is-selected" : ""} onClick={() => onChange(fieldKey, choice)}><Text>{CHOICE_LABELS[choice] ?? (choice || "不清楚")}</Text></Button>)}</View>
      : <Input disabled={disabled} focus={focus} ariaLabel={label ?? SPOT_DOCUMENT_LABELS[fieldKey]} value={value} maxlength={fieldKey === "detail" ? 2000 : 300} placeholder={SPOT_DOCUMENT_PLACEHOLDERS[fieldKey] ?? ""} placeholderClass="formal-feedback-placeholder" onInput={(event) => onChange(fieldKey, event.detail.value)} />}
    {error ? <View className="candidate-intake-error" role="alert"><Text>{error}</Text></View> : null}
  </View>;
}
