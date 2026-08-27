import Taro from "@tarojs/taro";
import type {
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionUploadId,
} from "@starward/miniapp-contracts";
import {
  completeContributionUpload,
  createContributionDraft,
  createContributionUpload,
  errorMessage,
  MiniappApiError,
  submitContribution,
  updateContributionDraft,
} from "@/services/api-client";
import {
  contributionSubmissionState,
  mediaFileName,
  mediaMimeType,
  readBase64,
} from "./contribution-model";
import type { ContributionForm } from "./use-contribution-form";

function activeDraft(form: ContributionForm) {
  const current = form.draft;
  if (current && contributionSubmissionState(current) === "DRAFT")
    return current;
  return form.matchingDraft;
}

function createSaveDraft(form: ContributionForm) {
  return async (quiet = false) => {
    const input = form.formInput();
    if (!input) return null;
    form.setSaving(true);
    try {
      const active = activeDraft(form);
      const response = active
        ? await updateContributionDraft(active.submissionId, {
            ...input,
            expectedRevision: active.revision,
          })
        : await createContributionDraft(input);
      form.applyDraft(response.data, form.phase);
      await form.history.refetch().catch(() => undefined);
      if (!quiet)
        form.announce(
          "success",
          "草稿已保存",
          "草稿已按当前微信身份保存，失败重试不会重复创建正式事实。",
        );
      return response.data;
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT")
        await form.history.refetch().catch(() => undefined);
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
    if (/cancel/iu.test(error instanceof Error ? error.message : String(error)))
      return null;
    throw error;
  }
}

function validateMediaFile(file: { path: string; size?: number }) {
  if (!file.size || file.size > 1_200_000)
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
  existingUpload?: ContributionMediaUpload,
) {
  const input = validateMediaFile(file);
  let current = working;
  let upload = existingUpload;
  if (!upload || upload.state === "EXPIRED") {
    const created = await createContributionUpload(current.submissionId, {
      ...input,
      expectedRevision: current.revision,
    });
    current = created.data;
    const knownIds = new Set(working.media.map((item) => item.uploadId));
    upload = current.media.find((item) => !knownIds.has(item.uploadId));
    if (!upload) throw new Error("上传会话未建立");
    form.applyDraft(current, form.phase);
  }
  const completed = await completeContributionUpload(
    current.submissionId,
    upload.uploadId,
    { dataBase64: await readBase64(file.path) },
  );
  form.applyDraft(completed.data, form.phase);
  return completed.data;
}

function createUseCurrentLocation(form: ContributionForm) {
  return async () => {
    const confirmation = await Taro.showModal({
      title: "使用一次当前位置？",
      content: "只用于本次新增地点建议；不会持续定位，也不会在审核前公开精确坐标。",
      confirmText: "使用一次",
    });
    if (!confirmation.confirm) return;
    try {
      const location = await Taro.getLocation({ type: "wgs84" });
      form.setLatitude(location.latitude.toFixed(6));
      form.setLongitude(location.longitude.toFixed(6));
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
) {
  return async () => {
    if (!form.rightsConfirmed) {
      form.announce(
        "warning",
        "请先确认图片权利",
        "只有你有权提交且同意用于核验的图片才能上传。",
      );
      return;
    }
    const availableSlots = 3 - form.currentMedia.length;
    if (availableSlots <= 0) {
      form.announce("warning", "图片已达上限", "每条反馈最多上传 3 张图片。");
      return;
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
      let working = await saveDraft(true);
      if (!working) return;
      for (const file of choice.tempFiles) {
        working = await uploadSelectedFile(form, working, file);
      }
      await form.history.refetch().catch(() => undefined);
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
  saveDraft: ReturnType<typeof createSaveDraft>,
) {
  return async (uploadId: ContributionUploadId) => {
    const choice = await chooseImage(1).catch((error) => {
      form.announce("error", "无法选择图片", errorMessage(error));
      return null;
    });
    if (!choice?.tempFiles.length) return;
    form.setUploading(true);
    try {
      const working = await saveDraft(true);
      if (!working) return;
      const target = working.media.find((item) => item.uploadId === uploadId);
      if (!target) {
        form.announce("warning", "上传记录已更新", "请先重新回读当前草稿状态。 ");
        return;
      }
      await uploadSelectedFile(form, working, choice.tempFiles[0]!, target);
      await form.history.refetch().catch(() => undefined);
      form.announce(
        "success",
        "上传已恢复",
        "继续使用同一条媒体记录；成功对象不会重复创建。",
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
) {
  return async () => {
    if (form.submitting) return;
    if (form.mediaNeedsRecovery) {
      form.announce(
        "warning",
        "请先处理媒体上传",
        "仍有上传中或已过期的媒体；可续传或重新选择后再提交。",
      );
      return;
    }
    if (form.detail.trim().length < 20 || form.topics.length === 0) {
      form.announce(
        "error",
        "还不能提交",
        "请至少选择一项事实，并用不少于 20 个字描述现场依据。",
      );
      return;
    }
    if (form.kind === "NEW_SPOT_PROPOSAL" && !form.preciseLocationConsent) {
      form.announce(
        "error",
        "还不能提交",
        "新增地点需要明确同意提交该坐标；审核前不会公开。",
      );
      return;
    }
    form.setSubmitting(true);
    try {
      const saved = await saveDraft(true);
      if (!saved) return;
      const response = await submitContribution(
        saved.submissionId,
        saved.revision,
      );
      form.applyDraft(response.data, "HISTORY");
      await form.history.refetch().catch(() => undefined);
      form.announce(
        "success",
        "已提交审核",
        "管理员审核和合并后仍会重新执行正式点完整度检查，不会直接发布。",
      );
    } catch (error) {
      form.announce(
        "error",
        "提交失败",
        `${errorMessage(error)}；草稿、图片和输入均已保留。`,
      );
    } finally {
      form.setSubmitting(false);
    }
  };
}

export function useContributionCommands(form: ContributionForm) {
  const saveDraft = createSaveDraft(form);
  return {
    saveDraft,
    useCurrentLocation: createUseCurrentLocation(form),
    addMedia: createAddMedia(form, saveDraft),
    retryMedia: createRetryMedia(form, saveDraft),
    submit: createSubmit(form, saveDraft),
  };
}

export type ContributionCommands = ReturnType<typeof useContributionCommands>;
