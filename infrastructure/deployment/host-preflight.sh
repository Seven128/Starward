#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 65
}

[ "$#" -eq 4 ] || fail host_preflight_arguments_invalid
inbox=$1
release_root=$2
candidate_root=$3
base_deploy_env=$4

for selected in "$inbox" "$release_root" "$candidate_root" "$base_deploy_env"; do
  case "$selected" in
    /*) ;;
    *) fail host_preflight_path_not_absolute ;;
  esac
done

for command_name in awk date df docker find getconf grep id node sha256sum stat tar uname; do
  command -v "$command_name" >/dev/null 2>&1 || fail "host_preflight_command_missing:$command_name"
done

[ -r /etc/os-release ] || fail host_preflight_os_release_missing
. /etc/os-release
[ "${ID:-}" = ubuntu ] || fail host_preflight_os_not_ubuntu
[ "${VERSION_ID:-}" = 24.04 ] || fail host_preflight_ubuntu_version_unsupported
[ "$(uname -m)" = x86_64 ] || fail host_preflight_architecture_unsupported

cpu_count=$(getconf _NPROCESSORS_ONLN)
case "$cpu_count" in
  ''|*[!0-9]*) fail host_preflight_cpu_count_invalid ;;
esac
[ "$cpu_count" -ge 4 ] || fail host_preflight_cpu_below_minimum

memory_kib=$(awk '/^MemTotal:/ { print $2; exit }' /proc/meminfo)
case "$memory_kib" in
  ''|*[!0-9]*) fail host_preflight_memory_invalid ;;
esac
[ "$memory_kib" -ge 3670016 ] || fail host_preflight_memory_below_3584_mib

current_user_id=$(id -u)
for directory in "$inbox" "$release_root" "$candidate_root"; do
  [ -d "$directory" ] && [ ! -L "$directory" ] || fail "host_preflight_directory_invalid:$directory"
  [ "$(stat -c %u "$directory")" = "$current_user_id" ] || fail "host_preflight_directory_owner_invalid:$directory"
  find "$directory" -maxdepth 0 -perm /022 -print -quit | grep -q . \
    && fail "host_preflight_directory_permissions_too_open:$directory"
  [ -r "$directory" ] && [ -w "$directory" ] && [ -x "$directory" ] \
    || fail "host_preflight_directory_access_invalid:$directory"
done

[ -f "$base_deploy_env" ] && [ ! -L "$base_deploy_env" ] && [ -r "$base_deploy_env" ] \
  || fail host_preflight_base_deploy_env_invalid
find "$base_deploy_env" -maxdepth 0 -perm /022 -print -quit | grep -q . \
  && fail host_preflight_base_deploy_env_permissions_too_open

available_kib=$(df -Pk "$release_root" | awk 'NR == 2 { print $4 }')
case "$available_kib" in
  ''|*[!0-9]*) fail host_preflight_disk_invalid ;;
esac
[ "$available_kib" -ge 10485760 ] || fail host_preflight_disk_below_10_gib

node_version=$(node -p 'process.versions.node')
node_major=${node_version%%.*}
[ "$node_major" = 24 ] || fail host_preflight_node_major_unsupported

docker_server=$(docker version --format '{{.Server.Version}}' 2>/dev/null) \
  || fail host_preflight_docker_server_unreachable
[ -n "$docker_server" ] || fail host_preflight_docker_server_unreachable
compose_version=$(docker compose version --short 2>/dev/null) \
  || fail host_preflight_compose_unavailable
[ -n "$compose_version" ] || fail host_preflight_compose_unavailable

checked_at=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
printf '{"status":"ready","checkedAt":"%s","os":"ubuntu-24.04","architecture":"x86_64","cpu":%s,"memoryKiB":%s,"availableDiskKiB":%s,"node":"%s","docker":"%s","compose":"%s"}\n' \
  "$checked_at" "$cpu_count" "$memory_kib" "$available_kib" "$node_version" "$docker_server" "$compose_version"
