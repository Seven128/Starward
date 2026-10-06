import { Button, Input, Text, View } from "@tarojs/components";
import type { ContributionFormalFieldKey } from "@starward/miniapp-contracts";
import { ToggleField } from "@/components/toggle-field";
import { SpotDocumentField } from "../spot-document-fields";
import { CANDIDATE_INTAKE_ERRORS, CANDIDATE_INTAKE_OPTIONS } from "./candidate-document";
import type { ContributionForm } from "./use-contribution-form";

/** Only the new-point variant replaces core answers; formal feedback retains its original fields. */
export function CandidateIntakeField({ fieldKey, form }: { fieldKey: ContributionFormalFieldKey; form: ContributionForm }) {
  const intake = form.candidateIntake;
  const error = (field: string) => form.validationField === `contribution-intake-${field}`
    ? Object.values(CANDIDATE_INTAKE_ERRORS).find(item => item.field === field)?.message : undefined;
  const updateField = (key: ContributionFormalFieldKey, value: string) => {
    form.setCandidateField(key, value);
    if ((key === "accessNote" || key === "safety") && value.trim() && form.validationField === `contribution-intake-${key}`) {
      form.setValidationField(null);
    }
  };
  if (fieldKey === "name") return <SpotDocumentField fieldKey="name" value={form.candidateFields.name} baseline={undefined} disabled={form.commandBusy}
    required onChange={form.setCandidateField} focus={form.validationField === "contribution-candidate-name"}
    error={form.validationField === "contribution-candidate-name" ? "请填写地点名称。" : undefined} />;
  const choices = <T extends string,>(field: string, label: string, options: readonly (readonly [T, string])[], value: T | null, onSelect: (next: T) => void) =>
    <View id={`contribution-intake-${field}`} className="candidate-intake-group" data-field={field} key={field}>
      <Text className="formal-feedback-field__label">{label}<Text className="formal-feedback-required"> *</Text></Text>
      <View className="formal-feedback-choices candidate-intake-choices" role="radiogroup" ariaLabel={label}>
        {options.map(([key, title]) => <Button key={key} disabled={form.commandBusy} className={value === key ? "is-selected" : ""}
          aria-pressed={value === key} ariaLabel={`${label}：${title}`} onClick={() => { if (value === key) return; onSelect(key); form.setValidationField(null); }}>{title}</Button>)}
      </View>
      {error(field) ? <View className="candidate-intake-error" role="alert"><Text>{error(field)}</Text></View> : null}
    </View>;
  if (fieldKey === "openness") return choices("openness", "开放状态", CANDIDATE_INTAKE_OPTIONS.openness, intake.openness,
    next => form.setCandidateIntake(current => ({ ...current, openness: next })));
  if (fieldKey === "access") return choices("access", "进入规则", CANDIDATE_INTAKE_OPTIONS.legalEntry, intake.legalEntry,
    next => form.setCandidateIntake(current => ({ ...current, legalEntry: next })));
  if (fieldKey === "safety") return <View key="safety">
    {choices("nightSafety", "夜间安全情况", CANDIDATE_INTAKE_OPTIONS.nightSafety, intake.nightSafety,
      next => form.setCandidateIntake(current => ({ ...current, nightSafety: next })))}
    <View id="contribution-intake-safety"><SpotDocumentField fieldKey="safety" label="风险与安全说明" value={form.candidateFields.safety} baseline={undefined} disabled={form.commandBusy}
      onChange={updateField} focus={Boolean(error("safety"))} error={error("safety")} /></View>
  </View>;
  if (fieldKey === "contact") {
    const update = (key: "number" | "purpose" | "source", value: string) => {
      form.setCandidateIntake(current => ({ ...current, contact: { ...current.contact, [key]: value } })); form.setValidationField(null);
    };
    return <View key="contact">
      {choices("contact", "门禁或管理方联系", CANDIDATE_INTAKE_OPTIONS.contact, intake.contact.kind, next =>
        form.setCandidateIntake(current => ({ ...current, contact: { kind: next, number: "", purpose: "", source: "", publicPermissionConfirmed: false,
          ...(current.contact.legacyNote ? { legacyNote: current.contact.legacyNote } : {}) } })))}
      {intake.contact.kind === "PUBLIC_NUMBER" ? <>
        {([["number", "公开号码", 80], ["purpose", "联系用途", 200], ["source", "号码出处", 300]] as const).map(([key, title, maximum]) =>
          <View id={`contribution-intake-contact-${key}`} className="formal-feedback-field candidate-intake-input" key={key}>
            <Text className="formal-feedback-field__label">{title}<Text className="formal-feedback-required"> *</Text></Text>
            <Input disabled={form.commandBusy} value={intake.contact[key]} maxlength={maximum} ariaLabel={title} focus={Boolean(error(`contact-${key}`))}
              placeholder={key === "number" ? "管理方可公开的电话号码" : key === "purpose" ? "如预约、入场或安全咨询" : "如管理方公开告示或官方网站"}
              placeholderClass="formal-feedback-placeholder" onInput={event => update(key, event.detail.value)} />
            {error(`contact-${key}`) ? <View className="candidate-intake-error" role="alert"><Text>{error(`contact-${key}`)}</Text></View> : null}
          </View>)}
        <View id="contribution-intake-contact-permission"><ToggleField disabled={form.commandBusy} id="contribution-contact-permission" label="管理方允许公开此号码" checked={intake.contact.publicPermissionConfirmed}
          description="仅提交管理方的公开号码，不填写个人账号或私人电话。" onChange={value => { form.setCandidateIntake(current => ({ ...current, contact: { ...current.contact, publicPermissionConfirmed: value } })); form.setValidationField(null); }}
          stateLabels={{ checked: "已确认", unchecked: "未确认" }} />
        {error("contact-permission") ? <View className="candidate-intake-error" role="alert"><Text>{error("contact-permission")}</Text></View> : null}</View>
      </> : null}
      {intake.contact.legacyNote ? <View className="candidate-intake-legacy"><Text className="type-caption">原联系说明（未作公开许可）</Text><Text className="type-body">{intake.contact.legacyNote}</Text></View> : null}
    </View>;
  }
  const field = <SpotDocumentField fieldKey={fieldKey} value={form.candidateFields[fieldKey]} baseline={undefined} disabled={form.commandBusy}
    onChange={updateField} focus={Boolean(error(fieldKey))} error={error(fieldKey)} />;
  return fieldKey === "accessNote" ? <View id="contribution-intake-accessNote">{field}</View> : field;
}
