#!/bin/sh
set -eu

if [ "$#" -ne 5 ]; then
  printf '%s\n' 'remote_promotion_arguments_invalid' >&2
  exit 64
fi

archive_path=$1
request_path=$2
release_root=$3
revision=$4
archive_sha256=$5

case "$archive_path:$request_path:$release_root" in
  /*:/*:/*) ;;
  *) printf '%s\n' 'remote_promotion_path_not_absolute' >&2; exit 64 ;;
esac
case "$revision" in
  *[!0-9a-f]*|'') printf '%s\n' 'remote_promotion_revision_invalid' >&2; exit 64 ;;
esac
[ "${#revision}" -eq 40 ] || { printf '%s\n' 'remote_promotion_revision_invalid' >&2; exit 64; }
case "$archive_sha256" in
  *[!0-9a-f]*|'') printf '%s\n' 'remote_promotion_archive_digest_invalid' >&2; exit 64 ;;
esac
[ "${#archive_sha256}" -eq 64 ] || { printf '%s\n' 'remote_promotion_archive_digest_invalid' >&2; exit 64; }

printf '%s  %s\n' "$archive_sha256" "$archive_path" | sha256sum --check --status -

control_root="$release_root/control"
target="$control_root/$revision"
marker="$target/.archive-sha256"
install -d -m 0700 "$control_root"

if [ -d "$target" ]; then
  [ -f "$marker" ] && [ "$(cat "$marker")" = "$archive_sha256" ] || {
    printf '%s\n' 'remote_promotion_existing_control_mismatch' >&2
    exit 65
  }
else
  temporary="$control_root/.${revision}.$$"
  trap 'rm -rf -- "$temporary"' EXIT HUP INT TERM
  install -d -m 0700 "$temporary"
  tar --no-same-owner --no-same-permissions -xzf "$archive_path" -C "$temporary"
  [ -f "$temporary/tools/deployment/promotion-request.mjs" ] || {
    printf '%s\n' 'remote_promotion_control_incomplete' >&2
    exit 65
  }
  printf '%s\n' "$archive_sha256" > "$temporary/.archive-sha256"
  chmod 0600 "$temporary/.archive-sha256"
  mv "$temporary" "$target"
  trap - EXIT HUP INT TERM
fi

exec node "$target/tools/deployment/promotion-request.mjs" run --request "$request_path"
