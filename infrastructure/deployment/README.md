# Starward release operations

This directory owns the provider-neutral Linux/Compose release path for the
Mini Program API and worker. It does not purchase infrastructure, create DNS,
submit filings, publish the Mini Program, or prove that a remote environment is
running.

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
- Enable flags: `STARWARD_STAGING_CD_ENABLED=true` only in staging and
  `STARWARD_PRODUCTION_CD_ENABLED=true` only in production.
- Configure required reviewers on the GitHub `production` environment before
  enabling it.

`backend-staging.yml` runs only after a successful Product CI run caused by a
trusted `main` push in this repository. It rebuilds the exact revision once as
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
