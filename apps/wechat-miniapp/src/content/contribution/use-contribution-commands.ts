import Taro from "@tarojs/taro";
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
  mediaFileName,
  mediaMimeType,
  readBase64,
} from "./contribution-model";
import type { ContributionForm } from "./use-contribution-form";

function createSaveDraft(form: ContributionForm) {
  return async (quiet = false) => {
    const input = form.formInput();
    if (!input) return null;
    form.setSaving(true);
    try {
      const active = form.draft?.state === "DRAFT" ? form.draft : form.matchingDraft;
      const response = active
        ? await updateContributionDraft(active.submissionId, {
            ...input,
            expectedRevision: active.revision,
          })
        : await createContributionDraft(input);
      form.applyDraft(response.data);
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
    const availableSlots =
      3 - (form.draft?.media.length ?? form.matchingDraft?.media.length ?? 0);
    if (availableSlots <= 0) {
      form.announce("warning", "图片已达上限", "每条反馈最多上传 3 张图片。");
      return;
    }
    form.setUploading(true);
    try {
      let working = await saveDraft(true);
      if (!working) return;
      const choice = await Taro.chooseImage({
        count: availableSlots,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
      });
      for (const file of choice.tempFiles) {
        if (!file.size || file.size > 1_200_000)
          throw new Error("单张图片必须小于 1.2 MB");
        const created = await createContributionUpload(working.submissionId, {
          originalName: mediaFileName(file.path),
          mimeType: mediaMimeType(file.path),
          byteSize: file.size,
          expectedRevision: working.revision,
        });
        const existing = new Set(working.media.map((item) => item.uploadId));
        const upload = created.data.media.find(
          (item) => !existing.has(item.uploadId),
        );
        if (!upload) throw new Error("上传会话未建立");
        const completed = await completeContributionUpload(
          created.data.submissionId,
          upload.uploadId,
          { dataBase64: await readBase64(file.path) },
        );
        working = completed.data;
        form.applyDraft(working);
      }
      await form.history.refetch().catch(() => undefined);
      form.announce(
        "success",
        "图片已安全上传",
        "服务端已校验图片并移除可识别的 EXIF、文本与时间元数据。",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cancel/iu.test(message))
        form.announce(
          "error",
          "图片上传失败",
          `${errorMessage(error)}；草稿和已完成图片保持不变。`,
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
      const response = await submitContribution(saved.submissionId, saved.revision);
      form.applyDraft(response.data);
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
    submit: createSubmit(form, saveDraft),
  };
}

export type ContributionCommands = ReturnType<typeof useContributionCommands>;
