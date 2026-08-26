#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 64
}

[ "$#" -eq 3 ] || fail internal_secret_arguments_invalid
[ "$1" = confirm-starward-internal-secret-provisioning ] \
  || fail internal_secret_confirmation_required
environment=$2
deploy_group=$3

case "$environment" in
  staging|production) ;;
  *) fail internal_secret_environment_invalid ;;
esac
[ "$deploy_group" = starward-deploy ] || fail internal_secret_deploy_group_invalid
[ "$(id -u)" -eq 0 ] || fail internal_secret_root_required

for required in chown chmod getent grep id mktemp mv openssl rm rmdir sha256sum stat; do
  command -v "$required" >/dev/null 2>&1 \
    || fail "internal_secret_command_missing:$required"
done
getent group "$deploy_group" >/dev/null 2>&1 \
  || fail internal_secret_deploy_group_missing

config_root="/etc/starward/$environment"
[ -d "$config_root" ] && [ ! -L "$config_root" ] \
  || fail internal_secret_config_directory_invalid
[ "$(stat -c '%U:%G:%a' "$config_root")" = "root:$deploy_group:750" ] \
  || fail internal_secret_config_directory_state_invalid

names='postgres.env redis.env migrate.env worker.env backup.key qweather-private.pem qweather-public.pem'
for name in $names; do
  target="$config_root/$name"
  [ ! -e "$target" ] && [ ! -L "$target" ] \
    || fail "internal_secret_target_exists:$name"
done

umask 077
temporary=$(mktemp -d "$config_root/.internal-secret-provisioning.XXXXXXXXXXXX")
chmod 0700 "$temporary"
chown root:root "$temporary"
created_files=
success=0

cleanup() {
  if [ "$success" -ne 1 ]; then
    for name in $created_files; do
      rm -f -- "$config_root/$name"
    done
  fi
  for name in $names; do
    rm -f -- "$temporary/$name"
  done
  rmdir -- "$temporary" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

postgres_password=$(openssl rand -hex 32)
redis_password=$(openssl rand -hex 32)
backup_key=$(openssl rand -hex 32)

printf '%s' "$postgres_password" | grep -Eq '^[0-9a-f]{64}$' \
  || fail internal_secret_postgres_generation_failed
printf '%s' "$redis_password" | grep -Eq '^[0-9a-f]{64}$' \
  || fail internal_secret_redis_generation_failed
printf '%s' "$backup_key" | grep -Eq '^[0-9a-f]{64}$' \
  || fail internal_secret_backup_generation_failed

printf 'POSTGRES_DB=starward\nPOSTGRES_USER=starward\nPOSTGRES_PASSWORD=%s\n' \
  "$postgres_password" > "$temporary/postgres.env"
printf 'REDIS_PASSWORD=%s\n' "$redis_password" > "$temporary/redis.env"
printf 'DATABASE_URL=postgresql://starward:%s@postgres:5432/starward\nMINIAPP_AUTO_MIGRATE=0\n' \
  "$postgres_password" > "$temporary/migrate.env"
printf 'DATABASE_URL=postgresql://starward:%s@postgres:5432/starward\nREDIS_URL=redis://:%s@redis:6379/0\nMINIAPP_QUEUE_NAME=starward-%s-outbox\nMINIAPP_WORKER_HEARTBEAT_FILE=/run/starward/worker-heartbeat.json\nMINIAPP_WORKER_HEARTBEAT_MAX_AGE_MS=30000\n' \
  "$postgres_password" "$redis_password" "$environment" > "$temporary/worker.env"
printf '%s\n' "$backup_key" > "$temporary/backup.key"

openssl genpkey -algorithm ED25519 -out "$temporary/qweather-private.pem" \
  >/dev/null 2>&1
openssl pkey -in "$temporary/qweather-private.pem" -pubout \
  -out "$temporary/qweather-public.pem" >/dev/null 2>&1
openssl pkey -in "$temporary/qweather-private.pem" -check -noout \
  >/dev/null 2>&1
openssl pkey -pubin -in "$temporary/qweather-public.pem" -noout \
  >/dev/null 2>&1

for name in postgres.env redis.env migrate.env worker.env backup.key qweather-private.pem; do
  chown "root:$deploy_group" "$temporary/$name"
  chmod 0640 "$temporary/$name"
  [ "$(stat -c '%U:%G:%a' "$temporary/$name")" = "root:$deploy_group:640" ] \
    || fail "internal_secret_private_mode_invalid:$name"
done
chown "root:$deploy_group" "$temporary/qweather-public.pem"
chmod 0644 "$temporary/qweather-public.pem"
[ "$(stat -c '%U:%G:%a' "$temporary/qweather-public.pem")" = "root:$deploy_group:644" ] \
  || fail internal_secret_public_mode_invalid

private_public_sha=$(openssl pkey -in "$temporary/qweather-private.pem" -pubout \
  -outform DER 2>/dev/null | sha256sum)
private_public_sha=${private_public_sha%% *}
public_sha=$(openssl pkey -pubin -in "$temporary/qweather-public.pem" \
  -outform DER 2>/dev/null | sha256sum)
public_sha=${public_sha%% *}
[ "$private_public_sha" = "$public_sha" ] \
  || fail internal_secret_qweather_keypair_mismatch

for name in $names; do
  created_files="$created_files $name"
  mv -- "$temporary/$name" "$config_root/$name"
done

unset postgres_password redis_password backup_key private_public_sha
success=1
printf '{"status":"created","environment":"%s","files":7,"privateOwner":"root:%s","privateMode":"640","qweatherPublicSha256":"%s"}\n' \
  "$environment" "$deploy_group" "$public_sha"
