/** Only our published media route is relative to the BFF; bundled media stays local. */
export function mediaSource(path: string) {
  return /^\/v2\/spots\/spot(?:%3A|:)[A-Za-z0-9%_.:-]+\/media\/upload(?:%3A|:)[A-Za-z0-9_-]+\/image$/u.test(path)
    ? __MINIAPP_API_BASE__.replace(/\/+$/u, "") + path : path;
}
