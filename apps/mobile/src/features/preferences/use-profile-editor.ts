import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { useEffect, useRef, useState, type BaseSyntheticEvent } from "react";
import type { PreferenceProfile } from "@starward/domain/preferences";
import { PreferenceProfileRevisionConflict } from "../../state/preference-save-result";
import { createProfileSaveAttempt } from "./profile-save-attempt";
import { preferenceProfileSchema } from "./profile-schema";
import { canonicalJson } from "../../../../../packages/domain/src/preferences/runtime-json";

const revisionIdentity = (profile: PreferenceProfile) => JSON.stringify([profile.id, profile.revision]);

/** A profile editor owns its full draft and original save attempt. Compact and
 * complete field adapters share incoming-version, close/reopen and retry rules. */
export function useProfileEditor({ initial, visible, ready = true, onSave, resolveProfile, resolver = zodResolver(preferenceProfileSchema) }: {
  initial: PreferenceProfile;
  visible: boolean;
  ready?: boolean;
  onSave(profile: PreferenceProfile): Promise<void>;
  resolveProfile?(id: string): PreferenceProfile | undefined;
  resolver?: Resolver<PreferenceProfile>;
}) {
  const attempt = useRef(createProfileSaveAttempt());
  const submittedIdentity = useRef<string | null>(null);
  const confirmsOriginalInput = (identity: string) => attempt.current.hasUnresolvedSave() && identity === submittedIdentity.current;
  const form = useForm<PreferenceProfile>({
    // RHF passes its live values to resolvers. Freeze our complete submission
    // before an asynchronous resolver can observe later edits or source changes.
    resolver: (values, context, options) => {
      const identity = canonicalJson(values);
      const snapshot = JSON.parse(identity) as PreferenceProfile;
      // Confirmation replays the original qualified candidate. A different field
      // view must not normalize or newly reject its unchanged input; new edits
      // still pass through that view's resolver before a candidate is created.
      return confirmsOriginalInput(identity) ? { values: snapshot, errors: {} } : resolver(snapshot, context, options);
    },
    defaultValues: initial,
  });
  // Subscribe to dirtyFields as well: keepDirtyValues needs its tracked field
  // ownership when an explicit conflict retry adopts the current full profile.
  const { isDirty, isSubmitting, dirtyFields } = form.formState;
  void dirtyFields;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submissionEpoch, setSubmissionEpoch] = useState(0);
  const submitting = useRef(false);
  const baseline = useRef(initial);
  const knownRevision = useRef({ id: initial.id, revision: initial.revision });
  const conflict = useRef<{ id: string; revision: number } | null>(null);
  const wasVisible = useRef(visible);
  const session = useRef(Symbol());
  const incoming = useRef(initial); incoming.current = initial;
  const resolveCurrent = useRef(resolveProfile); resolveCurrent.current = resolveProfile;

  useEffect(() => {
    const opened = visible && !wasVisible.current;
    if (visible !== wasVisible.current) session.current = Symbol();
    wasVisible.current = visible;
    if (!visible || submitting.current || isDirty || isSubmitting || attempt.current.hasUnresolvedSave()) return;
    if (opened || revisionIdentity(initial) !== revisionIdentity(baseline.current)) {
      baseline.current = initial;
      knownRevision.current = { id: initial.id, revision: initial.revision };
      conflict.current = null; attempt.current = createProfileSaveAttempt(); submittedIdentity.current = null;
      form.reset(initial); setSaveError(null);
    }
  }, [visible, initial, isDirty, isSubmitting, form.reset, submissionEpoch]);

  const readCurrent = () => {
    if (submitting.current) return;
    if (attempt.current.hasUnresolvedSave()) { setSaveError("上次保存尚未确认，请先重试原保存。"); return; }
    baseline.current = incoming.current;
    knownRevision.current = { id: incoming.current.id, revision: incoming.current.revision };
    conflict.current = null; attempt.current = createProfileSaveAttempt(); submittedIdentity.current = null;
    form.reset(incoming.current); setSaveError(null);
  };

  const submit = async (event?: BaseSyntheticEvent, isCurrent: () => boolean = () => true): Promise<PreferenceProfile | undefined> => {
    if (submitting.current) return;
    // Lock before RHF's asynchronous validation. A conflict reset can briefly
    // make the form pristine; it must not let another current profile adopt it.
    submitting.current = true;
    const owner = session.current;
    const targetId = form.getValues("id");
    const saveAttempt = attempt.current;
    let completed: PreferenceProfile | undefined;
    try {
      if (!ready) { setSaveError("本机偏好尚未恢复，请先重试读取。"); return; }
      // The preceding rejected save established this conflict. Only this next
      // explicit save merges still-dirty fields with its authoritative readback;
      // a changed incoming version alone never silently rebases a draft.
      if (conflict.current?.id === targetId) {
        const current = resolveCurrent.current?.(targetId) ?? (incoming.current.id === targetId ? incoming.current : undefined);
        if (!current || current.id !== targetId || current.revision < conflict.current.revision) {
          setSaveError("当前预设尚未读取，原编辑已保留。请先重新读取。"); return;
        }
        form.reset(current, { keepDirtyValues: true });
        baseline.current = current;
        knownRevision.current = { id: targetId, revision: current.revision };
        conflict.current = null;
      }
      const revision = knownRevision.current.id === targetId ? knownRevision.current.revision : 0;
      const draftIdentity = canonicalJson(form.getValues());
      await form.handleSubmit(async value => {
        if (value.id !== targetId || session.current !== owner || !isCurrent()) return;
        submittedIdentity.current = draftIdentity;
        setSaveError(null);
        try {
          const saved = await saveAttempt.save(draftIdentity, () => ({
            ...value,
            revision: Math.max(value.revision, revision) + 1,
            updatedAt: new Date().toISOString(),
          }), onSave);
          const latest = form.getValues();
          let unchanged = false;
          try { unchanged = canonicalJson(latest) === draftIdentity; } catch { /* A newer invalid draft remains editable. */ }
          if (latest.id === saved.id) {
            baseline.current = saved;
            knownRevision.current = { id: saved.id, revision: saved.revision };
            form.reset(saved);
            if (!unchanged) form.reset({ ...latest, revision: saved.revision, createdAt: saved.createdAt, updatedAt: saved.updatedAt }, { keepDefaultValues: true });
          }
          if (session.current === owner && unchanged) completed = saved;
        } catch (error) {
          if (error instanceof PreferenceProfileRevisionConflict) {
            conflict.current = { id: error.profileId, revision: error.currentRevision };
            if (session.current === owner) setSaveError("此预设已有新版本。草稿已保留，请核对后再次保存。");
          } else if (session.current === owner) setSaveError("保存结果未确认，输入已保留。请重试。");
        }
      })(event);
      return completed;
    } finally {
      submitting.current = false;
      setSubmissionEpoch(epoch => epoch + 1);
    }
  };

  // The attempt remains the sole candidate owner. This identity only presents
  // whether the next explicit action replays it or submits genuinely new edits.
  const draft = form.watch();
  let confirmsOriginalSave = false;
  try { confirmsOriginalSave = confirmsOriginalInput(canonicalJson(draft)); } catch { /* Invalid newer input is a new edit. */ }

  return {
    ...form, submit, saveError, readCurrent,
    sourceChanged: revisionIdentity(initial) !== revisionIdentity(baseline.current),
    get hasUnresolvedSave() { return attempt.current.hasUnresolvedSave(); },
    confirmsOriginalSave,
  };
}

export type ProfileEditor = ReturnType<typeof useProfileEditor>;
