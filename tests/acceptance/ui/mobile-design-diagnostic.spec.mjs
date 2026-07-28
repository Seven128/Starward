import { test } from "@playwright/test";
import { validateMobileWebSession } from "../mobile-web-session.mjs";
import {
  mobileWebDiagnosticSelection,
  runMobileWebDesignDiagnostic,
} from "./mobile-design-diagnostic-support.mjs";

const selection = mobileWebDiagnosticSelection();

test.beforeAll(async ({ baseURL }) => {
  if (!baseURL) throw new Error("mobile_web_diagnostic_base_url_missing");
  await validateMobileWebSession({ baseUrl: baseURL });
});

test(`[diagnostic-only] selected mobile design comparison [outcome:${selection.outcome}]`, async ({
  browser,
  baseURL,
}) => {
  const reports = await runMobileWebDesignDiagnostic({ browser, baseURL });
  for (const entry of reports) {
    process.stdout.write(`STARWARD_MOBILE_WEB_DIAGNOSTIC:${JSON.stringify({
      authority: "diagnostic-only",
      native_proof: false,
      report: entry.reportPath,
      viewer: entry.viewerPath,
    })}\n`);
  }
});
