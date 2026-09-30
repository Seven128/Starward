export async function loadAvailableMediaPreviews(
  ids: readonly string[],
  load: (id: string) => Promise<string>,
): Promise<{ paths: Record<string, string>; failedIds: string[] }> {
  const results = await Promise.allSettled(ids.map(load));
  const paths: Record<string, string> = {};
  const failedIds: string[] = [];
  results.forEach((result, index) => {
    const id = ids[index]!;
    if (result.status === "rejected") failedIds.push(id);
    else if (result.value) paths[id] = result.value;
  });
  return { paths, failedIds };
}

/** Completed uploads keep a page-owned decoded source, independent of temporary picker files. */
export function recoverCompletedPhotoPreviews(paths: Readonly<Record<string, string>>, failedIds: readonly string[], completed: Readonly<Record<string, string>>) {
  const restored = { ...paths };
  for (const id of failedIds) if (completed[id]) restored[id] = completed[id]!;
  return { paths: restored, failedIds: failedIds.filter(id => !restored[id]) };
}
