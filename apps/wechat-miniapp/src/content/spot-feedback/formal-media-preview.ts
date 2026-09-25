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
