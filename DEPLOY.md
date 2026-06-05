# Self-hosting on lqsa.unilurio.ac.mz

This app is packaged as a Docker image running a Node.js server (TanStack Start
built with nitro's `node-server` preset). It listens on port `3000` inside the
container.

## 1. Prerequisites on the server

- Docker 24+ and Docker Compose v2 (`docker compose ...`)
- A reverse proxy in front of port 3000 to terminate TLS for
  `https://lqsa.unilurio.ac.mz` — examples below for Nginx and Caddy.

## 2. Get the code onto the server

```bash
git clone https://github.com/<your-user>/<your-repo>.git lqsa
cd lqsa
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
lqsa.unilurio.ac.mz {
    reverse_proxy 127.0.0.1:3000
}
```

`sudo systemctl reload caddy` — done. Caddy handles Let's Encrypt automatically.

### Option B — Nginx + certbot

`/etc/nginx/sites-available/lqsa.conf`:

```nginx
server {
    listen 80;
    server_name lqsa.unilurio.ac.mz;

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
sudo ln -s /etc/nginx/sites-available/lqsa.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lqsa.unilurio.ac.mz
```

## 5. Update Supabase auth URLs

In the Supabase dashboard → Authentication → URL Configuration, add
`https://lqsa.unilurio.ac.mz` to **Site URL** and **Redirect URLs**.
Otherwise Google / email-confirmation links will fail.

## 6. Updating after a code change

```bash
git pull
docker compose up -d --build
```

## Troubleshooting

- **`Missing Supabase environment variable(s)`** — `.env` not loaded or a
  variable is empty. Compose reads `.env` from the same directory as
  `docker-compose.yml`.
- **Browser shows a blank page** — `VITE_*` vars must be set at *build* time
  (they are inlined into the JS bundle). Rebuild with
  `docker compose up -d --build` after changing them.
- **502 from Nginx/Caddy** — the container is not listening. Check
  `docker compose logs app`.
