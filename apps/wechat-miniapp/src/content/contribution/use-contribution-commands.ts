import Taro from "@tarojs/taro";
import { choosePlatformLocation } from "@/services/platform-location";
import { useRedLightHandoff } from "@/components/red-light-handoff";
import { ContributionSubmitStorageError } from "@/services/contribution-submit-retry";
import { useRef } from "react";
import { createContributionCommandLock } from "./command-lock";
import { createContributionAccountGuard } from "./account-guard";
import type {
  ContributionMediaKind,
  ContributionMediaUpload,
  ContributionDraftRequest,
  ContributionSubmission,
  ContributionUploadId,
} from "@starward/miniapp-contracts";
import {
  completeContributionUpload,
  removeContributionUpload,
  currentDraftUserId,
  getContributions,
  createContributionDraft,
  createContributionUpload,
  errorMessage,
  MiniappApiError,
  submitContribution,
  updateContributionDraft,
  withdrawContributionDraft,
} from "@/services/api-client";
import {
  contributionSubmissionState,
  mediaFileName,
  mediaMimeType,
  readBase64,
} from "./contribution-model";
import { MEDIA_RIGHTS_MODAL } from "./media-rights-modal";
import type { ContributionForm } from "./use-contribution-form";

function activeDraft(form: ContributionForm) {
  const current = form.draft;
  if (current && ["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(contributionSubmissionState(current)))
    return current;
  return form.matchingDraft;
}

function createSaveDraft(form: ContributionForm, assertAccount: () => void) {
  return async (quiet = false, inputPatch: Partial<ContributionDraftRequest> = {}) => {
    if (!form.draft && form.matchingDraft) {
      form.announce("warning", "请先继续已有草稿", "这里已有未完成草稿。请先点击“继续草稿”核对内容，再补充或保存。");
      return null;
    }
    if (form.conflictDraft) {
      form.announce("warning", "请先核对草稿", "草稿已在其他位置更新，请核对下方服务端内容后再保存。");
      return null;
    }
    const formValue = form.formInput();
    if (!formValue) return null;
    const input = { ...formValue, ...inputPatch };
    form.setSaving(true);
    try {
      assertAccount();
      const active = activeDraft(form);
      const response = active
        ? await updateContributionDraft(active.submissionId, {
            ...input,
            expectedRevision: active.revision,
          })
        : await createContributionDraft(input);
      assertAccount();
      form.applyDraft(response.data, form.phase);
      await form.history.refetch().catch(() => undefined);
      assertAccount();
      if (!quiet && form.kind !== "NEW_SPOT_PROPOSAL")
        form.announce(
          "success",
          "草稿已保存",
          "本页内容已保存，可继续编辑或提交审核。",
        );
      return response.data;
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const current = await form.history.refetch().catch(() => undefined);
        assertAccount();
        const id = activeDraft(form)?.submissionId;
        const latest = current?.data.submissions.find((item) => item.submissionId === id);
        if (latest) form.setConflictDraft(latest);
        else {
          form.announce(
            "error",
            "暂时无法核对草稿",
            current
              ? "该草稿已不在当前账号的记录中。本页输入完整保留，请先返回近期反馈核对记录。"
              : "草稿已更新，但最新内容暂时未能读取。本页输入完整保留，恢复网络后可再次保存以重新核对。",
          );
          return null;
        }
      }
      form.announce(
        "error",
        "草稿保存失败",
        `${errorMessage(error)}；本页输入完整保留，可重试。`,
      );
      return null;
    } finally {
      form.setSaving(false);
    }
  };
}

async function chooseImage(count: number) {
  try {
    return await Taro.chooseImage({
      count,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : error && typeof error === "object" && "errMsg" in error
        ? String(error.errMsg)
        : String(error);
    if (/cancel/iu.test(message))
      return null;
    throw error;
  }
}

function validateMediaFile(file: { path: string; size?: number }) {
  if (typeof file.size !== "number" || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 1_200_000)
    throw new Error("单张图片必须小于 1.2 MB");
  return {
    originalName: mediaFileName(file.path),
    mimeType: mediaMimeType(file.path),
    byteSize: file.size,
  };
}

async function uploadSelectedFile(
  form: ContributionForm,
  working: ContributionSubmission,
  file: { path: string; size?: number },
  existingUpload: ContributionMediaUpload | undefined,
  assertAccount: () => void,
  kind?: ContributionMediaKind,
) {
  assertAccount();
  const input = validateMediaFile(file);
  let current = working;
  let upload = existingUpload;
  if (upload?.state === "PENDING" && (upload.mimeType !== input.mimeType || upload.declaredByteSize !== input.byteSize)) {
    throw new Error("续传需要重新选择原来的图片；所选图片的格式或大小与上传记录不符。");
  }
  if (!upload || upload.state === "EXPIRED") {
    const created = await createContributionUpload(current.submissionId, {
      ...input,
      ...(kind ? { kind } : {}),
      expectedRevision: current.revision,
      ...(upload?.state === "EXPIRED" ? { replaceUploadId: upload.uploadId } : {}),
    });
    assertAccount();
    current = created.data;
    const knownIds = new Set(working.media.map((item) => item.uploadId));
    upload = current.media.find((item) => !knownIds.has(item.uploadId));
    if (!upload) throw new Error("上传会话未建立");
    form.applyMediaDraft(current);
  }
  const dataBase64 = await readBase64(file.path);
  assertAccount();
  const completed = await completeContributionUpload(
    current.submissionId,
    upload.uploadId,
    { dataBase64 },
  );
  assertAccount();
  if (kind) form.setCandidateMediaPreview(upload.uploadId, file.path);
  form.applyMediaDraft(completed.data);
  return completed.data;
}

function createUseCurrentLocation(form: ContributionForm, assertAccount: () => void) {
  return async () => {
    const confirmation = await Taro.showModal({
      title: "使用一次当前位置？",
      content: "只用于本次新增地点建议；不会持续定位，也不会在审核前公开精确坐标。",
      confirmText: "使用一次",
    });
    if (!confirmation.confirm) return;
    try {
      assertAccount();
      const location = await Taro.getLocation({ type: "wgs84" });
      assertAccount();
      form.selectCandidateLocation({
        name: "",
        address: "",
        latitude: location.latitude,
        longitude: location.longitude,
      });
      form.setPreciseLocationConsent(true);
      form.announce(
        "success",
        "已填入当前位置",
        "坐标只进入当前草稿，提交前仍可修改或取消。",
      );
    } catch (error) {
      form.announce(
        "warning",
        "未取得位置",
        `${errorMessage(error)}；可以继续手动填写坐标。`,
      );
    }
  };
}

function createAddMedia(
  form: ContributionForm,
  saveDraft: ReturnType<typeof createSaveDraft>,
  assertAccount: () => void,
  confirmHandoff: (message: string) => Promise<boolean>,
) {
  return async (kind?: ContributionMediaKind) => {
    if (!form.rightsConfirmed && !kind) {
      form.announce(
        "warning",
        "请先确认图片权利",
        "只有你有权提交且同意用于核验的图片才能上传。",
      );
      return;
    }
    const mediaInGroup = kind
      ? form.currentMedia.filter((item) => item.kind === kind)
      : form.currentMedia;
    const availableSlots = 3 - mediaInGroup.length;
    if (availableSlots <= 0) {
      form.announce("warning", "图片已达上限", kind ? "这一组最多上传 3 张图片。" : "每条反馈最多上传 3 张图片。");
      return;
    }
    const allowed = await confirmHandoff("微信相册、相机及图片授权界面可能较亮，无法跟随红光模式。");
    if (!allowed) return;
    try { assertAccount(); } catch (error) { form.announce("error", "账号已变化", errorMessage(error)); return; }
    if (!form.rightsConfirmed && kind) {
      const consent = await Taro.showModal(MEDIA_RIGHTS_MODAL);
      if (!consent.confirm) return;
      assertAccount();
      form.setRightsConfirmed(true);
    }
    let choice;
    try {
      choice = await chooseImage(availableSlots);
    } catch (error) {
      form.announce("error", "无法选择图片", errorMessage(error));
      return;
    }
    if (!choice?.tempFiles.length) return;
    form.setUploading(true);
    try {
      assertAccount();
      if (choice.tempFiles.length > availableSlots)
        throw new Error(`本次最多还能添加 ${availableSlots} 张图片，请重新选择。`);
      for (const file of choice.tempFiles) validateMediaFile(file);
      let working = await saveDraft(true, kind ? { rightsConfirmed: true } : {});
      if (!working) return;
      for (const file of choice.tempFiles) {
        working = await uploadSelectedFile(form, working, file, undefined, assertAccount, kind);
      }
      await form.history.refetch().catch(() => undefined);
      assertAccount();
      form.announce(
        "success",
        "图片已安全上传",
        "服务端已校验图片并移除可识别的 EXIF、文本与时间元数据。",
      );
    } catch (error) {
      form.announce(
        "error",
        "图片上传失败",
        `${errorMessage(error)}；已完成图片和草稿仍保留，可从上传阶段重试。`,
      );
    } finally {
      form.setUploading(false);
    }
  };
}

function createRetryMedia(
  form: ContributionForm,
  assertAccount: () => void,
  confirmHandoff: (message: string) => Promise<boolean>,
) {
  return async (uploadId: ContributionUploadId) => {
    if (!form.rightsConfirmed) {
      form.announce("warning", "请先确认图片权利", "确认图片权利后才能继续上传。");
      return;
    }
    const allowed = await confirmHandoff("微信相册或相机界面可能较亮，无法跟随红光模式。");
    if (!allowed) return;
    try { assertAccount(); } catch (error) { form.announce("error", "账号已变化", errorMessage(error)); return; }
    const choice = await chooseImage(1).catch((error) => {
      form.announce("error", "无法选择图片", errorMessage(error));
      return null;
    });
    if (!choice?.tempFiles.length) return;
    form.setUploading(true);
    try {
      assertAccount();
      const working = activeDraft(form);
      if (!working) return;
      const target = working.media.find((item) => item.uploadId === uploadId);
      if (!target) {
        form.announce("warning", "上传记录已更新", "请先重新回读当前草稿状态。 ");
        return;
      }
      await uploadSelectedFile(form, working, choice.tempFiles[0]!, target, assertAccount, target.kind);
      await form.history.refetch().catch(() => undefined);
      assertAccount();
      form.announce(
        "success",
        "上传已恢复",
        "图片已上传，可继续提交审核。",
      );
    } catch (error) {
      form.announce(
        "error",
        "上传恢复失败",
        `${errorMessage(error)}；已保留当前草稿和服务端上传状态。`,
      );
    } finally {
      form.setUploading(false);
    }
  };
}

function createSubmit(
  form: ContributionForm,
  saveDraft: ReturnType<typeof createSaveDraft>,
  assertAccount: () => void,
) {
  return async () => {
    if (form.submitting) return;
    if (!form.pendingSubmission && form.mediaNeedsRecovery) {
      form.setValidationField("contribution-media-upload");
      form.announce(
        "warning",
        "请先处理媒体上传",
        "仍有上传中或已过期的媒体；可续传或重新选择后再提交。",
      );
      return;
    }
    if (!form.pendingSubmission && form.kind !== "NEW_SPOT_PROPOSAL" && (form.detail.trim().length < 20 || form.topics.length === 0)) {
      form.setValidationField(
        form.topics.length === 0
          ? "contribution-topic-control"
          : "contribution-detail",
      );
      form.announce(
        "error",
        "还不能提交",
        form.topics.length === 0
          ? "请至少选择一项涉及的事实。"
          : "请用不少于 20 个字描述现场依据。",
      );
      return;
    }
    if (!form.pendingSubmission && form.kind === "NEW_SPOT_PROPOSAL") {
      const parsedLatitude = Number(form.latitude);
      const parsedLongitude = Number(form.longitude);
      const invalidCoordinate = !Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude) ||
        Math.abs(parsedLatitude) > 90 || Math.abs(parsedLongitude) > 180 ||
        (parsedLatitude === 0 && parsedLongitude === 0);
      const missingField = !form.candidateFields.address.trim()
        ? "contribution-candidate-address"
        : !form.candidateFields.name.trim()
          ? "contribution-candidate-name"
          : invalidCoordinate
            ? "contribution-candidate-coordinate"
            : !form.preciseLocationConsent
              ? "contribution-location-consent"
              : null;
      if (missingField) {
        form.setValidationField(missingField);
        form.announce(
          "error",
          "还不能提交",
          missingField === "contribution-candidate-address"
            ? "请先搜索并确定地点地址。"
            : missingField === "contribution-candidate-name"
              ? "请填写地点名称。"
              : missingField === "contribution-candidate-coordinate"
                ? "请先在地图中确定有效位置。"
                : "请确认同意提交精确坐标；审核前不会公开。",
        );
        return;
      }
    }
    form.setSubmitting(true);
    let awaitingReceipt = false;
    try {
      const saved = form.pendingSubmission ?? await saveDraft(true);
      if (!saved) return;
      assertAccount();
      form.setPendingSubmission(saved);
      awaitingReceipt = true;
      const response = await submitContribution(
        saved.submissionId,
        saved.revision,
      );
      awaitingReceipt = false;
      assertAccount();
      form.applyDraft(response.data, "HISTORY");
      await form.history.refetch().catch(() => undefined);
      assertAccount();
      form.announce(
        "success",
        "已提交审核",
        form.kind === "NEW_SPOT_PROPOSAL"
          ? "新增观星点已进入审核，审核结果不等于正式发布。"
          : "反馈已进入审核，不会直接改变公开地点资料。",
      );
    } catch (error) {
      const uncertain = awaitingReceipt && !(error instanceof ContributionSubmitStorageError) && (!(error instanceof MiniappApiError) || error.statusCode >= 500 || error.statusCode === 408);
      if (!uncertain) form.setPendingSubmission(null);
      form.announce(
        "error",
        uncertain ? "提交结果待确认" : "提交失败",
        uncertain ? "尚未确认服务端结果。请点击确认上次提交结果；将继续同一次提交，不会重新保存草稿。" : `${errorMessage(error)}；草稿、图片和输入均已保留。`,
      );
    } finally {
      form.setSubmitting(false);
    }
  };
}

function createRemoveMedia(form: ContributionForm, assertAccount: () => void) {
  return async (uploadId: ContributionUploadId) => {
    const draft = activeDraft(form);
    if (!draft || !["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(contributionSubmissionState(draft)) || !draft.media.some((item) => item.uploadId === uploadId)) return;
    const confirmation = await Taro.showModal({ title: "移除这张图片？", content: "只从本次修改中移除这张图片；文字、其他图片和原审核记录会保留。", confirmText: "移除" });
    if (!confirmation.confirm) return;
    try {
      assertAccount();
      const response = await removeContributionUpload(draft.submissionId, uploadId, draft.revision);
      assertAccount();
      form.applyMediaDraft(response.data);
      form.removeCandidateMediaPreview(uploadId);
      await form.history.refetch().catch(() => undefined);
      assertAccount();
      form.announce("success", "图片已移除", "其余图片和当前输入已保留。");
    } catch (error) {
      form.announce("error", "暂未确认移除结果", `${errorMessage(error)}；当前输入保留，可重试移除以确认结果。`);
    }
  };
}

function createWithdrawDraft(form: ContributionForm, assertAccount: () => void) {
  return async () => {
    const draft = form.draft;
    if (!draft || contributionSubmissionState(draft) !== "DRAFT") return false;
    const confirmation = await Taro.showModal({
      title: "删除这份草稿？",
      content: "草稿将从可编辑列表移除，未提交的照片会被清理。此操作不能恢复。",
      confirmText: "删除草稿",
      confirmColor: "#b3261e",
    });
    if (!confirmation.confirm) return false;
    assertAccount();
    const response = await withdrawContributionDraft(draft.submissionId, draft.revision);
    assertAccount();
    if (contributionSubmissionState(response.data) !== "WITHDRAWN")
      throw new Error("服务端尚未确认草稿已删除");
    form.discardLocalDraft();
    await form.history.refetch().catch(() => undefined);
    assertAccount();
    form.announce("success", "草稿已删除", "这份草稿不会进入审核，未提交照片已安排清理。");
    return true;
  };
}

function createChooseCandidateLocation(form: ContributionForm, assertAccount: () => void, confirmHandoff: (message: string) => Promise<boolean>) {
  return async () => {
    try {
      assertAccount();
      const ownerPage = Taro.getCurrentPages().at(-1);
      const allowed = await confirmHandoff("微信选点界面可能较亮，无法跟随红光模式。");
      if (!allowed) return;
      const selected = await choosePlatformLocation({ isCurrent: () => {
        assertAccount();
        return Taro.getCurrentPages().at(-1) === ownerPage;
      }, allowUnthemedHandoff: true });
      if (!selected) return;
      assertAccount();
      form.selectCandidateLocation({
        name: selected.name,
        address: selected.address,
        latitude: selected.wgs84.latitude,
        longitude: selected.wgs84.longitude,
      });
    } catch (error) {
      const message = errorMessage(error);
      if (/cancel/iu.test(message)) return;
      form.announce("warning", "地点未选择", `${message}；当前输入保持不变。`);
    }
  };
}

export function useContributionCommands(form: ContributionForm) {
  const handoff = useRedLightHandoff();
  const exclusive = useRef(createContributionCommandLock(form.setCommandBusy)).current;
  const assertAccount = useRef(createContributionAccountGuard(currentDraftUserId)).current;
  const guard = <A extends unknown[], R,>(command: (...args: A) => Promise<R>, allowPending = false) =>
    exclusive(async (...args: A) => {
      try {
        if (form.pendingSubmission && !allowPending) {
          form.announce("warning", "请先确认提交结果", "上次提交结果尚未确认，请使用确认上次提交结果按钮继续。");
          return undefined;
        }
        if (!currentDraftUserId()) await getContributions();
        assertAccount();
        return await command(...args);
      } catch (error) {
        form.announce("error", "操作未完成", errorMessage(error));
        return undefined;
      }
    });
  const saveDraft = createSaveDraft(form, assertAccount);
  return {
    saveDraft: guard(saveDraft),
    chooseCandidateLocation: guard(createChooseCandidateLocation(form, assertAccount, handoff.confirm)),
    handoffWarning: handoff.warning,
    handoffActive: handoff.active,
    useCurrentLocation: guard(createUseCurrentLocation(form, assertAccount)),
    addMedia: guard(createAddMedia(form, saveDraft, assertAccount, handoff.confirm)),
    retryMedia: guard(createRetryMedia(form, assertAccount, handoff.confirm)),
    removeMedia: guard(createRemoveMedia(form, assertAccount)),
    withdrawDraft: guard(createWithdrawDraft(form, assertAccount)),
    submit: guard(createSubmit(form, saveDraft, assertAccount), true),
  };
}

export type ContributionCommands = ReturnType<typeof useContributionCommands>;
