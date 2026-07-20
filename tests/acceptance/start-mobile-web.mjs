import { existsSync, realpathSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(acceptanceRoot, "../../apps/mobile");
const dependencyRepositoryRoot = path.resolve(realpathSync(path.join(acceptanceRoot, "node_modules")), "../../..");
const mobileDependencyRoot = path.join(dependencyRepositoryRoot, "apps", "mobile", "node_modules");
const requireFromMobile = createRequire(path.join(dependencyRepositoryRoot, "apps", "mobile", "package.json"));
const expoPackageRoot = path.dirname(requireFromMobile.resolve("expo/package.json"));
const expoCli = path.join(expoPackageRoot, "bin", "cli");
const projectDependencyLink = path.join(projectRoot, "node_modules");

process.env.STARWARD_MOBILE_DEPENDENCY_ROOT = mobileDependencyRoot;
if (!existsSync(projectDependencyLink)) symlinkSync(mobileDependencyRoot, projectDependencyLink, "junction");
process.argv = [process.execPath, expoCli, "start", projectRoot, "--web", ...process.argv.slice(2)];
await import(pathToFileURL(expoCli).href);
