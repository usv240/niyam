#!/usr/bin/env bash
# Niyam on one EC2 instance: website + API + watcher, HTTPS via Caddy and sslip.io.
#
# Paste this whole file into "User data" when launching the instance
# (Ubuntu 24.04, t3.small, us-east-1, Hackathon_VPC, 20 GB gp3,
#  security group: 22 from your IP, 80 and 443 from anywhere).
# It contains no secrets. After boot, connect with EC2 Instance Connect and run:
#     sudo niyam-setup
# which asks for your keys (hidden input) and starts everything.
set -euxo pipefail
exec > /var/log/niyam-bootstrap.log 2>&1

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git python3.12 python3.12-venv curl gnupg debian-keyring debian-archive-keyring apt-transport-https gh

# 2 GB swap so the website build fits in a t3.small's memory
if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi

# Node 22 (website build, Claude Code)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g @anthropic-ai/claude-code

# Caddy (HTTPS with automatic certificates)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y && apt-get install -y caddy

# Code, as the ubuntu user
sudo -iu ubuntu bash <<'EOS'
set -eux
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://entire.io/install.sh | bash || true
cd ~
[ -d niyam ] || git clone https://github.com/usv240/niyam.git
[ -d niyam-rulebook ] || git clone https://github.com/usv240/niyam-rulebook.git
cd niyam/agent && ~/.local/bin/uv venv && ~/.local/bin/uv pip install -e .
cd ~/niyam/web && npm ci
EOS

# The interactive second half
cat > /usr/local/bin/niyam-setup <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
IP=$(curl -s http://checkip.amazonaws.com || curl -s https://api.ipify.org)
HOST="${IP//./-}.sslip.io"
echo "Niyam will be served at https://$HOST"
read -rsp "Anthropic API key (hidden): " AK; echo
read -rsp "neatlogs API key (hidden, Enter to skip): " NK; echo
install -d -m 755 /etc/niyam
umask 077
cat > /etc/niyam/env <<EOF
ANTHROPIC_API_KEY=$AK
NEATLOGS_API_KEY=$NK
NEATLOGS_ENDPOINT=https://ingest.neatlogs.com
ANTHROPIC_MODEL=${NIYAM_MODEL:-claude-sonnet-5-5}
ANTHROPIC_MODEL_ENCODE=${NIYAM_MODEL_ENCODE:-claude-sonnet-5-5}
ANTHROPIC_MODEL_FAST=claude-haiku-5-5
ANTHROPIC_MODEL_VERIFY=claude-sonnet-5-5
NIYAM_RULEBOOK_PATH=/home/ubuntu/niyam-rulebook
NIYAM_PUBLISH_MODE=local
NIYAM_KEY_SECRET=$(head -c 32 /dev/urandom | base64)
EOF
chown ubuntu /etc/niyam/env

# Build the website for this address (API on the same origin)
sudo -iu ubuntu bash -c "cd ~/niyam/web && NEXT_PUBLIC_API_BASE=same-origin NEXT_PUBLIC_SITE_URL=https://$HOST npx next build"

cat > /etc/caddy/Caddyfile <<EOF
$HOST {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:8000 {
			flush_interval -1
		}
	}
	handle {
		root * /home/ubuntu/niyam/web/out
		try_files {path} {path}/index.html {path}.html
		file_server
	}
}
EOF
chmod o+x /home/ubuntu /home/ubuntu/niyam /home/ubuntu/niyam/web
cp /home/ubuntu/niyam/infra/niyam-api.service /home/ubuntu/niyam/infra/niyam-watch.service /home/ubuntu/niyam/infra/niyam-watch.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now niyam-api niyam-watch.timer
systemctl restart caddy
echo
echo "Done. Open https://$HOST (the certificate can take a minute on first visit)."
echo "Optional, to let the agent open pull requests: sudo -iu ubuntu gh auth login, then set NIYAM_PUBLISH_MODE=github in /etc/niyam/env and: sudo systemctl restart niyam-api"
EOS
chmod +x /usr/local/bin/niyam-setup
echo "bootstrap finished"
