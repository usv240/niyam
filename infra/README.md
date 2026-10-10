# Deploying Niyam on the neatHack AWS allowance

Everything (website, API, watcher) runs on **one t3.small** with HTTPS, within the event rules: us-east-1 only, the supplied **Hackathon_VPC** only (never create a VPC), one EC2 instance, at most 50 GB of storage, $25 total. Expected cost: about $0.02 per hour, about $4 to keep it running until judging ends on 16 October.

## Steps (about 15 minutes, all in the browser)

1. Sign in to the AWS console with your neatHack login. Check the region at the top right says **N. Virginia (us-east-1)**.
2. **EC2, Launch instance**:
   - Name: `niyam`
   - Image: **Ubuntu Server 24.04 LTS**
   - Instance type: **t3.small**
   - Key pair: "Proceed without a key pair" (you will connect from the browser)
   - Network settings, Edit: VPC **Hackathon_VPC**, a public subnet, **Auto-assign public IP: Enable**. Create a security group allowing **SSH (22) from My IP**, **HTTP (80) from Anywhere**, **HTTPS (443) from Anywhere**.
   - Storage: **20 GB gp3**
   - Advanced details, **User data**: paste the whole of `infra/bootstrap.sh`.
   - Launch.
3. Wait about 8 minutes (it installs everything). Then select the instance, **Connect, EC2 Instance Connect, Connect**.
4. In that browser terminal, run `sudo tail -1 /var/log/niyam-bootstrap.log`. When it says `bootstrap finished`, run **`sudo niyam-setup`**. Type your Anthropic key and neatlogs key when asked (the input is hidden; nothing is stored anywhere except `/etc/niyam/env` on the instance, readable only by its owner).
5. It prints your address, `https://<ip-with-dashes>.sslip.io`. Open it. That is your live site and API.
6. After judging (16 October): **Instance state, Stop** (or Terminate) so the allowance is not used up.

If the public IP changes (after a stop and start), run `sudo niyam-setup` again.

## Optional: let the server open pull requests

`sudo -iu ubuntu gh auth login` (follow the device-code prompts), then change `NIYAM_PUBLISH_MODE=local` to `github` in `/etc/niyam/env` and `sudo systemctl restart niyam-api`. Without this, the server's agent runs commit to local branches only, which is the safe default for a public demo.

## Useful commands on the instance

```bash
systemctl status niyam-api caddy          # are they running?
journalctl -u niyam-api -n 50             # API logs
systemctl list-timers niyam-watch.timer   # when the watcher runs next
sudo -iu ubuntu bash -c "cd ~/niyam && git pull && cd web && NEXT_PUBLIC_API_BASE=same-origin npx next build" && sudo systemctl restart niyam-api
```

## Alternative: website only, no server

GitHub Pages (`.github/workflows/pages.yml`, run it manually) or Vercel (root directory `web`). The site works fully from build-time data; live upload, keys and status need the API.
