/** Only this published route is trusted to resolve against our current BFF. */
export function publishedMediaSource(path: string): string | null {
  return /^\/v2\/spots\/spot(?:%3A|:)[A-Za-z0-9%_.:-]+\/media\/upload(?:%3A|:)[A-Za-z0-9_-]+\/image$/u.test(path)
    ? __MINIAPP_API_BASE__.replace(/\/+$/u, "") + path : null;
}

/** Bundled media and external images retain their original identity. */
export function mediaSource(path: string) {
  return publishedMediaSource(path) ?? path;
}
