# Deploying Niyam

Within the neatHack AWS rules: us-east-1 only, the supplied Hackathon_VPC only (never create a VPC), one EC2 instance (t3.small), at most 50 GB of storage, $25 total.

## API and watcher (AWS EC2)

1. Launch one t3.small, Ubuntu 24.04, 20 GB gp3, in Hackathon_VPC, us-east-1. Security group: SSH (22) from your IP only, HTTP (80) and HTTPS (443) from anywhere.
2. SSH in and run `bash infra/ec2-setup.sh` (clone the repo first, or paste the script).
3. Fill `/etc/niyam/env` (mode 600). Never commit it.
4. `gh auth login` so the agent can open pull requests in the rulebook.
5. Enable the services: `sudo systemctl enable --now niyam-api niyam-watch.timer`.
6. HTTPS: install Caddy and use `infra/Caddyfile` with your DNS name. Without a domain, the website can still be used fully; only live features (BYOD, keys, live status) need the API.
7. Cost: about $0.02 per hour. Stop the instance after judging (16 October).

## Website (Vercel, free)

1. Import `usv240/niyam` on vercel.com, set the root directory to `web`.
2. Environment variable `NEXT_PUBLIC_API_BASE` = your API URL (for example `https://niyam-api.example.org`). Optional: without it the site works from build-time data.
3. Build command `next build`, output directory `out`.

## Refresh the website's data

```bash
python scripts/export_site_data.py --job <showcase job id>
cd web && npx next build
```
