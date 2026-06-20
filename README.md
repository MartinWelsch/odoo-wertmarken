# odoo-compose

A single-command **Odoo 17 + PostgreSQL 15** stack (Docker Compose) that includes a
custom Point of Sale add-on and an Apache reverse-proxy template for serving it on
a subdomain.

## What's in here

```
odoo-compose/
├── docker-compose.yml          # Odoo 17 (web) + Postgres 15 (db)
├── config/odoo.conf            # Odoo config (DB creds, proxy_mode, addons path)
├── addons/
│   └── pos_food_tickets/       # custom POS module (see its own README)
├── deploy/
│   └── pos.example.com.conf    # Apache reverse-proxy vhost template
└── README.md
```

- **`web`** — `odoo:17.0`, published on `127.0.0.1:8069` (web) and `127.0.0.1:8072`
  (websocket/longpolling). Bound to localhost so it's only reachable via the reverse
  proxy. Mounts `config/` at `/etc/odoo` and `addons/` at `/mnt/extra-addons`.
- **`db`** — `postgres:15` with a healthcheck; Odoo waits for it before starting.
- Data persists in named volumes `odoo-web-data` and `odoo-db-data`.

## Quick start

```bash
docker compose up -d
```

Open **http://localhost:8069** and create your first database. Custom modules in
`addons/` appear under Apps (enable Developer Mode → Apps → Update Apps List).

> Change the default passwords (`odoo` in `docker-compose.yml`) and the
> `admin_passwd` in `config/odoo.conf` before any real use.

## Custom module: `pos_food_tickets`

Extends the POS receipt so it prints one redeemable **Wertmarke** (token) page per
individual item bought — a food-token workflow. See
[`addons/pos_food_tickets/README.md`](addons/pos_food_tickets/README.md) for details.

## Serve it on a subdomain (Apache reverse proxy)

`config/odoo.conf` already sets `proxy_mode = True`. Point a subdomain's DNS at the
server, then use the template in [`deploy/pos.example.com.conf`](deploy/pos.example.com.conf):

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel headers rewrite
sudo cp deploy/pos.example.com.conf /etc/apache2/sites-available/
# edit ServerName, then:
sudo a2ensite pos.example.com && sudo systemctl reload apache2
sudo certbot --apache -d your.subdomain.com   # optional but recommended (HTTPS)
```

The template proxies HTTP **and** the Odoo WebSocket (bus / POS live-sync) — the
latter is required or POS sync silently fails.

## Dev workflow note

After editing files inside an add-on, the running server won't pick them up on its
own:

1. `docker compose restart web` — the server caches the add-on's asset file list at
   startup, so new/removed files need a restart.
2. **Clear the POS service worker** in the browser (F12 → Application → Service
   Workers → Unregister, then Clear site data) — the POS aggressively caches its
   JS bundle (`odoo-sw-cache`).

Skipping either makes code changes appear to "do nothing".
