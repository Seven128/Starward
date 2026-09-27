import { Button, Image, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import { CONTRIBUTION_MEDIA_KINDS, type ContributionSubmission, type ContributionUploadId } from "@starward/miniapp-contracts";
import { currentDraftUserId, getContributionMedia, getSpotContributionMedia, getSpotSite } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { contributionFrozenAttempt, contributionRecordIdentity, contributionRecordPhotos, contributionRecordFormalView } from "./contribution-record-model";
import { loadAvailableMediaPreviews } from "./media-preview";

import { ContributionPhotoGallery } from "./photo-gallery";
import { formalPhotoGroups } from "./photo-groups";

/** One read-only media consumer for record lists and submitted standalone editors. */
export function ContributionRecordMedia({ item }: { item: ContributionSubmission }) {
  const accountOwner = useAppStore(state => state.accountOwnerId);
  const owner = currentDraftUserId();
  const photos = useMemo(() => contributionRecordPhotos(item), [item]);
  const scope = JSON.stringify([owner, item.submissionId, contributionFrozenAttempt(item)?.attemptId, photos]);
  const [visible, setVisible] = useState(true);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ scope: string; paths: Record<string, string>; failed: string[] }>({ scope: "", paths: {}, failed: [] });
  const authorized = Boolean(owner && owner === accountOwner);
  const paths = loaded.scope === scope ? loaded.paths : {};
  const failed = loaded.scope === scope ? loaded.failed : [];
  useDidHide(() => { setVisible(false); });
  useDidShow(() => setVisible(true));
  useEffect(() => {
    if (!visible || !authorized || !owner || !photos.length) return;
    const controller = new AbortController();
    const missing = [...new Map(photos.filter(photo => !paths[photo.id]).map(photo => [photo.id, photo])).values()];
    // Only non-upload legacy references need the public site's identity catalogue.
    let site: ReturnType<typeof getSpotSite> | undefined;
    void loadAvailableMediaPreviews(missing.map(photo => photo.id), async id => {
      const photo = missing.find(entry => entry.id === id)!;
      if (photo.owned) {
        const response = await getContributionMedia(item.submissionId, id as ContributionUploadId, controller.signal, owner);
        return `data:${response.data.mimeType};base64,${response.data.dataBase64}`;
      }
      if (!item.spotId) throw new Error("frozen_photo_unavailable");
      if (id.startsWith("upload:")) {
        const response = await getSpotContributionMedia(item.spotId, id as ContributionUploadId, controller.signal);
        return `data:${response.data.mimeType};base64,${response.data.dataBase64}`;
      }
      site ??= getSpotSite(item.spotId, controller.signal);
      const media = (await site).data.media.find(entry => entry.id === id);
      const path = media?.localPath || media?.thumbnailPath;
      if (!path) throw new Error("frozen_photo_unavailable");
      return path;
    }).then(result => {
      if (controller.signal.aborted || currentDraftUserId() !== owner) return;
      setLoaded({ scope, paths: { ...paths, ...result.paths }, failed: result.failedIds });
    });
    return () => controller.abort();
    // Completion does not trigger a new fetch. Retry only the remaining failures.
  }, [scope, visible, authorized, retry]);
  if (!authorized || !visible) return null;
  const formal = contributionRecordFormalView(item);
  const groups = formal ? formalPhotoGroups(formal.baseline, formal.proposal, true)
    : CONTRIBUTION_MEDIA_KINDS.flatMap(kind => {
      const after = photos.filter(photo => photo.kind === kind).map(photo => photo.id);
      return after.length ? [{ kind, after }] : [];
    });
  return <ContributionPhotoGallery groups={groups} paths={paths} failedIds={failed} scope={scope}
    name={contributionRecordIdentity(item).name} onRetry={() => setRetry(value => value + 1)}
    onImageError={id => setLoaded(current => {
      if (current.scope !== scope) return current;
      const remaining = { ...current.paths }; delete remaining[id];
      return { ...current, paths: remaining, failed: [...new Set([...current.failed, id])] };
    })} />;
}
