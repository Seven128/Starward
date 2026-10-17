const path = require("node:path");
const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const PREFIX = "artifacts/miniapp/release/bundles/";

function releaseBundleLocation(id, repositoryRoot) {
  if (!ID.test(id ?? "")) throw Error("release_bundle_output_id_invalid");
  const bundleDirectory = `${PREFIX}${id}/weapp`;
  return Object.freeze({ id, bundleDirectory, bundleRoot: path.resolve(repositoryRoot, bundleDirectory),
    taroOutputRoot: `../../${bundleDirectory}` });
}

function resolveReleaseBundleLocation(directory, repositoryRoot) {
  if (typeof directory !== "string" || !directory.startsWith(PREFIX) || !directory.endsWith("/weapp"))
    throw Error("release_bundle_output_directory_invalid");
  const location = releaseBundleLocation(directory.slice(PREFIX.length, -"/weapp".length), repositoryRoot);
  if (location.bundleDirectory !== directory) throw Error("release_bundle_output_directory_invalid");
  return location;
}

module.exports = { releaseBundleLocation, resolveReleaseBundleLocation };
