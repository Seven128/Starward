# Isolated WeChat uploader runtime

This directory is the dependency boundary for the official WeChat Mini Program
preview/upload SDK. It is deliberately not a root npm workspace and is not
installed by normal Product CI. `tools/miniapp/upload-release-bundle.mjs`
validates the Starward release bundle and calls the small driver in this
directory; the driver must not build, edit, or select a bundle.

## Why it is isolated

`miniprogram-ci@2.1.31` is the current platform-supported integration selected
for this repository, but its locked transitive dependency tree has known high
and critical audit findings. At lock generation on 2026-08-26, npm reported 73
findings, including 41 critical findings. Isolation limits the blast radius; it
does not make those findings harmless or count as remediation.

The package may run only on a dedicated, protected Linux runner labelled
`starward-wechat-uploader` with:

- fixed outbound IP configured in the WeChat upload-IP allow-list;
- no backend, database, cloud-provider, SSH, registry-write, or Docker-socket
  credentials;
- a clean checkout and `npm ci --ignore-scripts --prefix tools/miniapp-uploader`;
- repository-external upload-key material written with mode `0600` to the
  runner temporary directory and removed by a shell trap;
- no persistent preview QR, upload key, AppID, cookies, or raw SDK logs.

Never disable the WeChat IP allow-list to accommodate a generic hosted runner.
If the locked dependency, SDK, or runner policy changes, rerun the nested audit
and review the uploader boundary before enabling the workflow.

## Protected environment configuration

The repository variable `STARWARD_WECHAT_PLATFORM_ENABLED` must be exactly
`true` before the workflow can run. Each `wechat-staging` and
`wechat-production` GitHub environment separately owns:

- variable `STARWARD_WECHAT_APP_ID`;
- variable `STARWARD_WECHAT_API_ORIGIN`;
- secret `STARWARD_WECHAT_UPLOAD_PRIVATE_KEY`.

`wechat-production` must require reviewers. A production preview builds and
fingerprints the production-bound package and returns its short-lived QR and
receipt. Production upload requires the operator to retype
`upload:production:<version>:<bundle-sha256>` from that verified preview.
Upload creates a WeChat development version only; review submission and public
release remain manual platform actions.
