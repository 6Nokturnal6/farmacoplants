
- Privileged admin ops live in src/lib/admin-ops.server.ts; without SUPABASE_SERVICE_ROLE_KEY they relay to Lovable Cloud via /api/public/admin-ops (ADMIN_RELAY_URL overrides). Why: self-hosted installs hold no secret key.
