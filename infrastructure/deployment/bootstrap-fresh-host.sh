#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 65
}

[ "$#" -eq 3 ] || fail bootstrap_arguments_invalid
[ "$1" = confirm-fresh-starward-host ] || fail bootstrap_fresh_host_confirmation_required
environment=$2
ssh_port=$3

case "$environment" in
  staging|production) ;;
  *) fail bootstrap_environment_invalid ;;
esac
case "$ssh_port" in
  ''|*[!0-9]*) fail bootstrap_ssh_port_invalid ;;
esac
[ "$ssh_port" -ge 1 ] && [ "$ssh_port" -le 65535 ] || fail bootstrap_ssh_port_invalid
[ "$(id -u)" -eq 0 ] || fail bootstrap_root_required

[ -r /etc/os-release ] || fail bootstrap_os_release_missing
. /etc/os-release
[ "${ID:-}" = ubuntu ] || fail bootstrap_os_not_ubuntu
[ "${VERSION_ID:-}" = 24.04 ] || fail bootstrap_ubuntu_version_unsupported
[ "$(uname -m)" = x86_64 ] || fail bootstrap_architecture_unsupported

for existing in docker docker.io docker-ce docker-ce-cli containerd containerd.io podman-docker; do
  if dpkg-query -W -f='${Status}' "$existing" 2>/dev/null | grep -q 'install ok installed'; then
    fail "bootstrap_existing_container_runtime:$existing"
  fi
done
command -v node >/dev/null 2>&1 && fail bootstrap_existing_node_runtime

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg ufw xz-utils

install -m 0755 -d /etc/apt/keyrings
curl -fsSL --retry 3 --retry-all-errors --retry-delay 2 \
  https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
docker_key_fingerprint=$(gpg --batch --show-keys --with-colons /etc/apt/keyrings/docker.asc \
  | awk -F: '$1 == "fpr" { print $10; exit }')
[ "$docker_key_fingerprint" = 9DC858229FC7DD38854AE2D88D81803C0EBFCD88 ] \
  || fail bootstrap_docker_signing_key_fingerprint_mismatch
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y --no-install-recommends \
  containerd.io docker-buildx-plugin docker-ce docker-ce-cli docker-compose-plugin
systemctl enable --now docker

node_version=24.19.0
node_archive="node-v${node_version}-linux-x64.tar.xz"
node_sha256=14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647
temporary=$(mktemp -d /tmp/starward-bootstrap.XXXXXXXXXXXX)
case "$temporary" in
  /tmp/starward-bootstrap.*) ;;
  *) fail bootstrap_temporary_path_invalid ;;
esac
trap 'rm -rf -- "$temporary"' EXIT HUP INT TERM
curl -fsSL --retry 3 --retry-all-errors --retry-delay 2 \
  -o "$temporary/$node_archive" "https://nodejs.org/dist/v${node_version}/$node_archive"
printf '%s  %s\n' "$node_sha256" "$temporary/$node_archive" | sha256sum --check --status - \
  || fail bootstrap_node_archive_digest_mismatch
tar -xJf "$temporary/$node_archive" -C /opt
[ -x "/opt/node-v${node_version}-linux-x64/bin/node" ] || fail bootstrap_node_install_incomplete
for binary in node npm npx corepack; do
  ln -s "/opt/node-v${node_version}-linux-x64/bin/$binary" "/usr/local/bin/$binary"
done

deploy_user=starward-deploy
id "$deploy_user" >/dev/null 2>&1 && fail bootstrap_deploy_user_exists
useradd --create-home --shell /bin/bash "$deploy_user"
usermod -aG docker "$deploy_user"

state_root="/var/lib/starward/$environment"
config_root="/etc/starward/$environment"
for directory in inbox releases candidates backups receipts; do
  install -d -m 0700 -o "$deploy_user" -g "$deploy_user" "$state_root/$directory"
done
install -d -m 0750 -o root -g "$deploy_user" "$config_root"

ufw default deny incoming
ufw default allow outgoing
ufw allow "$ssh_port/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

docker_version=$(docker version --format '{{.Server.Version}}')
compose_version=$(docker compose version --short)
installed_node=$(node -p 'process.versions.node')
printf '{"status":"provisioned","environment":"%s","deployUser":"%s","node":"%s","docker":"%s","compose":"%s","stateRoot":"%s","configRoot":"%s"}\n' \
  "$environment" "$deploy_user" "$installed_node" "$docker_version" "$compose_version" "$state_root" "$config_root"
