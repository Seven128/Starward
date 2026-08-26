#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 65
}

[ "$#" -eq 3 ] || fail ssh_hardening_arguments_invalid
[ "$1" = confirm-starward-ssh-hardening ] || fail ssh_hardening_confirmation_required
deploy_user=$2
ssh_port=$3

[ "$deploy_user" = starward-deploy ] || fail ssh_hardening_deploy_user_invalid
case "$ssh_port" in
  ''|*[!0-9]*) fail ssh_hardening_ssh_port_invalid ;;
esac
[ "$ssh_port" -ge 1 ] && [ "$ssh_port" -le 65535 ] \
  || fail ssh_hardening_ssh_port_invalid
[ "$(id -u)" -eq 0 ] || fail ssh_hardening_root_required

getent passwd "$deploy_user" >/dev/null 2>&1 || fail ssh_hardening_deploy_user_missing
deploy_home=$(getent passwd "$deploy_user" | awk -F: 'NR == 1 { print $6 }')
[ "$deploy_home" = "/home/$deploy_user" ] || fail ssh_hardening_deploy_home_invalid

ssh_directory="$deploy_home/.ssh"
authorized_keys="$ssh_directory/authorized_keys"
[ -d "$ssh_directory" ] && [ ! -L "$ssh_directory" ] \
  || fail ssh_hardening_ssh_directory_invalid
[ -f "$authorized_keys" ] && [ ! -L "$authorized_keys" ] && [ -s "$authorized_keys" ] \
  || fail ssh_hardening_authorized_keys_invalid
[ "$(stat -c '%U:%G' "$ssh_directory")" = "$deploy_user:$deploy_user" ] \
  || fail ssh_hardening_ssh_directory_owner_invalid
[ "$(stat -c '%a' "$ssh_directory")" = 700 ] \
  || fail ssh_hardening_ssh_directory_mode_invalid
[ "$(stat -c '%U:%G' "$authorized_keys")" = "$deploy_user:$deploy_user" ] \
  || fail ssh_hardening_authorized_keys_owner_invalid
[ "$(stat -c '%a' "$authorized_keys")" = 600 ] \
  || fail ssh_hardening_authorized_keys_mode_invalid
ssh-keygen -l -f "$authorized_keys" >/dev/null 2>&1 \
  || fail ssh_hardening_authorized_keys_unreadable

sshd_binary=$(command -v sshd || true)
[ -n "$sshd_binary" ] || fail ssh_hardening_sshd_missing
[ -d /etc/ssh/sshd_config.d ] && [ ! -L /etc/ssh/sshd_config.d ] \
  || fail ssh_hardening_config_directory_invalid
systemctl is-active --quiet ssh.service || fail ssh_hardening_service_inactive

config_path=/etc/ssh/sshd_config.d/00-starward-hardening.conf
[ ! -L "$config_path" ] || fail ssh_hardening_config_symlink_forbidden
temporary=$(mktemp /etc/ssh/sshd_config.d/.00-starward-hardening.XXXXXXXXXXXX)
backup=$(mktemp /etc/ssh/sshd_config.d/.00-starward-hardening-backup.XXXXXXXXXXXX)
had_existing=0
if [ -e "$config_path" ]; then
  cp --preserve=mode,ownership,timestamps -- "$config_path" "$backup"
  had_existing=1
fi

cleanup() {
  rm -f -- "$temporary" "$backup"
}
trap cleanup EXIT HUP INT TERM

rollback_config() {
  if [ "$had_existing" -eq 1 ]; then
    install -m 0644 -o root -g root "$backup" "$config_path"
  else
    rm -f -- "$config_path"
  fi
}

cat > "$temporary" <<EOF
# Managed by infrastructure/deployment/harden-ssh-after-key.sh.
Port $ssh_port
PubkeyAuthentication yes
AuthenticationMethods publickey
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
chmod 0644 "$temporary"
chown root:root "$temporary"
install -m 0644 -o root -g root "$temporary" "$config_path"

if ! "$sshd_binary" -t; then
  rollback_config
  "$sshd_binary" -t || true
  fail ssh_hardening_syntax_validation_failed
fi

effective=$(
  "$sshd_binary" -T \
    -C "user=$deploy_user,host=localhost,addr=127.0.0.1"
)
for expected in \
  "port $ssh_port" \
  "pubkeyauthentication yes" \
  "authenticationmethods publickey" \
  "passwordauthentication no" \
  "kbdinteractiveauthentication no" \
  "permitrootlogin no"
do
  if ! printf '%s\n' "$effective" | grep -Fqx "$expected"; then
    rollback_config
    "$sshd_binary" -t || true
    fail "ssh_hardening_effective_policy_mismatch:$expected"
  fi
done
root_effective=$(
  "$sshd_binary" -T \
    -C "user=root,host=localhost,addr=127.0.0.1"
)
if ! printf '%s\n' "$root_effective" | grep -Fqx "permitrootlogin no"; then
  rollback_config
  "$sshd_binary" -t || true
  fail ssh_hardening_root_effective_policy_mismatch
fi

if ! systemctl reload ssh.service; then
  rollback_config
  "$sshd_binary" -t || true
  systemctl reload ssh.service || true
  fail ssh_hardening_reload_failed
fi
if ! systemctl is-active --quiet ssh.service; then
  rollback_config
  "$sshd_binary" -t || true
  systemctl restart ssh.service || true
  fail ssh_hardening_service_not_active
fi

printf '{"status":"ssh-hardened","deployUser":"%s","port":%s,"config":"%s"}\n' \
  "$deploy_user" "$ssh_port" "$config_path"
