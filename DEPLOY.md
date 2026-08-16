# Self-hosting on farmacoplants.unilurio.ac.mz

This app is packaged as a Docker image running a Node.js server (TanStack Start
built with nitro's `node-server` preset). It listens on port `3000` inside the
container.

## 1. Prerequisites on the server

- Docker 24+ and Docker Compose v2 (`docker compose ...`)
- A reverse proxy in front of port 3000 to terminate TLS for
  `https://farmacoplants.unilurio.ac.mz` — examples below for Nginx and Caddy.

## 2. Get the code onto the server

```bash
git clone https://github.com/<your-user>/<your-repo>.git farmacoplants
cd farmacoplants
cp .env.example .env
# edit .env with real Supabase keys (service role is server-only, keep it secret)
```

## 3. Build and run

```bash
docker compose up -d --build
docker compose logs -f app
```

The container exposes `http://127.0.0.1:3000`. Verify locally:

```bash
curl -I http://127.0.0.1:3000
```

## 4. Put it behind your domain

### Option A — Caddy (auto HTTPS)

`/etc/caddy/Caddyfile`:

```
farmacoplants.unilurio.ac.mz {
    reverse_proxy 127.0.0.1:3000
}
```

`sudo systemctl reload caddy` — done. Caddy handles Let's Encrypt automatically.

### Option B — Nginx + certbot

`/etc/nginx/sites-available/farmacoplants.conf`:

```nginx
server {
    listen 80;
    server_name farmacoplants.unilurio.ac.mz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/farmacoplants.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d farmacoplants.unilurio.ac.mz
```

## 5. Configure production auth URLs

In the backend auth settings, set the **Site URL** to:

`https://farmacoplants.unilurio.ac.mz`

Allow these exact redirect URLs:

- `https://farmacoplants.unilurio.ac.mz`
- `https://farmacoplants.unilurio.ac.mz/reset-password`

The app also sets `VITE_PUBLIC_SITE_URL` at build time. Both settings are
required: if the redirect is not allow-listed, the auth service falls back to
its Site URL (an old `http://localhost:3000` value causes recovery links to
return to localhost).

After changing `.env` or auth URL settings, rebuild the image and request a
fresh recovery email. Previously issued one-time links may already be expired
or consumed.

## 6. Updating after a code change

```bash
git pull
docker compose up -d --build
```

## 7. Uptime monitoring (Uptime Kuma)

The compose file ships an **Uptime Kuma** container bound to
`127.0.0.1:3001`. Expose it on a subdomain via your reverse proxy, then
configure a monitor pointing at the app's `/api/public/health` endpoint.

### Reverse proxy (with HTTP basic auth)

Port `3001` stays bound to `127.0.0.1` — the dashboard is only reachable
through the reverse proxy, which enforces a shared basic-auth gate in front
of Kuma's own login. Two independent credentials to compromise, and
unauthenticated scanners never reach Kuma at all.

**1. Generate a bcrypt hash for the basic-auth password:**

```bash
# Caddy (run inside the caddy container/binary):
caddy hash-password
# paste the password twice; copy the $2a$14$... hash it prints

# Nginx alternative — writes /etc/nginx/.htpasswd_status:
sudo htpasswd -B -c /etc/nginx/.htpasswd_status status_admin
```

Pick a strong password (a password manager or `openssl rand -base64 24`).
Do NOT reuse the Kuma admin password.

**2. Caddy:**

```
status.farmacoplants.unilurio.ac.mz {
    basic_auth {
        # username followed by the bcrypt hash from `caddy hash-password`
        status_admin $2a$14$REPLACE_WITH_HASH_FROM_caddy_hash-password
    }
    reverse_proxy 127.0.0.1:3001
}
```

Reload with `sudo systemctl reload caddy`. Caddy's `reverse_proxy` upgrades
WebSockets automatically, so Kuma's live heartbeat UI keeps working through
the basic-auth gate.

**3. Nginx** (add a second server block, then run certbot for the subdomain):

```nginx
server {
    listen 80;
    server_name status.farmacoplants.unilurio.ac.mz;

    location / {
        auth_basic           "farmacoPlants status";
        auth_basic_user_file /etc/nginx/.htpasswd_status;

        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Point a DNS `A` record for `status.farmacoplants.unilurio.ac.mz` at the
server before reloading the proxy so TLS issuance (and the basic-auth
prompt over HTTPS) works.

> If you later publish a Kuma **Status Page** for public consumption, move
> it to a separate subdomain (e.g. `uptime.farmacoplants.unilurio.ac.mz`)
> without the `basic_auth` block — basic auth on `status.*` would block
> anonymous viewers of the status page too.

### First-run setup

1. Open `https://status.farmacoplants.unilurio.ac.mz` and create the admin
   account (first visitor becomes admin — do this immediately after DNS +
   TLS are live).
2. Add a new monitor:
   - **Monitor Type:** `HTTP(s) - Keyword`
   - **Friendly Name:** `farmacoPlants API health`
   - **URL:** `https://farmacoplants.unilurio.ac.mz/api/public/health`
   - **Heartbeat Interval:** `60` seconds
   - **Retries:** `2` (avoid alerting on a single blip)
   - **Keyword:** `"status":"ok"` (fails when the health route reports
     `degraded`, even if it still returns 200 through a cache)
   - **Accepted Status Codes:** `200-299`
3. Under **Notifications**, wire up at least one channel (email / Slack /
   Telegram / Discord) so outages actually reach a human.
4. Optional: create a public **Status Page** exposing this monitor so team
   members can check availability without logging in.

Data is persisted in the `uptime-kuma-data` named volume — back it up
alongside the rest of your Docker volumes.

## Troubleshooting

- **`Missing Supabase environment variable(s)`** — `.env` not loaded or a
  variable is empty. Compose reads `.env` from the same directory as
  `docker-compose.yml`.
- **Browser shows a blank page** — `VITE_*` vars must be set at *build* time
  (they are inlined into the JS bundle). Rebuild with
  `docker compose up -d --build` after changing them.
- **502 from Nginx/Caddy** — the container is not listening. Check
  `docker compose logs app`.

## 8. One-command CLI install (`linux-magic-cli`)

`linux-magic-cli` is a small POSIX shell helper for managing this deployment
(health checks, env validation, start/stop/update). Install it on any common
Linux distro (Debian/Ubuntu, Fedora/RHEL, Arch, openSUSE, Alpine):

```bash
curl -fsSL https://raw.githubusercontent.com/6Nokturnal6/farmacoplants/main/scripts/install.sh | sh
```

From a checkout of this repo you can also run `./scripts/install.sh` directly —
it installs the local `cli/linux-magic-cli` instead of downloading.

Installer options:

- `--prefix DIR` — install into `DIR/bin` (default `/usr/local`, or `~/.local`
  when running without root)
- `--uninstall` — remove the installed copy
- `--version` — print the installer version

### Usage

```bash
linux-magic-cli env       # verify required .env variables
linux-magic-cli up        # docker compose up -d --build
linux-magic-cli health    # GET /api/public/health and assert "status":"ok"
linux-magic-cli status    # container status
linux-magic-cli logs app  # follow logs
linux-magic-cli update    # git pull, then rebuild and restart
linux-magic-cli down      # stop the stack
```

Override defaults with environment variables:

```bash
FARMACOPLANTS_DIR=/srv/farmacoplants \
FARMACOPLANTS_URL=https://farmacoplants.unilurio.ac.mz \
  linux-magic-cli health
```
