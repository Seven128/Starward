import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Controller, Get, Header } from "@nestjs/common";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const html = readFileSync(
  path.join(root, "apps", "miniapp-admin", "index.html"),
  "utf8",
);
const script = readFileSync(
  path.join(root, "apps", "miniapp-admin", "app.js"),
  "utf8",
);

@Controller("admin")
export class AdminWebController {
  @Get()
  @Header("content-type", "text/html; charset=utf-8")
  index() {
    return html;
  }

  @Get("app.js")
  @Header("content-type", "application/javascript; charset=utf-8")
  @Header("cache-control", "no-store")
  javascript() {
    return script;
  }
}
