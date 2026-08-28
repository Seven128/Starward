# Starward release operations

This directory owns the provider-neutral Linux/Compose release path for the
Mini Program API and worker. It does not purchase infrastructure, create DNS,
submit filings, publish the Mini Program, or prove that a remote environment is
running.

## 日常使用：当前 IP 内测发布

当前采用 GitHub Actions（流水线与日志）+ TCR（镜像）+ 单机 Docker
Compose（运行环境）。不安装 Jenkins/Kubernetes/发布面板，不增加付费服务。
这个交付只验收发布部署，不把手机权限、全功能真机测试或正式上线作为完成条件。
IP 版本仍仅限本人调试，不是公开体验版；正式发布的域名、证书、备案和产品验收条件没有取消。

当前已启用 `main` → Product CI → TCR → IP 内测服务器的自动链路，并完成一次真实
发布及独立健康/镜像身份复核。部署会短暂停止入口、API 和 worker，不是零停机发布。
实际运行版本以 GitHub 对应任务及服务器 `operator-preview-current.json` 为准，不以
本文或本地 HEAD 推断。下面的手动 GitHub 入口已实现，但尚未单独演练；服务器侧
`check`、`backup`、`deploy` 及失败后修正配置重发已实际运行。

- **改代码**：在开发分支提交，PR 的 Product CI 检查发布产物；设计资源和
  Context/Harness 是独立治理流程，不被打包为运行服务。
- **发布**：合并到 `main` 后，Product CI 成功才触发 `Backend staging release`。
  它构建发布镜像、推送 TCR、解析不可变摘要，经 SSH 部署指定的环境。
- **手动重发当前 main**：在 GitHub Actions 选择 `Backend staging release` →
  `Run workflow` → `main`，或执行 `gh workflow run backend-staging.yml --ref main`。
  手动路径同样执行产品检查，不绕过 CI。
- **看结果**：`gh run list --workflow backend-staging.yml`，再用
  `gh run view <run-id> --log-failed` 查看失败节点。不要把 skipped/queued 当作部署成功。
- **当前开关**：GitHub 仓库级变量 `STARWARD_STAGING_CD_ENABLED=true` 才允许部署；
  `STARWARD_STAGING_LANE=operator-preview` 选择 IP 内测，`domain` 选择正式域名
  staging。`STARWARD_REMOTE_BASE_DEPLOY_ENV` 必须指向该模式的服务器私有基础配置。
  开关必须在仓库级（job 条件执行时还读不到环境变量）；其余目标配置和凭证仍放在
  GitHub `staging` Environment，不在源码仓库，也不复制一份环境级同名开关。

服务器上的统一入口（从对应版本的控制代码目录执行；路径来自服务器私有配置）：

```sh
npm run deployment:preview -- --deploy-env /absolute/private/candidate/deploy.env --operation check --operator owner
npm run deployment:preview -- --deploy-env /absolute/private/candidate/deploy.env --operation backup --operator owner
npm run deployment:preview -- --deploy-env /absolute/private/candidate/deploy.env --operation deploy --operator owner
npm run deployment:preview -- --deploy-env /absolute/private/candidate/deploy.env --operation stop --operator owner
```

四行是四种独立操作，不要整段依次执行。`stop` 只停入口/API/worker，保留运行中的
数据库和 Redis；`deploy` 可重新部署同一候选，用于修复故障后前向恢复。
更新新版本先通过 `deployment:prepare` 从稳定基础配置生成新的不可变候选配置。
流程始终加载两份 Compose 配置；保留已有数据卷，停止写入后加密备份并隔离恢复校验，
然后迁移、启动、检查服务和 IP TLS/令牌。TLS 检查只对这次请求信任 Caddy 本地 CA，
不关闭证书校验、不向系统或手机安装根证书。

`STARWARD_RECEIPT_DIRECTORY` 中的 `operator-preview-current.json` 指向最近一次成功
部署的配置、代码目录和记录。失败不会覆盖这个指针；也不能只凭指针判断服务器现在健康，
需要重新执行 `check`。每次操作都留下独立的脱敏结果，失败记录标注失败步骤及停写状态。
服务器和 GitHub 两层都限制并发发布；进程被强制终止后可能留下
`operator-preview.lock`，确认其中 PID 对应的发布进程已经退出后才可删除这个单一锁文件。

恢复顺序：定位失败节点 → 修复配置/网络/应用 → 对同一候选重新 `deploy`。
不要自动退回旧镜像或恢复旧数据库；迁移兼容性和新写入未明确时，这样可能损失数据。
本机加密备份不等于异机容灾；异机备份、正式生产回滚演练与正式上线继续暂缓。
手机预览是独立的开发交付步骤，后端更新不代表小程序自动上传、审核或公开发布。

## Safety boundary

- Run from a clean checkout of the exact source revision being promoted.
- Keep one stable, environment-owned base descriptor and generate one immutable
  candidate descriptor per release outside the repository.
- Use immutable OCI references ending in `@sha256:<64 hex characters>`.
- Keep staging and production files, credentials, volumes, backups, receipts,
  domains, projects and operator access separate.
- Never put a secret, private key, backup, generated environment file or release
  receipt in Git.
- Never restore a database or select an older image automatically. A failed
  release stops and records a redacted receipt.

The repository promotion command executes this boundary:

`prepare candidate -> validate -> verified encrypted backup receipt -> Compose
render -> immutable pull -> one-shot migration -> converged startup ->
worker/public readiness -> redacted receipt`

Production additionally requires the operator to type the exact image digest
and provide a complete staging success receipt for the same revision/digest.

## Host prerequisites

- A supported Linux host with Docker Engine and Docker Compose v2.
- Registry credentials that can pull the selected immutable image.
- Ports 80/tcp, 443/tcp and 443/udp reachable from the internet after DNS is
  ready; PostgreSQL and Redis ports stay closed.
- Node.js 24 available in the release checkout for repository tools.
- An operator account allowed to run Docker but not to read unrelated secrets.
- Absolute directories such as `/etc/starward/staging` and
  `/var/lib/starward/staging`, owned by the release operator and mode `0700`.

The production host and production paths must be different from staging.

## Owner-only preview before domain and ICP are ready

An operator may exercise the real remote stack before the filed HTTPS origin
exists, but this is a development preview and never a release substitution.
Use an exact source revision and image identity, a repository-external descriptor
and secrets, the staging PostgreSQL/Redis/queue/cache namespaces, real authorized
trial providers, `MINIAPP_AUTH_MODE=LOCAL_TEST`,
`MINIAPP_ACCEPTANCE_MODE=1`, and
`MINIAPP_DEVELOPMENT_FIXTURE_MODE=0`. Refuse the bootstrap if the Compose project,
containers, or volumes already exist.

Render the normal Compose file, then start the data services, migration, API and
worker without adding a host `ports` mapping:

```sh
docker compose --env-file <operator-preview-deploy.env> \
  -f infrastructure/deployment/compose.yml config --quiet
docker compose --env-file <operator-preview-deploy.env> \
  -f infrastructure/deployment/compose.yml up -d --wait postgres redis
docker compose --env-file <operator-preview-deploy.env> \
  -f infrastructure/deployment/compose.yml --profile operations \
  run --rm --pull never migrate
docker compose --env-file <operator-preview-deploy.env> \
  -f infrastructure/deployment/compose.yml \
  up -d --wait --no-deps --pull never api worker
```

Reach the API from the developer workstation only through the authenticated SSH
connection and bind the local side to loopback:

```sh
ssh -N -T -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:8787:172.30.10.3:8787 <staging-deploy-host>
```

Compile the ordinary development WEAPP lane with
`MINIAPP_API_BASE=http://127.0.0.1:8787`; the tracked development project keeps
URL checking disabled. The tunnel must stay open while DevTools is running.

For owner-phone debugging, generate one run-random base64url token of 43–128
characters outside Git. Put it in the external preview descriptor as
`STARWARD_OPERATOR_PREVIEW_TOKEN`, set `STARWARD_API_DOMAIN` to the host's literal
public IP, and render/start Caddy through both Compose files:

```sh
docker compose --env-file <operator-preview-deploy.env> \
  -f infrastructure/deployment/compose.yml \
  -f infrastructure/deployment/compose.operator-preview.yml \
  config --quiet
docker compose --env-file <operator-preview-deploy.env> \
  -f infrastructure/deployment/compose.yml \
  -f infrastructure/deployment/compose.operator-preview.yml \
  up -d --wait --no-deps caddy
```

The overlay publishes only 443, uses Caddy's internal development certificate,
and returns 404 unless `X-Starward-Operator-Preview` exactly matches the token.
It selects the IP certificate even for clients that omit SNI, serves only HTTP/1.1
and HTTP/2 over TCP, removes the preview header before proxying, and filters it
from access logs.
Compile the phone development build with
`MINIAPP_API_BASE=https://<public-ip>` and the same token in
`MINIAPP_OPERATOR_PREVIEW_TOKEN`. Formal release-bundle construction explicitly
clears this variable so the preview credential cannot enter staging or
production output. On the phone, scan the DevTools preview QR and enable WeChat
debugging before exercising requests; this bypass is development-only and must
not be described as trusted TLS or ordinary experience-build support.

Never use public `http://<IP>`, run an unguarded public test API, expose
session-bearing plaintext traffic, generate a normal staging release receipt,
or relax the formal environment validator for this lane. Record it only as an
operator-preview receipt with public certificate trust, domain/ICP, platform
release and promotion qualification explicitly unevaluated or false.

Once the filed HTTPS staging origin exists, remove the temporary descriptor,
local-test and preview-token secrets, the IP overlay and its Caddy volumes; close
the tunnel, and run the normal immutable-image,
verified-backup, migration, Caddy/public-readiness and receipt sequence. Before
this physical host becomes production, destroy every staging container, volume,
credential, queue, cache, backup and receipt and reprovision it from a clean base
as required by the selected environment topology.

### Resume, stop, inspect, and update the IP preview

Run on the Linux host from the exact release checkout recorded in the external
preview manifest. Set `PREVIEW_ENV` to that candidate's absolute, private
descriptor path; do not print the descriptor or run `config` without `--quiet`.
All commands that include Caddy must use the overlay. Using the base file alone
would restore the public-domain 80/TCP and 443/UDP mappings.

```sh
PREVIEW_ENV=/absolute/private/operator-preview/deploy.env
test -f "$PREVIEW_ENV" || exit 1
test -f infrastructure/deployment/compose.operator-preview.yml || exit 1
preview_compose() {
  docker compose --env-file "$PREVIEW_ENV" \
    -f infrastructure/deployment/compose.yml \
    -f infrastructure/deployment/compose.operator-preview.yml "$@"
}
preview_compose config --quiet
```

Resume this existing candidate; do not bootstrap, migrate, or delete volumes:

```sh
preview_compose up -d --wait --pull never postgres redis
preview_compose up -d --wait --no-deps --pull never api worker
preview_compose up -d --wait --no-deps --pull never caddy
```

Bounded diagnostics, without printing secret-bearing configuration:

```sh
preview_compose ps
preview_compose logs --since 10m --tail 100 api worker caddy
preview_compose stats --no-stream
ss -ltn
df -h /
```

Pause ingress/writers before data services; preserve data and certificates:

```sh
preview_compose stop caddy api worker
preview_compose stop postgres redis
```

These blocks are separate operator actions, not one script to paste end-to-end.
Keep diagnostic output local and redact it before sharing. An internal image
`EXPOSE` entry such as `8787/tcp` is not a host mapping: verify that only Caddy has
a `host:443 -> 443/tcp` mapping, with no host listener on 80, 8787, 5432 or 6379.
SSH remains the management entry. Idle resource samples establish only that
sample, not concurrent-user capacity or a service-level guarantee.

For an update, first settle and verify one source commit and approved immutable
image digest. Prepare a new external preview descriptor bound to those exact
identities without overwriting the current descriptor. Verify a current encrypted
backup through the existing backup owner before any schema-changing migration;
do not manufacture a formal staging receipt for this local-test lane. Pull the
exact digest, stop ingress/writers when the migration requires it, apply the
existing one-shot migration owner, then converge API/worker and Caddy with both
Compose files. Reuse the existing data volumes. Recheck release identity,
readiness, unauthorized 404, authenticated access, private ports and persisted
state. Regenerate the environment-bound phone bundle and QR only at this new
candidate boundary. A failed update stops; selecting an old image or restoring
data requires a separate compatibility/recovery decision.

### Official DevTools handoff and phone checks

Use the installed official WeChat DevTools CLI. The user must finish WeChat
login and, if disabled, enable **Settings -> Security Settings -> Service Port**.
Do not automate that setting or answer the CLI's enabling prompt. If a CLI token
is configured, provide it through the external `WECHAT_DEVTOOLS_CLI_TOKEN`
environment binding, never a committed file or command argument. The CLI may
exit with code zero while printing an initialization error: inspect the result
and do not infer login success from that exit code or an IDE window title.

After the phone build is settled, run from PowerShell 7 at the repository root:

```powershell
$devtoolsCli = 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat'
$previewProject = (Resolve-Path -LiteralPath 'apps\wechat-miniapp\dist\weapp').Path
& $devtoolsCli islogin --lang zh
```

Stop on a disabled-port or login error. Only after a successful login result:

```powershell
& $devtoolsCli open --project $previewProject --lang zh
```

After initialization succeeds and the IDE shows the intended project:

```powershell
$qrDirectory = Join-Path $env:TEMP ('starward-miniapp-device-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $qrDirectory | Out-Null
& $devtoolsCli preview --project $previewProject --qr-format image `
  --qr-output (Join-Path $qrDirectory 'preview.png') --lang zh
```

Preview transmits the development bundle to WeChat and must remain an explicitly
authorized owner-only operation. Do not use the formal release uploader or
change its validator to accept this development build. Keep the QR private and
repository-external. Use the existing `fingerprintBundle` export from
`tools/miniapp/release-bundle-artifact.mjs` before and after preview and compare it
with the bound external preview manifest. Preserve exact source revision, API
origin, backend image digest, AppID/token hashes and bundle fingerprint; never
record plaintext credentials. A changed bundle requires investigation and a new
attributable build, not editing the previous manifest to report a match.

Do not run a watch compiler, release build or second preview build against
`dist/weapp` while this candidate is waiting for its phone check. The loopback
workstation build and HTTPS-IP phone build are separate sequential development
outputs, not interchangeable artifacts.

On the phone, the owner scans the preview QR, enables the small program's
development/debug mode and reopens it. If the installed WeChat version still
rejects the IP/internal certificate, record the exact error and stop that path;
never fall back to public HTTP or claim a normal experience build is supported.
The owner must then confirm the actual cold start, login/session and API access,
truthful empty map when no formal spot is published, preference save/readback
after relaunch, and available real weather with its source/time/degradation
state. For the controlled server-restart check, retain the same phone session
and confirm its saved state after services recover. `LOCAL_TEST` proves only the
guarded trial session, not WeChat OpenID authentication. Backend probes and an
adapter's real-weather response do not prove the phone rendered those results.

### IP-preview troubleshooting and cleanup

| Symptom | Check at the owning boundary |
| --- | --- |
| CLI reports service port disabled | User enables the DevTools service port; then query login again. No repeated reinstall or automatic setting change. |
| CLI login missing or QR refused | User logs in with an authorized project developer account; verify exact project/AppID. Do not switch to tourist mode as proof. |
| Loopback request fails | Check the known SSH tunnel process and free local port, then remote API readiness. The phone cannot use the workstation's loopback address. |
| TLS fails before HTTP | Verify both Compose files and Caddy's IP/default-SNI configuration; phone debug compatibility remains an external check. Do not expose HTTP or install a root certificate on the phone as an implicit fix. |
| HTTPS returns 404 | No/wrong preview token is expected to fail. Compare token hashes privately; do not log the token or remove the guard. |
| API unavailable or 429 | Inspect bounded API/worker logs, health, Redis, provider quotas and retry timing; do not disable the limiter or substitute fixtures. |
| Map has no spots | Distinguish a successful empty response from a network error. Do not publish invented spots to make the map look populated. |

For ordinary pauses, use `stop`, close only the owned SSH session, and retain the
current token/bundle/data for the next authorized session. To revoke phone
access immediately, stop Caddy; to rotate access, generate a new private token,
recreate only the guarded edge with the updated descriptor, and rebuild/reissue
the phone preview. Never keep an old token as an alternate accepted credential.
After successful replacement or session retirement, resolve and remove only
the exact obsolete QR directories, generated token-bearing bundles and private
candidate files. Preserve active descriptors, database/Redis volumes and
required backups; `docker compose down -v`, broad Docker pruning and recursive
workspace deletion are not cleanup commands for an ordinary preview session.

## Bootstrap a genuinely fresh host

For a newly purchased, otherwise unused x86-64 Ubuntu 24.04 instance, the
tracked bootstrap installs Docker from Docker's official signed APT repository,
installs the checksum-pinned Node.js 24 runtime, creates the fixed deployment
user and environment directories, then enables UFW after allowing the supplied
SSH port and the public HTTP/HTTPS ports.

Run it manually as root from the exact checked-out revision. Replace the final
two arguments with the target environment and the SSH port that is already
working for the current root session:

```sh
sudo sh infrastructure/deployment/bootstrap-fresh-host.sh \
  confirm-fresh-starward-host staging 22
```

The exact confirmation is intentionally not reusable for an existing host. The
script rejects a preinstalled container or Node runtime and never runs from
CI/CD. If it fails after installing Docker, reprovision the still-unused
instance instead of weakening the fresh-host checks or trying to repair it with
an untracked command sequence.

It does not create an SSH key, registry credential, application secret, backup
key, base descriptor or DNS record. Keep the original root session open until a
second session proves that `starward-deploy` can log in and use Docker. Configure
the provider security group separately for the selected SSH port plus 80/tcp,
443/tcp and 443/udp. Docker-published ports can bypass UFW rules, so the tracked
Compose file publishes only the Caddy edge ports; PostgreSQL and Redis remain
internal.

If direct Docker Hub access is unavailable from a Tencent Cloud host, configure
only Tencent Cloud's currently documented Docker registry mirror in
`/etc/docker/daemon.json`, validate the JSON, restart Docker only while no
Starward containers are running, and verify the effective mirror with
`docker info`. This is provider-specific host state and deliberately does not
belong in the provider-neutral bootstrap. Keep every tracked image digest pin;
the mirror changes transport/cache locality, not accepted image identity. Do
not substitute an unknown public mirror. Recheck the provider documentation and
remove or replace this setting when the host or provider changes.

## Harden SSH after the deployment key is enrolled

SSH hardening is a separate root-operated step because the fresh-host bootstrap
does not create credentials and the deployment user must not receive general
`sudo` access. First enrol the deployment public key, verify the ownership and
`0700`/`0600` modes of `.ssh`/`authorized_keys`, and prove a second
`starward-deploy` key session. Also verify the provider's independent management
or recovery channel before changing the daemon policy.

Keep the existing root/provider session and the proved key session open, then run
the tracked script from the exact checked-out revision:

```sh
sudo sh infrastructure/deployment/harden-ssh-after-key.sh \
  confirm-starward-ssh-hardening starward-deploy 22
```

The script installs the earliest project-owned OpenSSH drop-in, keeps public-key
authentication enabled, requires public-key authentication, disables password
and keyboard-interactive authentication, and disables direct root SSH login. It
checks the deployment key, validates `sshd` syntax and effective policy before
reload, and restores the prior drop-in if validation or reload fails. After it
reports success, open a fresh key-only `starward-deploy` session and inspect the
effective policy from the provider management channel before closing the
original sessions.

This step does not create, rotate or delete keys, grant `sudo`, alter the cloud
firewall, or prove that provider recovery works. Key rotation must enrol and
prove a replacement key before removing the previous key; CI/CD never invokes
this script.

## Provision the external descriptor

Copy the five lane examples from `infrastructure/deployment/env/` to an
environment-owned directory outside the repository. Copy
`deploy.env.example` as `deploy.base.env`. Resolve every `secret-ref:` and
stable placeholder. The base descriptor points to the five absolute lane files
and binds the approved image repository, but must not contain
`STARWARD_IMAGE_REF`, `STARWARD_RELEASE_REVISION`, `STARWARD_IMAGE_DIGEST` or
`STARWARD_RELEASED_AT`. Those non-secret values belong to a generated candidate
descriptor so a release never rewrites secret-bearing lane files.

The initial Actions implementation publishes to one Tencent Container Registry
Personal Edition repository, for example
`ccr.ccs.tencentyun.com/<namespace>/starward-miniapp-api`. Set
`STARWARD_IMAGE_REPOSITORY` in both base descriptors and both protected GitHub
environments to that exact repository. Do not copy the registry password into a
descriptor or the repository.

After the tracked fresh-host bootstrap, provision environment-local generated
material once through an attributable root channel. The script creates the
PostgreSQL, Redis, migration, worker, backup-key and QWeather Ed25519 files; it
refuses to overwrite any existing or symlink target and never prints a private
value:

```sh
sh infrastructure/deployment/provision-internal-secrets.sh \
  confirm-starward-internal-secret-provisioning \
  staging \
  starward-deploy
```

The bootstrapped `/etc/starward/<environment>` directory remains
`root:starward-deploy` mode `0750`. Private generated files are root-owned,
deploy-group-readable mode `0640`; the QWeather public key is mode `0644` so it
can be uploaded to the provider console. The output contains only status and
the public-key SHA-256 fingerprint. Provision a separate set for production.
Losing the backup key makes encrypted backups unrecoverable; copying it into
the backup directory defeats the separation boundary. The script does not
rotate credentials, render `api.env`, collect provider IDs or run from CI/CD.

Upload `qweather-public.pem` to a JWT credential in the matching QWeather
project. Keep `qweather-private.pem` on the host and materialize its PEM bytes
into the environment-owned API lane only when the API Host, project ID and
credential ID are available; never paste the private key into the provider
console, repository or workflow logs.

The tracked API example is the owner-only `TRIAL` staging profile: QWeather is
the primary/official-alert provider, its Weather API v1 hourly forecast is
explicitly limited to the free-entitlement-compatible 24-hour window, and
Open-Meteo non-commercial access is limited to layered-cloud/model evidence. Do
not add a paid QWeather assumption or an Open-Meteo commercial key to staging. A
production descriptor instead requires `QWEATHER_FORECAST_HOURS=72`, selects
`MINIAPP_OPEN_METEO_EVIDENCE_MODE=OPEN_METEO_COMMERCIAL` and supplies its own
`OPEN_METEO_API_KEY`; the validator rejects either horizon or licence profile
in the wrong environment. Provider failure remains an attributable
degraded/unavailable state and never enables fixtures or a hidden horizon
downgrade.

Generate a candidate descriptor, then validate it before Docker is touched:

```sh
npm run deployment:prepare -- \
  --base-deploy-env /etc/starward/staging/deploy.base.env \
  --output /var/lib/starward/staging/candidates/<revision>/deploy.env \
  --image-ref ccr.ccs.tencentyun.com/<namespace>/starward-miniapp-api@sha256:<digest> \
  --revision <40-hex-git-revision> \
  --released-at <utc-iso-timestamp>

npm run deployment:validate-env -- \
  --deploy-env /var/lib/starward/staging/candidates/<revision>/deploy.env
```

Validation rejects placeholders, mutable images, identity drift, weak or reused
credentials, cross-lane secret leakage, relative paths and staging/production
namespace mistakes. A valid result proves configuration shape only.

## First empty-environment initialization

The backup command requires a running PostgreSQL owner. On the first deployment
only, initialize just the pinned data services before creating the first empty
database backup. Do not use this sequence as a recovery or upgrade procedure.

```sh
docker compose \
  --env-file /var/lib/starward/staging/candidates/<revision>/deploy.env \
  -f infrastructure/deployment/compose.yml \
  config --quiet

docker compose \
  --env-file /var/lib/starward/staging/candidates/<revision>/deploy.env \
  -f infrastructure/deployment/compose.yml \
  pull postgres redis

docker compose \
  --env-file /var/lib/starward/staging/candidates/<revision>/deploy.env \
  -f infrastructure/deployment/compose.yml \
  up -d --wait postgres redis
```

Stop if this is not a genuinely new environment or if an existing volume,
container or project is discovered. Existing data must enter through the normal
backup/release boundary.

## Create a verified backup

```sh
npm run deployment:backup -- \
  --deploy-env /var/lib/starward/staging/candidates/<revision>/deploy.env
```

The command dumps PostgreSQL, encrypts it with AES-256-GCM, restores it into a
run-unique temporary database, compares the schema-migration identity, drops the
temporary database, then writes the encrypted bytes and a non-secret manifest.
It fails above `STARWARD_BACKUP_MAX_BYTES`. Copying the result off-host and
applying retention are still provider-owned operations and must be verified
before public launch.

For the current personal trial, use the separately validated operator-preview
backup operation (`npm run deployment:preview -- --operation backup
--deploy-env <preview-deploy.env> --operator <operator-id>`), not the formal release command
above. Its new manifests record `retention.policyId=personal-trial-7d`, seven
days from dump start, an absolute UTC `expiresAt`, and `cleanupPerformed=false`.
This is expiry metadata only: no existing backup is removed, and a manifest is
not proof of cleanup. Formal staging/production backups retain their existing
manifest shape and do not inherit this trial policy.

The current tooling also supports these explicitly selected operations:

```sh
npm run deployment:preview -- --operation inspect-backups --deploy-env <preview-deploy.env> --operator <operator-id>
npm run deployment:preview -- --operation maintain-backups --deploy-env <preview-deploy.env> --operator <operator-id>
```

Inspection never deletes or creates a backup. Maintenance shares the preview
deployment lock, validates every eligible file before deletion, cleans expired
trial backups, then creates a verified backup if the latest remaining backup is
at least 24 hours old or absent. Cleanup runs before database health checks;
backup failure cannot silently postpone the attempted expiry cleanup. It never
deletes keys, other environments, retained-original recovery databases or
unclassified legacy files. Unknown files are reported for operator inventory.

The selected staging deploy user uses the existing user cron daemon, without
sudo or a permanent SSH process. After the successful deployment pointer names
this candidate, run the candidate's installer:

```sh
node tools/deployment/install-backup-schedule.mjs --pointer /var/lib/starward/staging/receipts/operator-preview-current.json
```

The installer preserves unrelated crontab entries, installs a private dispatcher
under the environment receipt directory and reads back its managed cron block.
The first scheduled run is in approximately two minutes, then hourly. The
stable dispatcher follows only a successful preview deployment pointer and
calls that candidate's maintenance owner. Never overwrite an immutable control
archive. Reconcile legacy inventory and exercise maintenance before enabling
this recurring deletion schedule. Unknown legacy files cause a visible failed
scheduled result; they are not deleted by guessing their age.

The seven-day expiry target has up to an hourly scheduling delay in healthy
operation and no exact deletion guarantee during outages. Read the private
`backup-maintenance/latest.json` status and referenced operation receipt; check
that its timestamp advances and that cron is running. Status-file visibility
is not proof of delivered external alerts: connect and exercise an operator
alert channel before claiming unattended incident response.

Restore-after-account-erasure reconciliation remains required before restoring
older personal data. These commands never authorize an unreconciled restore or
prove that existing backups or a host timer have been cleaned/configured.

Capture the absolute `manifestPath` printed by the command. A release accepts a
manifest only for the same environment, Compose project, source revision and
image digest, within six hours, with matching encrypted size and SHA-256.

## Release staging

The normal staging path is `npm run deployment:promote`, which generates the
candidate, validates it, creates and verifies the backup, then releases exactly
that candidate. The lower-level `deployment:backup` and `deployment:release`
commands remain available for diagnosis and explicit operator control.

Success prints the release receipt path. Confirm the receipt status, public
release identity and every step before treating staging as qualified. The
receipt is operational evidence, not durable Context and not a substitute for
the Mini Program cold-start journey.

## Promote production

Production must use an image digest already qualified in staging and a fresh
production backup. It never rebuilds the candidate. Copy the non-secret staging
success receipt to an operator-owned absolute path on the production host before
dispatching promotion; the command verifies every required staging step.

```sh
npm run deployment:promote -- \
  --base-deploy-env /etc/starward/production/deploy.base.env \
  --candidate-output /var/lib/starward/production/candidates/<revision>/deploy.env \
  --image-ref ccr.ccs.tencentyun.com/<namespace>/starward-miniapp-api@sha256:<digest> \
  --revision <40-hex-git-revision> \
  --released-at <utc-iso-timestamp> \
  --operator operator-name \
  --staging-receipt /var/lib/starward/production/qualifications/<staging-receipt>.json \
  --confirm-production-digest sha256:<exact-qualified-digest>
```

Platform review and public Mini Program release remain separate human actions.

## Recover a database

Database recovery is intentionally separate from release and requires three
typed confirmations. Use only an environment-owned candidate descriptor whose
current image is expected to run against the backup's migration level.

```sh
npm run deployment:recover -- \
  --deploy-env /var/lib/starward/production/candidates/<revision>/deploy.env \
  --backup-manifest /var/lib/starward/production/backups/<backup>.manifest.json \
  --confirm-environment production \
  --confirm-backup-sha256 <exact-manifest-encrypted-sha256> \
  --confirm-target-database starward \
  --operator operator-name
```

The command verifies the environment/project/database and authenticated
ciphertext before Docker is touched. It restores into a new database, verifies
the exact migration identity, stops edge traffic and writers, terminates target
connections, retains the original database under a run-unique name, switches
the restored database into the canonical name, and requires worker/public
readiness. If readiness fails, it switches the original database back and keeps
the failed restored database for diagnosis. It never deletes the retained
original after success; cleanup is a later explicit operator action after an
evidence-backed retention decision.

This command is unit-verified but has not yet completed a Docker/remote restore
drill. Do not treat its presence as a production recovery claim.

## Initial single-host resource envelope

The tracked Compose profile is intentionally bounded for the selected minimum
4 GB host class: Caddy 128 MB, API/worker/migration 512 MB each, PostgreSQL
1 GB, and Redis 256 MB with a 192 MB Redis data ceiling. Every service also has
a PID ceiling and five 10 MB rotated local log files. Migration is a temporary
profile, so it does not consume its limit during steady state.

These are availability guardrails, not a throughput claim. Record host memory,
container restarts, API latency/error rate, PostgreSQL pressure, Redis usage and
worker queue depth during staging. Adjust a limit only from that evidence and
keep enough unallocated host memory for Docker, the kernel, SSH and filesystem
cache. Never remove limits or log rotation merely to make a failing deployment
appear healthy.

The edge network is pinned to `172.30.10.0/29`: Caddy is
`172.30.10.2`, the API is `172.30.10.3`, and the API configuration must trust
only `172.30.10.2/32`. Do not replace this with hop-count trust or a broad
private CIDR. The API also enforces fixed request-body, request-receive,
handler, connection and keep-alive bounds; a timeout is a failed request, not a
reason to disable the boundary.

Remote API startup also requires `MINIAPP_RATE_LIMIT_MAX` and
`MINIAPP_RATE_LIMIT_WINDOW_MS`. The tracked initial example is 120 requests per
60 seconds for each normalized client IP, with IPv6 clients grouped by `/64`.
Counters use the environment's Redis under an isolated namespace and Redis
errors fail closed. Only exact liveness/readiness probes from the fixed Caddy
address or container loopback bypass the limiter. Treat these values as an
initial availability/cost guardrail: staging workload evidence must justify the
final launch setting, and a 429 response is not capacity evidence.

## GitHub Actions activation

Both remote workflows are tracked but default to disabled. Do not enable them
until the required hosts, external descriptors, DNS/TLS prerequisites, TCR
Personal Edition repository and credentials, first-environment initialization
and SSH host-key verification are complete.

Each host must be an x86-64 Ubuntu 24.04 instance with at least 4 online CPUs,
3584 MiB reported memory, 10 GiB free beneath the release root, Node.js 24,
Docker Engine and the Compose plugin. Before enabling a workflow, provision the
inbox, release and candidate roots as non-symlink directories owned by the SSH
deployment user with no group/other write bit, and provision the readable base
descriptor with no group/other write bit. `host-preflight.sh` checks these facts
read-only before every transfer; it deliberately does not install packages,
create paths or repair permissions.

Configure the GitHub `staging` and `production` environments independently:

- Variables: `STARWARD_SSH_HOST`, `STARWARD_SSH_PORT`,
  `STARWARD_SSH_USER`, `STARWARD_REMOTE_INBOX`,
  `STARWARD_REMOTE_RELEASE_ROOT`, `STARWARD_REMOTE_BASE_DEPLOY_ENV`, and
  `STARWARD_REMOTE_CANDIDATE_ROOT`. Both environments also set the same exact
  `STARWARD_IMAGE_REPOSITORY`; staging additionally sets
  `STARWARD_REGISTRY_HOST` and `STARWARD_REGISTRY_USERNAME`.
- Secrets: `STARWARD_SSH_PRIVATE_KEY` and `STARWARD_SSH_KNOWN_HOSTS`. Staging
  additionally stores `STARWARD_REGISTRY_PASSWORD` for publication. Log in to
  TCR separately as the deployment user on each host so an exact-digest pull
  does not receive registry credentials through the release control package.
- Repository-level scheduling flags: `STARWARD_STAGING_CD_ENABLED=true` enables
  staging and `STARWARD_PRODUCTION_CD_ENABLED=true` enables production. Do not
  define these job-condition flags at environment level. Production stays disabled
  for IP-only testing. Restrict the staging environment to the `main` branch.
- Configure required reviewers on the GitHub `production` environment before
  enabling it.

`backend-staging.yml` runs automatically after a successful Product CI run caused
by a trusted `main` push in this repository, or manually on `main` with the same
release-product checks. It rebuilds the exact revision once as
the release image, publishes it to the configured TCR repository, removes the
runner login, transfers a SHA-256-bound non-secret control package and
automatically promotes the resulting immutable digest.
`backend-production.yml` is manual only; the operator supplies the exact
revision, digest, matching confirmation and production-host staging receipt
path. It never builds or pushes an image.

## Failure and rollback boundary

A failed receipt identifies the last passed step and a redacted error code. Do
not overwrite the database, rerun migration with edited files, change to a
mutable tag or suppress readiness checks to make the release green.

Application rollback is allowed only after confirming that the retained prior
image is compatible with the current schema and accepted writes. Create a new
descriptor and fresh verified backup bound to the selected prior revision and
digest, then run the same release command. Database recovery uses the separate
typed-confirmation command above and must be exercised against the selected
remote topology before production can be declared recoverable or launch-ready.
