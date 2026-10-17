export interface ReleaseBundleLocation {
  readonly id: string;
  readonly bundleDirectory: string;
  readonly bundleRoot: string;
  readonly taroOutputRoot: string;
}
export function releaseBundleLocation(id: string, repositoryRoot: string): ReleaseBundleLocation;
export function resolveReleaseBundleLocation(directory: string, repositoryRoot: string): ReleaseBundleLocation;
