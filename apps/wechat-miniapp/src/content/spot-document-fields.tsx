import { Button, Input, Text, Textarea, View } from "@tarojs/components";
import type { ReactNode } from "react";
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
import "./spot-feedback/index.scss";

export function SpotDocumentFields({
  values,
  disabled,
  baseline,
  onChange,
  addressControl,
  renderPhotoGroup,
  notesFooter,
  textareaFixed = false,
}: {
  values: SpotDocumentValues;
  disabled: boolean;
  baseline?: ContributionFormalBaseline;
  onChange(key: ContributionFormalFieldKey, value: string): void;
  addressControl?: ReactNode;
  renderPhotoGroup?: (kind: ContributionMediaKind) => ReactNode;
  notesFooter?: ReactNode;
  textareaFixed?: boolean;
}) {
  return <>
    <SpotDocumentSection id="formal-feedback-place">
      {addressControl ?? <SpotDocumentField fieldKey="address" value={values.address} baseline={baseline} disabled={disabled} onChange={onChange} required />}
      <Text className="formal-feedback-address-copy">{values.address || "尚未填写地点地址"}</Text>
      <SpotDocumentField fieldKey="name" value={values.name} baseline={baseline} disabled={disabled} onChange={onChange} required />
    </SpotDocumentSection>
    <SpotDocumentSection id="formal-feedback-access" title="开放与到达">
      {(["openness", "hours", "access", "accessNote", "road", "safety"] as const).map((key) =>
        <SpotDocumentField key={key} fieldKey={key} value={values[key]} baseline={baseline} disabled={disabled} onChange={onChange} />)}
    </SpotDocumentSection>
    <SpotDocumentSection id="formal-feedback-facilities" title="设施与现场">
      <Text className="formal-feedback-subtitle">停车设施</Text>
      <SpotDocumentField fieldKey="parking" value={values.parking} baseline={baseline} disabled={disabled} onChange={onChange} />
      <SpotDocumentField fieldKey="parkingNote" value={values.parkingNote} baseline={baseline} disabled={disabled} onChange={onChange} />
      {renderPhotoGroup?.("parking")}
      <Text className="formal-feedback-subtitle">洗手间</Text>
      <SpotDocumentField fieldKey="toilet" value={values.toilet} baseline={baseline} disabled={disabled} onChange={onChange} />
      <SpotDocumentField fieldKey="toiletNote" value={values.toiletNote} baseline={baseline} disabled={disabled} onChange={onChange} />
      {renderPhotoGroup?.("toilet")}
      <Text className="formal-feedback-subtitle">其他场地信息</Text>
      {(["platform", "horizon", "light", "signal", "camping", "contact"] as const).map((key) =>
        <SpotDocumentField key={key} fieldKey={key} value={values[key]} baseline={baseline} disabled={disabled} onChange={onChange} />)}
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

export function SpotDocumentSection({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return <View id={id} className="formal-feedback-section">{title ? <Text className="formal-feedback-section-title">{title}</Text> : null}{children}</View>;
}

export function SpotDocumentField({ fieldKey, value, baseline, disabled, onChange, required = false }: {
  fieldKey: ContributionFormalFieldKey;
  value: string;
  baseline: ContributionFormalBaseline | undefined;
  disabled: boolean;
  onChange(key: ContributionFormalFieldKey, value: string): void;
  required?: boolean;
}) {
  const choices = SPOT_DOCUMENT_CHOICES[fieldKey];
  const changed = Boolean(baseline && value !== (baseline.fields[fieldKey] ?? ""));
  return <View className={`formal-feedback-field formal-feedback-field--${fieldKey}${changed ? " is-changed" : ""}`} data-field={fieldKey}>
    <Text className="formal-feedback-field__label">{SPOT_DOCUMENT_LABELS[fieldKey]}{required ? <Text className="formal-feedback-required"> *</Text> : null}</Text>
    {choices ? <View className="formal-feedback-choices">{choices.map((choice) =>
      <Button key={choice || "unknown"} disabled={disabled} className={value === choice ? "is-selected" : ""} onClick={() => onChange(fieldKey, choice)}>{choice || "不清楚"}</Button>)}</View>
      : <Input disabled={disabled} value={value} maxlength={fieldKey === "detail" ? 2000 : 300} placeholder={SPOT_DOCUMENT_PLACEHOLDERS[fieldKey] ?? ""} placeholderClass="formal-feedback-placeholder" onInput={(event) => onChange(fieldKey, event.detail.value)} />}
  </View>;
}
