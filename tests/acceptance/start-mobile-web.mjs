import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(acceptanceRoot, "../../apps/mobile");
const requireFromMobile = createRequire(path.join(projectRoot, "package.json"));
const expoPackageRoot = path.dirname(requireFromMobile.resolve("expo/package.json"));
const mobileDependencyRoot = path.dirname(expoPackageRoot);
const expoCli = path.join(expoPackageRoot, "bin", "cli");

process.env.STARWARD_MOBILE_DEPENDENCY_ROOT = mobileDependencyRoot;
process.argv = [process.execPath, expoCli, "start", projectRoot, "--web", ...process.argv.slice(2)];
await import(pathToFileURL(expoCli).href);
