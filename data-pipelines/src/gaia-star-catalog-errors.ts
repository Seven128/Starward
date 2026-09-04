export function fail(code: string): never {
  throw new Error(`gaia_catalog_invalid:${code}`);
}
