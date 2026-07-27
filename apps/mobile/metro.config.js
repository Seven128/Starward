const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repositoryRoot = path.resolve(projectRoot, "../..");
const localDependencyRoot = path.resolve(projectRoot, "node_modules");
const dependencyRoot = fs.existsSync(localDependencyRoot)
  ? fs.realpathSync(localDependencyRoot)
  : path.resolve(process.env.STARWARD_MOBILE_DEPENDENCY_ROOT || "");
if (!fs.existsSync(dependencyRoot)) throw new Error("starward_mobile_dependency_root_missing");
const dependencyRepositoryRoot = path.resolve(dependencyRoot, "../../..");
const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;

config.watchFolders = [...new Set([repositoryRoot, dependencyRepositoryRoot])];
config.resolver.nodeModulesPaths = [
  dependencyRoot,
  path.resolve(dependencyRepositoryRoot, "node_modules"),
];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-router/_ctx") {
    return {
      filePath: path.join(projectRoot, "router-context.js"),
      type: "sourceFile",
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
