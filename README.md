# alvin.id

Personal website of Alvin Abyan — [alvin.id](https://alvin.id)

## Auto-deployment

Every push to `main` automatically deploys to the live site via a GitHub webhook + PHP script. No FTP or SSH required.

**How it works:**
1. Push to `main` → GitHub fires a POST webhook to `https://alvin.id/deploy.php`
2. `deploy.php` verifies the request signature (HMAC-SHA256)
3. Downloads the latest code from GitHub as a ZIP
4. Extracts and copies files to `public_html/`

```bash
# deploy = just push
git push origin main
```

## deploy.php

The webhook handler lives at `public_html/deploy.php` on the server.

> **Important:** `deploy.php` is intentionally excluded from auto-deployment (it won't overwrite itself). If you modify it locally, you must manually update it on the server via cPanel File Manager.

**Path on server:** `/home/wyihuuag/public_html/deploy.php`

**To update manually:**
1. Go to cPanel → File Manager → `public_html/`
2. Right-click `deploy.php` → Edit
3. Paste the updated content → Save Changes

**Files never auto-deployed:**
- `deploy.php`
- `.github/`
- `.gitignore`
- `.DS_Store`
