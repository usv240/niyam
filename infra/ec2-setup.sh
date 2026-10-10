#!/usr/bin/env bash
# One-time setup on the single allowed EC2 instance (Ubuntu 24.04, t3.small,
# us-east-1, launched into the supplied Hackathon_VPC). Run as the ubuntu user.
# Secrets are never in this script: create /etc/niyam/env by hand (see below).
set -euo pipefail

sudo apt-get update -y
sudo apt-get install -y git python3.12 python3.12-venv curl debian-keyring debian-archive-keyring apt-transport-https
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Node (for Claude Code, the encoder) and Claude Code itself
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g @anthropic-ai/claude-code
# Entire CLI (captures the encoder's sessions as checkpoints)
curl -fsSL https://entire.io/install.sh | bash

cd ~
git clone https://github.com/usv240/niyam.git
git clone https://github.com/usv240/niyam-rulebook.git
cd niyam/agent && uv venv && uv pip install -e . && cd ~

# GitHub CLI for opening pull requests (log in once with: gh auth login)
sudo apt-get install -y gh

sudo mkdir -p /etc/niyam
sudo touch /etc/niyam/env && sudo chmod 600 /etc/niyam/env && sudo chown ubuntu /etc/niyam/env
echo "Now edit /etc/niyam/env with: ANTHROPIC_API_KEY, NEATLOGS_API_KEY, NIYAM_KEY_SECRET, NIYAM_RULEBOOK_PATH=/home/ubuntu/niyam-rulebook"
echo "Then: sudo cp ~/niyam/infra/*.service ~/niyam/infra/*.timer /etc/systemd/system/ && sudo systemctl daemon-reload"
echo "      sudo systemctl enable --now niyam-api niyam-watch.timer"
